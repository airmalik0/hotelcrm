import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .customer_inquiry import CustomerInquiry


class BotUserBase(SQLModel):
    telegram_id: int = Field(unique=True, index=True, description="Telegram user ID")
    phone: str = Field(unique=True, index=True, max_length=20, description="Normalized phone (digits only)")
    name: str = Field(max_length=100, description="User first name")
    surname: str | None = Field(default=None, max_length=100, description="User last name")
    birthdate: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)), description="Date of birth")
    language: str = Field(default="ru", max_length=2, description="Interface language code (ru, uz, en, zh)")
    business_type: str = Field(default="hotel", max_length=20, description="Business type (hotel, restaurant)")
    is_active: bool = Field(default=True, description="Whether user is active")


class BotUser(BotUserBase, table=True):
    __tablename__ = "bot_users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))

    # Relationships
    inquiries: list["CustomerInquiry"] = Relationship(back_populates="bot_user")


class BotUserCreate(BotUserBase):
    pass


class BotUserUpdate(SQLModel):
    telegram_id: int | None = None
    phone: str | None = None
    name: str | None = None
    surname: str | None = None
    birthdate: datetime | None = None
    language: str | None = None
    business_type: str | None = None
    is_active: bool | None = None


class BotUserPublic(BotUserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class BotUsersPublic(SQLModel):
    data: list[BotUserPublic]
    count: int
