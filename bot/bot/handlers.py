"""
Обработчики Telegram бота
"""
import logging
import base64
import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List, Tuple
from zoneinfo import ZoneInfo
import asyncio

from aiogram import Router, F
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.enums import ParseMode
from aiogram.utils.chat_action import ChatActionSender

from services.backend_api import BackendAPI
from services.sms import SMSService
from services.phone_utils import validate_phone_format, normalize_phone_display
from services.deepgram_service import DeepgramService
from services.image_utils import ImageUtils
from ai.business_agent import generate_reply
from business_types import get_business_type
from config import settings
from localization import get_text, LocalizationManager

logger = logging.getLogger(__name__)

# Таймзона Ташкента (UTC+5)
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")

# Состояния для FSM
class RegistrationStates(StatesGroup):
    waiting_for_language = State()
    waiting_for_phone = State()
    waiting_for_sms_code = State()
    waiting_for_name = State()

class ChatStates(StatesGroup):
    chatting = State()

class SettingsStates(StatesGroup):
    in_settings = State()
    changing_language = State()

# Роутер для обработчиков
router = Router()

# Сервисы
db_service = BackendAPI()
sms_service = SMSService()
deepgram_service = DeepgramService()

# Отложенные задачи ответа AI по пользователям
pending_ai_tasks: Dict[int, asyncio.Task] = {}

# История диалога по пользователям: список dict {'role': 'user'|'assistant', 'content': Any}
conversation_history: Dict[int, List[Dict[str, Any]]] = {}

# Буфер последнего сообщения пользователя (не закоммиченного в историю до ответа)
pending_user_text: Dict[int, str] = {}

# Счётчики и маппинг для нумерации фото
photo_counters: Dict[int, int] = {}
photo_message_index: Dict[Tuple[int, int], int] = {}

# Буфер изображений пользователя за окно дебаунса (для отправки нескольких фото сразу)
pending_user_images: Dict[int, List[Dict[str, Any]]] = {}


def _reset_photo_indices_and_counters(chat_id: int, user_id: int):
    """Сбрасывает счётчик фото пользователя и удаляет индексы фото для чата."""
    try:
        photo_counters.pop(user_id, None)
        # Удаляем все записи индексов, относящиеся к данному чату
        keys_to_delete = [key for key in photo_message_index.keys() if key[0] == chat_id]
        for key in keys_to_delete:
            photo_message_index.pop(key, None)
    except Exception:
        pass

# Менеджер локализации
localization_manager = LocalizationManager()

