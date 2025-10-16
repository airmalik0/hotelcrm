"""Bot user schemas - pure Pydantic (no SQLModel/DB)"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SessionLoginRequest(BaseModel):
    """Request to login (create session)"""
    telegram_id: int = Field(description="Telegram user ID")
    phone: str = Field(max_length=20, description="Normalized phone (digits only)")
    name: str = Field(max_length=100, description="User first name")
    language: str = Field(default="ru", max_length=2, description="Interface language code (ru, uz, en, zh)")
    # Telegram account metadata
    telegram_username: str | None = Field(default=None, description="Telegram @username")
    telegram_first_name: str = Field(description="Telegram display first name")
    telegram_last_name: str | None = Field(default=None, description="Telegram display last name")
    telegram_language_code: str | None = Field(default=None, description="Telegram user language code")


class BotUserPublic(BaseModel):
    """Bot user response from API"""
    id: uuid.UUID
    phone: str
    name: str
    language: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BotUsersPublic(BaseModel):
    """List of bot users from API"""
    data: list[BotUserPublic]
    count: int
