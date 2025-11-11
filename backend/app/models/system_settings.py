import uuid
from datetime import datetime, timezone

from pydantic import field_validator
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel


class SystemSettingsBase(SQLModel):
    """Base model for system settings."""
    language: str = Field(default="en", max_length=10, description="System default language")
    currency: str = Field(default="UZS", max_length=3, description="System default currency")

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v not in ["en", "ru", "uz"]:
            raise ValueError("Language must be one of: en, ru, uz")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if v not in ["USD", "RUB", "UZS"]:
            raise ValueError("Currency must be one of: USD, RUB, UZS")
        return v


class SystemSettingsUpdate(SQLModel):
    """Schema for updating system settings."""
    language: str | None = Field(default=None, max_length=10)
    currency: str | None = Field(default=None, max_length=3)

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str | None) -> str | None:
        if v is not None and v not in ["en", "ru", "uz"]:
            raise ValueError("Language must be one of: en, ru, uz")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str | None) -> str | None:
        if v is not None and v not in ["USD", "RUB", "UZS"]:
            raise ValueError("Currency must be one of: USD, RUB, UZS")
        return v


class SystemSettings(SystemSettingsBase, table=True):
    """System settings table - singleton (only one record should exist)."""
    __tablename__ = "system_settings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )


class SystemSettingsPublic(SystemSettingsBase):
    """Public schema for system settings."""
    id: uuid.UUID
    updated_at: datetime