async def _format_message_with_reply_annotation(message: Message) -> str:
    """Формирует текст пользователя с пометкой о reply, если оно есть.

    Для голосовых сообщений автоматически выполняется транскрибирование через Deepgram.

    Пример добавляемой метки: <reply on "текст сообщения на который сделан reply">
    Длина цитируемого текста ограничена, переносы строк схлопываются в пробелы.
    """
    base_text = message.text or (getattr(message, 'caption', None) or '')

    # Если текста нет, определяем тип медиа
    if not base_text:
        if message.sticker:
            base_text = message.sticker.emoji or '🙂'
        elif message.photo:
            # Отложим добавление индикатора фото, чтобы не потерять caption
            base_text = base_text
        elif message.voice:
            # Транскрибируем голосовое сообщение через Deepgram
            try:
                # Скачиваем файл голосового сообщения
                voice_file = await message.bot.download(message.voice.file_id)

                if voice_file:
                    # Читаем байты из BytesIO
                    audio_bytes = voice_file.read()

                    # Транскрибируем через Deepgram (Telegram voice = OGG/Opus)
                    transcription = await deepgram_service.transcribe_voice(
                        audio_data=audio_bytes,
                        mime_type="audio/ogg"
                    )

                    if transcription:
                        base_text = f'🎤 [voice message transcription: "{transcription}"]'
                    else:
                        logger.warning("Не удалось транскрибировать голосовое сообщение")
                        base_text = '🎤 [voice message - transcription failed]'
                else:
                    logger.warning("Не удалось скачать голосовое сообщение")
                    base_text = '🎤 [voice message - download failed]'

            except Exception as e:
                logger.error(f"Ошибка при обработке голосового сообщения: {e}")
                base_text = '🎤 [voice message - error]'

        elif message.video:
            base_text = '🎥 [video]'
        elif message.video_note:
            base_text = '🎬 [video message]'
        elif message.audio:
            base_text = '🎵 [audio]'
        elif message.animation:
            base_text = '🎞 [GIF]'
        elif message.document:
            base_text = '📄 [document]'
        elif message.location:
            base_text = '📍 [location]'
        elif message.contact:
            base_text = '👤 [contact]'
        elif message.poll:
            base_text = '📊 [poll]'
        elif message.dice:
            base_text = f'{message.dice.emoji} [dice]'
        elif message.venue:
            base_text = '📍 [venue]'

    # Проверяем quote (цитата части сообщения) или reply_to_message (ответ на всё сообщение)
    replied_text = None

    # Приоритет у quote - если есть цитата конкретной части
    if hasattr(message, 'quote') and message.quote:
        replied_text = message.quote.text
    elif message.reply_to_message:
        reply = message.reply_to_message
        replied_text = reply.text or (getattr(reply, 'caption', None) or '')

        # Если в reply нет текста, определяем тип медиа
        if not replied_text:
            if reply.sticker:
                replied_text = reply.sticker.emoji or '🙂'
            elif reply.photo:
                # Пробуем восстановить номер фото по исходному (chat_id, message_id)
                try:
                    chat_id = message.chat.id
                    idx = photo_message_index.get((chat_id, reply.message_id))
                    replied_text = f'[photo_{idx}]' if idx else '[photo]'
                except Exception:
                    replied_text = '[photo]'
            elif reply.voice:
                # Транскрибируем голосовое сообщение в reply тоже
                try:
                    voice_file = await message.bot.download(reply.voice.file_id)
                    if voice_file:
                        audio_bytes = voice_file.read()
                        transcription = await deepgram_service.transcribe_voice(
                            audio_data=audio_bytes,
                            mime_type="audio/ogg"
                        )
                        if transcription:
                            replied_text = f'voice: "{transcription}"'
                        else:
                            replied_text = '[voice message]'
                    else:
                        replied_text = '[voice message]'
                except Exception as e:
                    logger.error(f"Ошибка при обработке голосового reply: {e}")
                    replied_text = '[voice message]'
            elif reply.video:
                replied_text = '[video]'
            elif reply.video_note:
                replied_text = '[video message]'
            elif reply.audio:
                replied_text = '[audio]'
            elif reply.animation:
                replied_text = '[GIF]'
            elif reply.document:
                replied_text = '[document]'
            elif reply.location:
                replied_text = '[location]'
            elif reply.contact:
                replied_text = '[contact]'
            elif reply.poll:
                replied_text = '[poll]'
            elif reply.dice:
                replied_text = f'{reply.dice.emoji} [dice]'
            elif reply.venue:
                replied_text = '[venue]'

    if replied_text:
        # Схлопываем пробелы/переносы строк в один пробел
        replied_text_single_line = re.sub(r"\s+", " ", replied_text).strip()
        # Ограничиваем длину цитаты
        max_len = 200
        if len(replied_text_single_line) > max_len:
            replied_text_single_line = replied_text_single_line[: max_len - 1] + '…'
        annotated = f"<reply on \"{replied_text_single_line}\">\n"
        base_text = f"{annotated} {base_text}".strip()

    # Добавляем индикатор фото всегда, даже если есть caption/текст
    if message.photo:
        try:
            user_id = message.from_user.id
            chat_id = message.chat.id
            next_idx = photo_counters.get(user_id, 0) + 1
            photo_counters[user_id] = next_idx
            photo_message_index[(chat_id, message.message_id)] = next_idx
            indicator = f'📷 [photo_{next_idx}]'
        except Exception:
            indicator = '📷 [photo]'
        base_text = f"{base_text}\n{indicator}" if base_text else indicator

    return base_text

def get_language_keyboard() -> ReplyKeyboardMarkup:
    """Получить клавиатуру выбора языка"""
    keyboard = []
    languages = localization_manager.get_language_keyboard_data()
    for code, name in languages:
        keyboard.append([KeyboardButton(text=name)])

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        one_time_keyboard=True
    )

