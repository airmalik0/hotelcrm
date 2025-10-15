"""
Модуль для отправки уведомлений
"""
import logging
from aiogram import Bot
from config import settings

logger = logging.getLogger(__name__)


class Notifier:
    """Единый класс для отправки уведомлений администратору и пользователям"""

    def __init__(self, bot: Bot, admin_id: int):
        self.bot = bot
        self.admin_id = admin_id

    def _format_request_notification(self, request_data: dict, is_demo: bool = False) -> str:
        """Форматирование уведомления о обращении

        Args:
            request_data: Данные обращения
            is_demo: Если True, добавляет демо-префикс для пользователя
        """
        # Определяем тип и эмодзи
        if request_data.get("type") == "complaint":
            request_type_ru = "ЖАЛОБА"
            type_emoji = "🔴"
        else:
            request_type_ru = "ПРЕДЛОЖЕНИЕ"
            type_emoji = "💡"

        # Форматируем дату рождения если есть
        birthdate_str = ""
        if request_data.get('birthdate'):
            birthdate_str = request_data.get('birthdate')

        # Telegram информация
        tg_info = ""
        if request_data.get('telegram_username'):
            tg_info = f"├ TG: @{request_data.get('telegram_username')}\n"
        if request_data.get('telegram_first_name') or request_data.get('telegram_last_name'):
            tg_name = f"{request_data.get('telegram_first_name', '')} {request_data.get('telegram_last_name', '')}".strip()
            if tg_name:
                tg_info += f"├ TG имя: {tg_name}\n"

        # Блок данных о заселении — только для отеля
        occupancy_block = ""
        if request_data.get('business_type', 'hotel') == 'hotel':
            occupancy_block = (
                f"🏨 <b>Данные заселения:</b>\n"
                f"├ Дата заезда: {request_data.get('checkin_date', '')}\n"
                f"└ Номер: {request_data.get('room_id', '')}\n\n"
            )

        # Основное сообщение
        message = (
            f"{type_emoji} <b>НОВОЕ {request_type_ru}</b>\n"
            f"{'━' * 30}\n\n"
            f"👤 <b>Информация о госте:</b>\n"
            f"├ Имя: {request_data.get('name', '')} {request_data.get('surname', '')}\n"
            f"├ Телефон: <code>{request_data.get('phone', '')}</code>\n"
            f"{tg_info}"
            f"├ Дата рождения: {birthdate_str}\n"
            f"└ ID в системе: {request_data.get('user_id', 'N/A')}\n\n"
            f"{occupancy_block}"
            f"💬 <b>Текст обращения:</b>\n"
            f"<i>{request_data.get('message', '')}</i>\n\n"
            f"{'─' * 30}\n"
            f"🆔 ID обращения: #{request_data.get('request_id', '')}\n"
            f"🕐 Время: {request_data.get('timestamp', '')}"
        )

        # Добавляем демо-префикс если нужно
        if is_demo:
            message = (
                f"📬 <b>УВЕДОМЛЕНИЕ ДЛЯ АДМИНИСТРАТОРА</b>\n"
                f"<i>(вы видите, что получит владелец)</i>\n\n"
                f"{message}"
            )

        return message

    async def notify_request_to_admin(self, request_data: dict):
        """Отправить уведомление о новом обращении администратору"""
        try:
            message = self._format_request_notification(request_data, is_demo=False)

            await self.bot.send_message(
                chat_id=self.admin_id,
                text=message,
                parse_mode="HTML"
            )

            logger.info(f"Уведомление о обращении {request_data.get('request_id')} отправлено администратору")

        except Exception as e:
            logger.error(f"Ошибка при отправке уведомления администратору: {e}")

    async def notify_request_to_user(self, user_id: int, request_data: dict):
        """Отправить демо-уведомление пользователю о том, что получит администратор"""
        try:
            message = self._format_request_notification(request_data, is_demo=True)

            await self.bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode="HTML"
            )

            logger.info(f"Демо-уведомление отправлено пользователю {user_id}")

        except Exception as e:
            logger.error(f"Ошибка при отправке демо-уведомления пользователю: {e}")

    async def notify_system(self, message: str):
        """Отправить системное уведомление администратору"""
        try:
            await self.bot.send_message(
                chat_id=self.admin_id,
                text=f"🔧 СИСТЕМНОЕ УВЕДОМЛЕНИЕ\n\n{message}"
            )

            logger.info("Системное уведомление отправлено администратору")

        except Exception as e:
            logger.error(f"Ошибка при отправке системного уведомления: {e}")

    async def notify_sync_report(self, sync_results: dict):
        """Отправить отчет о синхронизации администратору"""
        try:
            total_created = sum(sync_results.values())

            if total_created == 0:
                message = "📊 ОТЧЕТ О СИНХРОНИЗАЦИИ\n\nНовых записей не создано."
            else:
                message = f"📊 ОТЧЕТ О СИНХРОНИЗАЦИИ\n\nВсего создано записей: {total_created}\n\n"

                for sheet_name, count in sync_results.items():
                    if count > 0:
                        message += f"• {sheet_name}: {count} записей\n"

            await self.bot.send_message(
                chat_id=self.admin_id,
                text=message
            )

            logger.info("Отчет о синхронизации отправлен администратору")

        except Exception as e:
            logger.error(f"Ошибка при отправке отчета о синхронизации: {e}")


# Глобальный экземпляр (будет инициализирован в main.py)
notifier: Notifier = None


def init_notifier(bot: Bot):
    """Инициализация уведомителя"""
    global notifier
    notifier = Notifier(bot, settings.admin_id)


def get_notifier() -> Notifier:
    """Получить экземпляр уведомителя"""
    return notifier 