"""Bot user models - pure Pydantic (no SQLModel/DB)"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BotUserCreate(BaseModel):
    """Data for creating a bot user via API"""
    telegram_id: int = Field(description="Telegram user ID")
    phone: str = Field(max_length=20, description="Normalized phone (digits only)")
    name: str = Field(max_length=100, description="User first name")
    surname: str | None = Field(default=None, max_length=100, description="User last name")
    birthdate: datetime | None = Field(default=None, description="Date of birth")
    language: str = Field(default="ru", max_length=2, description="Interface language code (ru, uz, en, zh)")
    business_type: str = Field(default="hotel", max_length=20, description="Business type (always hotel)")


class BotUserUpdate(BaseModel):
    """Data for updating a bot user via API"""
    telegram_id: int | None = None
    phone: str | None = None
    name: str | None = None
    surname: str | None = None
    birthdate: datetime | None = None
    language: str | None = None
    is_active: bool | None = None


class BotUserPublic(BaseModel):
    """Bot user response from API"""
    id: uuid.UUID
    telegram_id: int
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