def get_compact_keyboard(lang: str = 'ru') -> ReplyKeyboardMarkup:
    """Получить компактную клавиатуру с эмодзи в одну линию"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(text=get_text('menu.complaint_emoji', lang)),
                KeyboardButton(text=get_text('menu.suggestion_emoji', lang)),
                KeyboardButton(text=get_text('menu.question_emoji', lang)),
                KeyboardButton(text=get_text('menu.settings_emoji', lang))
            ]
        ],
        resize_keyboard=True,
        persistent=True
    )
    return keyboard

def get_phone_keyboard(lang: str = 'ru') -> ReplyKeyboardMarkup:
    """Получить клавиатуру для отправки номера телефона"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=get_text('registration.phone_button', lang), request_contact=True)]
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    return keyboard

def get_settings_keyboard(lang: str = 'ru') -> ReplyKeyboardMarkup:
    """Получить клавиатуру настроек"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=get_text('settings.change_language', lang))],
            [KeyboardButton(text=get_text('settings.back', lang))]
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    return keyboard


def _cancel_pending_task(user_id: int):
    """Отменяет отложенную задачу ответа для пользователя, если есть"""
    task = pending_ai_tasks.get(user_id)
    if task and not task.done():
        task.cancel()


def _consume_task_exceptions(task: asyncio.Task):
    """Безопасно съедает исключения отменённых задач, чтобы избежать warning'ов"""
    try:
        _ = task.result()
    except BaseException:
        pass


