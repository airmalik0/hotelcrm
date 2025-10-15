"""Bot session model for multi-device authentication"""
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .bot_user import BotUser


class BotSessionBase(SQLModel):
    """Bot session = active login (telegram_id → phone number)"""
    telegram_id: int = Field(sa_column=Column(BigInteger, unique=True, index=True), description="Telegram user ID (one session per telegram account)")
    bot_user_id: uuid.UUID = Field(foreign_key="bot_users.id", index=True, description="Bot user (phone number) this session is logged into")


class BotSession(BotSessionBase, table=True):
    __tablename__ = "bot_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    last_active_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))

    # Relationships
    bot_user: "BotUser" = Relationship(back_populates="sessions")


class BotSessionCreate(SQLModel):
    """Create bot session (login)"""
    telegram_id: int
    bot_user_id: uuid.UUID


class BotSessionPublic(BotSessionBase):
    id: uuid.UUID
    created_at: datetime
    last_active_at: datetime


class BotSessionsPublic(SQLModel):
    data: list[BotSessionPublic]
    count: int
