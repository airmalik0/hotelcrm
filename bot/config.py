"""
Конфигурация приложения
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field

# Загружаем переменные окружения
load_dotenv()

class Settings(BaseSettings):
    """Настройки приложения"""

    # Telegram Bot
    telegram_token: str = Field(..., env="TELEGRAM_TOKEN")
    admin_id: int = Field(..., env="ADMIN_ID")

    # PostgreSQL
    # Deprecated: direct DB usage removed in favor of backend API
    postgres_host: str = Field(default="localhost", env="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, env="POSTGRES_PORT")
    postgres_db: str = Field(default="hotel_bot", env="POSTGRES_DB")
    postgres_user: str = Field(default="postgres", env="POSTGRES_USER")
    postgres_password: str | None = Field(default=None, env="POSTGRES_PASSWORD")
    postgres_dsn: str | None = Field(default=None, env="POSTGRES_DSN")

    # Anthropic API
    anthropic_api_key: str = Field(..., env="ANTHROPIC_API_KEY")

    # Deepgram API (для транскрибирования голосовых сообщений)
    deepgram_api_key: str = Field(..., env="DEEPGRAM_API_KEY")

    # LangSmith (LangChain tracing and monitoring)
    langsmith_api_key: str = Field(default="", env="LANGSMITH_API_KEY")
    langsmith_project: str = Field(default="hotel-bot", env="LANGSMITH_PROJECT")
    langsmith_endpoint: str = Field(default="https://api.smith.langchain.com", env="LANGSMITH_ENDPOINT")
    langsmith_tracing: bool = Field(default=False, env="LANGSMITH_TRACING")

    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_file: str = Field(default="logs/bot.log", env="LOG_FILE")

    # Backend API
    backend_api_url: str = Field(default="http://backend:8000/api/v1", env="BACKEND_API_URL")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Игнорировать лишние поля из .env

# Создаем экземпляр настроек
settings = Settings() 