async def _debounced_ai_reply(message: Message, state: FSMContext):
    """Ждёт 3 секунды тишины и отправляет ответ от AI. Отменяется новым сообщением."""
    try:
        await asyncio.sleep(3)

        user_id = message.from_user.id
        # Получаем пользователя с контекстом из API
        user_data = await db_service.get_user_with_context(user_id)

        if not user_data:
            await message.answer("Ошибка: пользователь не найден. Начните регистрацию /start")
            return

        # Распаковываем данные
        user_dict = user_data.get("user", {})
        context = user_data.get("context", {"booking_dates": [], "bookings_info": []})

        # Собираем историю: коммит будет только после успешного ответа
        history = conversation_history.get(user_id, [])
        # Не вызываем повторно форматирование, используем накопленный буфер текста
        last_user_text = pending_user_text.get(user_id, '')

        business_type = get_business_type(user_dict.get("business_type", "hotel"))
        user_info = {
            'user_id': user_dict.get("id"),
            'name': user_dict.get("name"),
            'surname': user_dict.get("surname"),
            'birthdate': user_dict.get("birthdate"),
            'telegram_id': user_id,
            'telegram_username': message.from_user.username,
            'telegram_first_name': message.from_user.first_name,
            'telegram_last_name': message.from_user.last_name,
            'phone': user_dict.get("phone"),
            'language': user_dict.get("language", "ru"),
            'business_type': user_dict.get("business_type", "hotel")
        }

        # Собираем контент пользователя: текст + все накопленные изображения за окно дебаунса
        user_content: Any = last_user_text
        try:
            images = pending_user_images.get(user_id, [])
            if images:
                user_content = [{"type": "text", "text": last_user_text}, *images]
        except Exception as e:
            logger.error(f"Ошибка при формировании user_content с изображениями: {e}")

        # Полная история для вызова: уже сохранённые сообщения + текущий незакоммиченный ввод
        llm_history = [*history, {'role': 'user', 'content': user_content}]

        # Получаем язык пользователя для ответа AI и клавиатуры
        user_language = user_dict.get("language", "ru")

        # Получаем ответ от AI (stateless) с показом индикации "набирает..."
        async with ChatActionSender(bot=message.bot, chat_id=message.chat.id, action="typing") as sender:
            response = await generate_reply(
                business_type=business_type,
                user_context=context,
                user_info=user_info,
                language=user_language,
                history=llm_history
            )

        # Логируем исходное сообщение для отладки
        logger.info(f"Исходное сообщение от AI (первые 200 символов): {response[:200]}")

        # Проверяем текущий state перед отправкой ответа
        current_state = await state.get_state()

        # Определяем клавиатуру в зависимости от текущего состояния
        if current_state == SettingsStates.in_settings.state:
            reply_keyboard = get_settings_keyboard(user_language)
        elif current_state == SettingsStates.changing_language.state:
            reply_keyboard = get_language_keyboard()
        else:
            reply_keyboard = get_compact_keyboard(user_language)

        # Отправляем: разбиваем максимум на 3 части — до первого "\n", между первым и последним, после последнего
        resp_text = response or ''

        # Если ответ пустой или только пробелы, просто ничего не отправляем
        if not resp_text.strip():
            logger.info(f"AI вернул пустой ответ для пользователя {user_id}, пропускаем отправку")
            return

        first_nl = resp_text.find('\n')
        last_nl = resp_text.rfind('\n')
        if first_nl == -1:
            chunks = [resp_text]
        elif first_nl == last_nl:
            # Ровно один перенос строки → две части
            chunks = [resp_text[:first_nl], resp_text[first_nl + 1:]]
        else:
            # Два и более переносов строки → три части
            chunks = [resp_text[:first_nl], resp_text[first_nl + 1:last_nl], resp_text[last_nl + 1:]]

        # Фильтруем пустые части, но сохраняем порядок
        chunks = [c for c in chunks if c and c.strip()]
        if not chunks:
            logger.info(f"После фильтрации chunks пустой для пользователя {user_id}, пропускаем отправку")
            return

        for idx, chunk in enumerate(chunks):
            if idx > 0:
                await asyncio.sleep(0.3)
            is_last = idx == len(chunks) - 1
            kb = reply_keyboard if is_last else None
            try:
                await message.answer(
                    chunk,
                    reply_markup=kb,
                    parse_mode=ParseMode.MARKDOWN
                )
            except Exception as e:
                logger.warning(f"Markdown форматирование не сработало для части ответа: {e}")
                formatted_chunk = (chunk or '').replace('**', '')
                await message.answer(formatted_chunk, reply_markup=kb)

        # После успешной отправки — коммитим историю: пользовательское сообщение + ответ ассистента
        committed_history = conversation_history.get(user_id, [])
        committed_history = [*committed_history, {'role': 'user', 'content': user_content}, {'role': 'assistant', 'content': response}]

        # Ограничиваем историю по длине (например, последние 40 записей = 20 обменов)
        max_items = 40
        if len(committed_history) > max_items:
            committed_history = committed_history[-max_items:]

        conversation_history[user_id] = committed_history
        # Очищаем буферы
        pending_user_text.pop(user_id, None)
        pending_user_images.pop(user_id, None)

    except asyncio.CancelledError:
        # Нормальная ситуация при дебаунсе — новая реплика пользователя
        raise
    except Exception as e:
        logger.error(f"Ошибка в отложенной отправке ответа AI: {e}")
        try:
            lang = 'ru'
            user_data = await db_service.get_user_with_context(message.from_user.id)
            if user_data:
                lang = user_data.get("user", {}).get("language", "ru")
            await message.answer(
                get_text('errors.message_processing', lang),
                reply_markup=get_compact_keyboard(lang)
            )
        except Exception:
            pass


"""
Удалены неиспользуемые утилиты ввода даты и состояния фамилии/даты рождения.
"""


@router.message(Command("clear"))
async def cmd_clear(message: Message, state: FSMContext):
    """Очистка истории чата с AI"""
    try:
        user_id = message.from_user.id
        _cancel_pending_task(user_id)
        user = await db_service.get_user_by_telegram_id(user_id)

        if not user:
            await message.answer("Вы не зарегистрированы. Используйте /start для регистрации.")
            return

        # Чистим историю, буфер и счётчики фото
        conversation_history.pop(user_id, None)
        pending_user_text.pop(user_id, None)
        pending_user_images.pop(user_id, None)
        _reset_photo_indices_and_counters(message.chat.id, user_id)

        lang = user.language
        await message.answer(
            "✅ История чата с AI очищена.\nТеперь вы можете начать новый диалог.",
            reply_markup=get_compact_keyboard(lang)
        )

        # Остаемся в состоянии чата
        await state.set_state(ChatStates.chatting)

    except Exception as e:
        logger.error(f"Ошибка при очистке истории чата: {e}")
        await message.answer("Произошла ошибка при очистке истории.")

