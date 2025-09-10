import re
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import field_validator
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .booking import Booking


class CustomerBase(SQLModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20, unique=True, index=True)
    date_of_birth: datetime | None = None
    district: str | None = Field(default=None, max_length=200)
    passport_photo_path: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip().title()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v:
            digits_only = re.sub(r'\D', '', v)
            if len(digits_only) < 7 or len(digits_only) > 15:
                raise ValueError("Phone number must contain between 7 and 15 digits")
            return v.strip()
        return v


class Customer(CustomerBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    bookings: list["Booking"] = Relationship(back_populates="customer")
    total_spent: float = Field(default=0.0)
    total_bookings: int = Field(default=0)
    first_booking_date: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    last_booking_date: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    date_of_birth: datetime | None = None
    district: str | None = None
    passport_photo_path: str | None = None
    tags: list[str] | None = None
    notes: str | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Name cannot be empty")
            return v.strip().title()
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v:
            digits_only = re.sub(r'\D', '', v)
            if len(digits_only) < 7 or len(digits_only) > 15:
                raise ValueError("Phone number must contain between 7 and 15 digits")
            return v.strip()
        return v


class CustomerPublic(CustomerBase):
    id: uuid.UUID
    total_spent: float
    total_bookings: int
    first_booking_date: datetime | None
    last_booking_date: datetime | None
    created_at: datetime


class CustomersPublic(SQLModel):
    data: list[CustomerPublic]
    count: int
