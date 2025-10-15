"""Bot user schemas - pure Pydantic (no SQLModel/DB)"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SessionLoginRequest(BaseModel):
    """Request to login (create session)"""
    telegram_id: int = Field(description="Telegram user ID")
    phone: str = Field(max_length=20, description="Normalized phone (digits only)")
    name: str = Field(max_length=100, description="User first name")
    surname: str | None = Field(default=None, max_length=100, description="User last name")
    birthdate: datetime | None = Field(default=None, description="Date of birth")
    language: str = Field(default="ru", max_length=2, description="Interface language code (ru, uz, en, zh)")


class BotUserPublic(BaseModel):
    """Bot user response from API"""
    id: uuid.UUID
    phone: str
    name: str
    surname: str | None = None
    birthdate: datetime | None = None
    language: str
    business_type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class BotUsersPublic(BaseModel):
    """List of bot users from API"""
    data: list[BotUserPublic]
    count: int