@router.message(Command("quit"))
async def cmd_quit(message: Message, state: FSMContext):
    """Выход из аккаунта (удаление пользователя из БД)"""
    try:
        user_id = message.from_user.id
        _cancel_pending_task(user_id)
        user = await db_service.get_user_by_telegram_id(user_id)

        if not user:
            await message.answer("Вы не зарегистрированы.")
            return

        # Чистим историю, буфер и счётчики фото
        conversation_history.pop(user_id, None)
        pending_user_text.pop(user_id, None)
        pending_user_images.pop(user_id, None)
        _reset_photo_indices_and_counters(message.chat.id, user_id)

        # Удаляем пользователя из БД
        success = await db_service.delete_user(user_id)

        if success:
            await state.clear()
            await message.answer(
                "👋 Вы успешно вышли из аккаунта.\n"
                "Все ваши данные были удалены.\n"
                "Используйте /start для новой регистрации.",
                reply_markup=ReplyKeyboardRemove()
            )
        else:
            await message.answer("Произошла ошибка при выходе из аккаунта.")

    except Exception as e:
        logger.error(f"Ошибка при выходе из аккаунта: {e}")
        await message.answer("Произошла ошибка. Попробуйте позже.")

@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    """Обработка команды /start"""
    try:
        user_id = message.from_user.id

        # Проверяем, зарегистрирован ли пользователь
        user = await db_service.get_user_by_telegram_id(user_id)

        if user:
            # Пользователь уже зарегистрирован
            lang = user.language
            await message.answer(
                get_text('menu.welcome_back_hotel', lang).format(name=user.name),
                reply_markup=get_compact_keyboard(lang)
            )

            # Для статлес-режима ничего инициализировать не нужно

            await state.set_state(ChatStates.chatting)
        else:
            # Новый пользователь, выбор языка
            await message.answer(
                get_text('language_selection.prompt', 'ru'),
                reply_markup=get_language_keyboard()
            )
            await state.set_state(RegistrationStates.waiting_for_language)

    except Exception as e:
        logger.error(f"Ошибка в команде /start: {e}")
        await message.answer("Произошла ошибка. Попробуйте позже.")

@router.message(RegistrationStates.waiting_for_language)
async def process_language_selection(message: Message, state: FSMContext):
    """Обработка выбора языка"""
    try:
        text = message.text

        # Определяем выбранный язык
        language_map = {
            '🇷🇺 Русский': 'ru',
            '🇺🇿 O\'zbek': 'uz',
            '🇬🇧 English': 'en',
            '🇨🇳 中文': 'zh'
        }

        selected_lang = language_map.get(text)

        if not selected_lang:
            # Если неверный выбор, показываем клавиатуру снова
            await message.answer(
                get_text('language_selection.prompt', 'ru'),
                reply_markup=get_language_keyboard()
            )
            return

        # Сохраняем выбранный язык
        await state.update_data(language=selected_lang)

        # Отправляем подтверждение
        await message.answer(
            get_text('language_selection.selected', selected_lang),
            reply_markup=ReplyKeyboardRemove()
        )

        # Сразу запрашиваем телефон (пропускаем выбор типа бизнеса)
        await message.answer(
            get_text('registration.welcome', selected_lang),
            reply_markup=get_phone_keyboard(selected_lang)
        )

        await state.set_state(RegistrationStates.waiting_for_phone)

    except Exception as e:
        logger.error(f"Ошибка при выборе языка: {e}")
        await message.answer("Error occurred. Please try again.")

@router.message(RegistrationStates.waiting_for_phone, F.contact)
async def process_contact(message: Message, state: FSMContext):
    """Обработка отправленного контакта"""
    try:
        phone = message.contact.phone_number
        await process_phone_number(message, state, phone)
    except Exception as e:
        logger.error(f"Ошибка при обработке контакта: {e}")
        await message.answer("Ошибка при обработке номера телефона. Попробуйте ввести номер вручную.")

@router.message(RegistrationStates.waiting_for_phone)
async def process_phone_text(message: Message, state: FSMContext):
    """Обработка номера телефона, введенного текстом"""
    try:
        phone = message.text.strip()
        data = await state.get_data()
        lang = data.get('language', 'ru')

        if not validate_phone_format(phone):
            await message.answer(
                get_text('registration.phone_invalid', lang),
                reply_markup=get_phone_keyboard(lang)
            )
            return

        await process_phone_number(message, state, phone)

    except Exception as e:
        logger.error(f"Ошибка при обработке текстового номера: {e}")
        await message.answer("Ошибка при обработке номера телефона. Попробуйте еще раз.")

