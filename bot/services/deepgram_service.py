"""
Сервис для работы с Deepgram API для транскрибирования голосовых сообщений
"""
import logging
import asyncio
from enum import Enum
from typing import Optional

from deepgram import DeepgramClient

from config import settings

logger = logging.getLogger(__name__)


class ASRModel(Enum):
    NOVA_3 = "nova-3"
    WHISPER_LARGE = "whisper-large"


class DeepgramService:
    """Сервис для транскрибирования голосовых сообщений через Deepgram"""

    def __init__(self, default_language: str = "multi", default_model: ASRModel = ASRModel.WHISPER_LARGE):
        """Инициализация клиента Deepgram

        default_language: язык распознавания. Используйте 'multi' для мультиязычного режима
        или конкретный код языка (например, 'ru', 'en').
        default_model: модель распознавания (например, NOVA_3 или WHISPER_LARGE).
        """
        self.client = DeepgramClient(api_key=settings.deepgram_api_key)
        self.default_language = default_language
        self.default_model = default_model

    def _transcribe_sync(self, audio_data: bytes, language: Optional[str], model: ASRModel) -> Optional[dict]:
        """Синхронный метод для транскрибирования (запускается в отдельном потоке)"""
        try:
            # Базовые опции для обеих моделей
            request_kwargs = dict(
                request=audio_data,
                smart_format=True,   # Пунктуация, числа, даты и т.п.
                punctuate=True,
                diarize=False,
                filler_words=False,
            )

            # Настраиваем модель и мультиязычность
            if model == ASRModel.NOVA_3:
                # Для Nova-3: используем language='multi' по умолчанию
                request_kwargs.update(
                    model=ASRModel.NOVA_3.value,
                    language=language or "multi",
                )
            elif model == ASRModel.WHISPER_LARGE:
                # Для Whisper Large: включаем автоопределение языка
                # (detect_language=True), язык явно не задаём
                request_kwargs.update(
                    model=ASRModel.WHISPER_LARGE.value,
                    detect_language=True,
                )
            else:
                # На всякий случай дефолт к Nova-3
                request_kwargs.update(
                    model=ASRModel.NOVA_3.value,
                    language=language or "multi",
                )

            response = self.client.listen.v1.media.transcribe_file(**request_kwargs)
            return response
        except Exception as e:
            logger.error(f"Ошибка в синхронном вызове Deepgram: {e}")
            return None

    async def transcribe_voice(
        self,
        audio_data: bytes,
        mime_type: str = "audio/ogg",
        language: Optional[str] = None,
        model: Optional[ASRModel] = None,
    ) -> Optional[str]:
        """
        Транскрибирует голосовое сообщение в текст, поддерживая выбор модели (Nova-3 или Whisper Large).

        Args:
            audio_data: Байты аудио файла
            mime_type: MIME тип аудио файла (по умолчанию audio/ogg для Telegram)
            language: Код языка (например, 'ru', 'en'). Для Nova-3 по умолчанию используется 'multi'.
                      Для Whisper Large по умолчанию включается detect_language=True.
            model: Модель распознавания. Если None — используется self.default_model.

        Returns:
            Текст транскрипции или None в случае ошибки
        """
        try:
            # Определяем модель и язык распознавания
            model_to_use = model or self.default_model
            language_to_use = language or self.default_language

            # Отправляем на транскрибирование используя Deepgram SDK v5
            # https://developers.deepgram.com/docs/pre-recorded-audio
            # https://developers.deepgram.com/docs/multilingual-code-switching
            # Запускаем синхронный вызов в отдельном потоке
            response = await asyncio.to_thread(self._transcribe_sync, audio_data, language_to_use, model_to_use)

            # Извлекаем текст из ответа
            if response and response.results and response.results.channels:
                channel = response.results.channels[0]
                if channel.alternatives and len(channel.alternatives) > 0:
                    alternative = channel.alternatives[0]
                    transcript = alternative.transcript

                    # Определяем языки (для multilingual code-switching может быть несколько)
                    detected_languages = []
                    # 1) Языки на уровне альтернативы (Nova-3 может возвращать массив)
                    if hasattr(alternative, 'languages') and alternative.languages:
                        detected_languages = alternative.languages
                    # 2) Fallback: язык, определённый на уровне канала (Whisper обычно кладёт сюда)
                    if not detected_languages and hasattr(channel, 'detected_language') and channel.detected_language:
                        detected_languages = [channel.detected_language]

                    logger.info(
                        f"Успешная транскрипция голосового сообщения. "
                        f"Модель: {model_to_use.value}. "
                        f"Языки: {', '.join(detected_languages) if detected_languages else 'не определены'}. "
                        f"Длина текста: {len(transcript)} символов"
                    )

                    # Печатаем/логируем полный сырой ответ для отладки
                    try:
                        if hasattr(response, 'to_json'):
                            raw_json = response.to_json(indent=2)
                            if raw_json:
                                print(raw_json)
                                logger.info(f"Deepgram raw response:\n{raw_json}")
                        else:
                            # Fallback — просто строковое представление объекта
                            logger.info(f"Deepgram raw response object: {response}")
                    except Exception as ser_e:
                        logger.debug(f"Не удалось сериализовать ответ Deepgram: {ser_e}")

                    return transcript.strip() if transcript else None

            logger.warning("Deepgram не вернул результат транскрипции")
            return None

        except Exception as e:
            logger.error(f"Ошибка при транскрибировании голосового сообщения: {e}")
            return None
