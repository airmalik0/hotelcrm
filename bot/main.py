"""
Основной файл для запуска Telegram бота гостиничного комплекса
"""
import asyncio
import logging
import sys
import os
from pathlib import Path

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from config import settings
from bot.handlers import router
from bot.notifier import init_notifier, get_notifier
from services.sms import SMSService

def setup_langsmith():
    """Настройка LangSmith для трейсинга LLM операций"""
    if settings.langsmith_tracing and settings.langsmith_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_ENDPOINT"] = settings.langsmith_endpoint
        os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
        
        logger = logging.getLogger(__name__)
        logger.info(f"LangSmith трейсинг включен. Проект: {settings.langsmith_project}")
    else:
        logger = logging.getLogger(__name__)
        if not settings.langsmith_api_key:
            logger.info("LangSmith API ключ не настроен, трейсинг отключен")
        else:
            logger.info("LangSmith трейсинг отключен в настройках")

# Настройка логирования
def setup_logging():
    """Настройка системы логирования"""
    # Создаем директорию для логов если её нет
    log_dir = Path(settings.log_file).parent
    log_dir.mkdir(exist_ok=True)
    
    # Настройка форматирования
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Настройка логирования в файл и консоль
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format=log_format,
        handlers=[
            logging.FileHandler(settings.log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Устанавливаем уровень для различных логгеров
    logging.getLogger('aiogram').setLevel(logging.INFO)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('google').setLevel(logging.WARNING)

async def on_startup(bot: Bot):
    """Действия при запуске бота"""
    logger = logging.getLogger(__name__)
    
    # С  API-бэкендом прямое подключение к БД не требуется
    logger.info("Инициализация без подключения к БД (бот использует API бэкенда)")
    
    try:
        # Инициализируем уведомитель
        logger.info("Инициализация уведомителя...")
        init_notifier(bot)

        # Отправляем уведомление о запуске
        notifier = get_notifier()
        if notifier:
            await notifier.notify_system("🚀 Бот успешно запущен!")

        logger.info("Бот успешно запущен!")

    except Exception as e:
        logger.error(f"Ошибка при запуске бота: {e}")
        # НЕ делаем sys.exit(1)

async def on_shutdown(bot: Bot):
    """Действия при остановке бота"""
    logger = logging.getLogger(__name__)

    try:
        # Уведомляем администратора об остановке
        notifier = get_notifier()
        if notifier:
            await notifier.notify_system("🛑 Бот остановлен")

        # Закрываем SMS сервис
        sms_service = SMSService()
        await sms_service.close()

        logger.info("Бот корректно остановлен")

    except Exception as e:
        logger.error(f"Ошибка при остановке бота: {e}")

async def main():
    """Основная функция"""
    # Настраиваем логирование
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Настраиваем LangSmith
    setup_langsmith()
    
    logger.info("Запуск Telegram бота гостиничного комплекса...")
    
    try:
        # Создаем бота и диспетчер
        bot = Bot(token=settings.telegram_token)
        dp = Dispatcher(storage=MemoryStorage())
        
        # Регистрируем роутеры
        dp.include_router(router)
        
        # Регистрируем хуки
        dp.startup.register(on_startup)
        dp.shutdown.register(on_shutdown)
        
        # Запускаем поллинг
        logger.info("Начинаем поллинг...")
        await dp.start_polling(bot)
    
    except KeyboardInterrupt:
        logger.info("Получен сигнал остановки")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nБот остановлен пользователем")
    except Exception as e:
        print(f"Критическая ошибка при запуске: {e}")
        sys.exit(1) 