async def process_phone_number(message: Message, state: FSMContext, phone: str):
    """Обработка номера телефона"""
    try:
        normalized_phone = normalize_phone_display(phone)
        data = await state.get_data()
        lang = data.get('language', 'ru')

        # Проверяем, не зарегистрирован ли уже пользователь с таким номером
        existing_user = await db_service.get_user_by_phone(normalized_phone)
        if existing_user:
            await message.answer(
                get_text('registration.phone_exists', lang).format(phone=normalized_phone)
            )
            await state.clear()
            return

        # Сохраняем номер и отправляем SMS
        await state.update_data(phone=normalized_phone)

        success, message_text, test_code = await sms_service.send_sms_code(normalized_phone)

        if success:
            # В тестовом режиме отправляем код прямо пользователю
            if test_code:
                await message.answer(
                    get_text('registration.sms_test_mode', lang).format(
                        code=test_code,
                        phone=normalized_phone
                    ),
                    reply_markup=ReplyKeyboardRemove(),
                    parse_mode="HTML"
                )
            else:
                await message.answer(
                    get_text('registration.sms_sent', lang).format(phone=normalized_phone),
                    reply_markup=ReplyKeyboardRemove()
                )
            await state.set_state(RegistrationStates.waiting_for_sms_code)
        else:
            await message.answer(
                f"❌ {message_text}\n\n"
                "Попробуйте позже или свяжитесь с администрацией."
            )

    except Exception as e:
        logger.error(f"Ошибка при обработке номера телефона {phone}: {e}")
        await message.answer("Произошла ошибка. Попробуйте еще раз.")

@router.message(RegistrationStates.waiting_for_sms_code)
async def process_sms_code(message: Message, state: FSMContext):
    """Обработка SMS кода"""
    try:
        code = message.text.strip()
        data = await state.get_data()
        phone = data.get('phone')
        lang = data.get('language', 'ru')

        if not phone:
            await message.answer(get_text('errors.phone_not_found', lang))
            await state.clear()
            return

        # Проверяем код
        is_valid, response_message = await sms_service.verify_sms_code(phone, code)

        if is_valid:
            await message.answer(get_text('registration.sms_verified', lang))
            await state.set_state(RegistrationStates.waiting_for_name)
        else:
            await message.answer(f"❌ {response_message}")

            # Если превышены попытки, предлагаем запросить новый код
            if "запросите новый код" in response_message.lower():
                await message.answer(
                    get_text('sms.new_code_prompt', lang),
                    reply_markup=get_phone_keyboard(lang)
                )

    except Exception as e:
        logger.error(f"Ошибка при обработке SMS кода: {e}")
        await message.answer("Ошибка при проверке кода. Попробуйте еще раз.")

@router.message(Command("new_code"), RegistrationStates.waiting_for_sms_code)
async def resend_sms_code(message: Message, state: FSMContext):
    """Повторная отправка SMS кода"""
    try:
        data = await state.get_data()
        phone = data.get('phone')
        lang = data.get('language', 'ru')

        if not phone:
            await message.answer(get_text('errors.phone_not_found', lang))
            await state.clear()
            return

        success, message_text, test_code = await sms_service.send_sms_code(phone)

        if success:
            # В тестовом режиме отправляем код прямо пользователю
            if test_code:
                await message.answer(
                    get_text('sms.code_resent', lang).format(code=test_code),
                    parse_mode="HTML"
                )
            else:
                await message.answer(get_text('sms.code_sent', lang).format(message=message_text))
        else:
            await message.answer(get_text('sms.code_sent', lang).format(message=message_text))

    except Exception as e:
        logger.error(f"Ошибка при повторной отправке SMS: {e}")
        await message.answer("Ошибка при отправке кода. Попробуйте позже.")

@router.message(RegistrationStates.waiting_for_name)
async def process_name(message: Message, state: FSMContext):
    """Обработка имени и завершение регистрации"""
    try:
        name = message.text.strip()
        data = await state.get_data()
        lang = data.get('language', 'ru')

        if len(name) < 2 or not name.replace(' ', '').replace('-', '').isalpha():
            await message.answer(get_text('registration.name_invalid', lang))
            return

        await state.update_data(name=name)

        # Сразу завершаем регистрацию после получения имени
        data = await state.get_data()

        # Всегда используем hotel (единственный доступный тип бизнеса)
        business_type = get_business_type('hotel')

        # Создаем пользователя в БД (контекст теперь генерируется backend API)
        user = await db_service.create_or_update_user(
            telegram_id=message.from_user.id,
            phone=data['phone'],
            name=data['name'],
            surname=None,
            birthdate=None,
            language=lang,
            business_type='hotel'
        )

        if user:
            # Статлес-режим: агент не создаётся

            # Получаем контекст из API для отображения истории бронирований
            try:
                user_data = await db_service.get_user_with_context(message.from_user.id)
                context = user_data.get("context", {"booking_dates": [], "bookings_info": []}) if user_data else {"booking_dates": [], "bookings_info": []}
                context_display = business_type.format_history_display(context, lang)
            except Exception as e:
                logger.error(f"Ошибка при получении контекста после регистрации: {e}")
                context_display = None

            # Используем hotel ключ локализации
            registration_message = get_text('registration.registration_complete_hotel', lang).format(name=user.name, bookings=context_display or get_text('registration.no_booking_history', lang))

            await message.answer(
                registration_message,
                reply_markup=get_compact_keyboard(lang),
                parse_mode="HTML"
            )

            # Переходим в состояние чата без немедленного очистки, чтобы не потерять язык и тип бизнеса
            await state.set_state(ChatStates.chatting)
        else:
            await message.answer(get_text('errors.account_creation', lang))

    except Exception as e:
        logger.error(f"Ошибка при обработке имени: {e}")
        await message.answer("Ошибка при обработке имени. Попробуйте еще раз.")

@router.message(SettingsStates.in_settings, F.text == "⬅️ Назад")
@router.message(SettingsStates.in_settings, F.text == "⬅️ Orqaga")
@router.message(SettingsStates.in_settings, F.text == "⬅️ Back")
@router.message(SettingsStates.in_settings, F.text == "⬅️ 返回")
async def back_from_settings(message: Message, state: FSMContext):
    """Возврат из настроек в главное меню"""
    try:
        _cancel_pending_task(message.from_user.id)
        user = await db_service.get_user_by_telegram_id(message.from_user.id)
        if user:
            lang = user.language
            await message.answer(
                get_text('menu.welcome_back_hotel', lang).format(name=user.name),
                reply_markup=get_compact_keyboard(lang)
            )
            await state.set_state(ChatStates.chatting)
    except Exception as e:
        logger.error(f"Ошибка при возврате из настроек: {e}")

@router.message(SettingsStates.in_settings)
@router.message(SettingsStates.changing_language)
async def process_language_change(message: Message, state: FSMContext):
    """Обработка смены языка в настройках"""
    try:
        text = message.text

        # Определяем выбранный язык
        language_map = {
            '🇷🇺 Русский': 'ru',
            '🇺🇿 O\'zbek': 'uz',
            '🇬🇧 English': 'en',
            '🇨🇳 中文': 'zh'
        }

        selected_lang = language_map.get(text)

        if selected_lang:
            # Обновляем язык в БД
            success = await db_service.update_user_language(message.from_user.id, selected_lang)

            if success:
                await message.answer(
                    get_text('settings.language_changed', selected_lang),
                    reply_markup=get_settings_keyboard(selected_lang)
                )
                await state.set_state(SettingsStates.in_settings)

                # Статлес-режим: язык подхватывается при каждом вызове generate_reply
        else:
            # Если это кнопка "Изменить язык", показываем языки
            user = await db_service.get_user_by_telegram_id(message.from_user.id)
            if user:
                lang = user.language
                # Проверяем различные версии текста кнопки на разных языках
                change_lang_buttons = [
                    get_text('settings.change_language', 'ru'),
                    get_text('settings.change_language', 'uz'),
                    get_text('settings.change_language', 'en'),
                    get_text('settings.change_language', 'zh')
                ]

                if text in change_lang_buttons:
                    _cancel_pending_task(message.from_user.id)
                    await message.answer(
                        get_text('settings.select_language', lang),
                        reply_markup=get_language_keyboard()
                    )
                    await state.set_state(SettingsStates.changing_language)

    except Exception as e:
        logger.error(f"Ошибка при смене языка: {e}")

@router.message(ChatStates.chatting)
async def process_chat_message(message: Message, state: FSMContext):
    """Обработка сообщений в режиме чата"""
    try:
        user_id = message.from_user.id

        # Проверяем, не нажата ли кнопка настроек
        user = await db_service.get_user_by_telegram_id(user_id)
        if user:
            lang = user.language

            # Проверяем все возможные варианты кнопки настроек (только эмодзи)
            settings_buttons = [
                get_text('menu.settings_emoji', 'ru'),
                get_text('menu.settings_emoji', 'uz'),
                get_text('menu.settings_emoji', 'en'),
                get_text('menu.settings_emoji', 'zh')
            ]

            if message.text in settings_buttons:
                # При переходе в настройки отменяем отложенный ответ
                _cancel_pending_task(user_id)
                # Переходим в настройки
                await message.answer(
                    get_text('settings.menu', lang),
                    reply_markup=get_settings_keyboard(lang)
                )
                await state.set_state(SettingsStates.in_settings)
                return

        # Буферизуем реплики пользователя, аккумулируя их через перенос строки
        formatted_text = await _format_message_with_reply_annotation(message)
        if user_id in pending_user_text and pending_user_text[user_id]:
            pending_user_text[user_id] = f"{pending_user_text[user_id]}\n{formatted_text}"
        else:
            pending_user_text[user_id] = formatted_text

        # Если пришло фото, сразу буферизуем его в pending_user_images
        if message.photo:
            try:
                photo = message.photo[-1]
                file_obj = await message.bot.download(photo.file_id)
                if file_obj:
                    original_bytes = file_obj.read()
                    compressed_bytes, mime_type = ImageUtils.compress_image(original_bytes)
                    b64_data = base64.b64encode(compressed_bytes).decode("utf-8")
                    img_part = {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": b64_data}}
                    if user_id in pending_user_images:
                        pending_user_images[user_id].append(img_part)
                    else:
                        pending_user_images[user_id] = [img_part]
            except Exception as e:
                logger.error(f"Ошибка при подготовке изображения к LLM (on message): {e}")

        # Дебаунс: отменяем предыдущую задачу и планируем новую
        _cancel_pending_task(user_id)
        task = asyncio.create_task(_debounced_ai_reply(message, state))
        task.add_done_callback(_consume_task_exceptions)
        pending_ai_tasks[user_id] = task

    except Exception as e:
        logger.error(f"Ошибка при обработке сообщения чата: {e}")
        # Пытаемся получить язык пользователя для сообщения об ошибке
        error_lang = 'ru'
        try:
            if 'user' in locals() and user:
                error_lang = user.language
        except Exception:
            pass
        await message.answer(
            get_text('errors.message_processing', error_lang),
            reply_markup=get_compact_keyboard(error_lang)
        )

# Обработчик всех остальных сообщений (для незарегистрированных пользователей)
@router.message()
async def process_other_messages(message: Message, state: FSMContext):
    """Обработка всех остальных сообщений"""
    try:
        current_state = await state.get_state()

        if current_state is None:
            # Пользователь не в процессе регистрации и не в чате
            user = await db_service.get_user_by_telegram_id(message.from_user.id)

            if user:
                # Пользователь зарегистрирован, переводим в режим чата
                await state.set_state(ChatStates.chatting)
                await process_chat_message(message, state)
            else:
                # Пользователь не зарегистрирован
                await message.answer(
                    "Пожалуйста, начните с команды /start для регистрации."
                )
        else:
            # Неожиданное сообщение в процессе регистрации
            await message.answer(
                "Пожалуйста, следуйте инструкциям регистрации или используйте /start для начала заново."
            )

    except Exception as e:
        logger.error(f"Ошибка при обработке прочих сообщений: {e}")
        await message.answer("Произошла ошибка. Используйте /start")
