import re
import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from pydantic import field_validator
from pydantic_core import core_schema
from sqlalchemy import JSON, Column
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    pass


# Test comment to trigger schema regeneration
# Shared properties
class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)


class UserRegister(SQLModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    username: str | None = Field(default=None, min_length=3, max_length=50)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v and not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


# Hotel CRM Models


class RoomType(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    SUITE = "suite"
    DELUXE = "deluxe"
    PRESIDENTIAL = "presidential"


class RoomStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"


class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"


class CustomerTag(str, Enum):
    VIP = "vip"
    REGULAR = "regular"
    BUSINESS = "business"
    FAMILY = "family"
    CORPORATE = "corporate"


# Room models
class RoomBase(SQLModel):
    room_number: str = Field(unique=True, index=True, max_length=10)
    floor: int = Field(ge=1, le=20)
    room_type: RoomType
    price_per_night: float = Field(gt=0)
    status: RoomStatus = Field(default=RoomStatus.AVAILABLE)
    max_occupancy: int = Field(ge=1, le=6, default=2)
    description: str | None = Field(default=None, max_length=500)


class Room(RoomBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    bookings: list["Booking"] = Relationship(back_populates="room")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RoomCreate(RoomBase):
    pass


class RoomUpdate(SQLModel):
    room_number: str | None = None
    floor: int | None = None
    room_type: RoomType | None = None
    price_per_night: float | None = None
    status: RoomStatus | None = None
    max_occupancy: int | None = None
    description: str | None = None


class RoomPublic(RoomBase):
    id: uuid.UUID
    created_at: datetime


# Customer models
class CustomerBase(SQLModel):
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    email: str = Field(unique=True, index=True, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    passport_number: str | None = Field(default=None, max_length=50)
    nationality: str | None = Field(default=None, max_length=100)
    date_of_birth: datetime | None = None
    address: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid email address")
        return v.lower()


class Customer(CustomerBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    bookings: list["Booking"] = Relationship(back_populates="customer")
    total_spent: float = Field(default=0.0)
    total_bookings: int = Field(default=0)
    first_booking_date: datetime | None = None
    last_booking_date: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(SQLModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    passport_number: str | None = None
    nationality: str | None = None
    date_of_birth: datetime | None = None
    address: str | None = None
    tags: list[str] | None = None
    notes: str | None = None


class CustomerPublic(CustomerBase):
    id: uuid.UUID
    total_spent: float
    total_bookings: int
    first_booking_date: datetime | None
    last_booking_date: datetime | None
    created_at: datetime


# Booking models
class BookingBase(SQLModel):
    customer_id: uuid.UUID = Field(foreign_key="customer.id")
    room_id: uuid.UUID = Field(foreign_key="room.id")
    check_in: datetime
    check_out: datetime
    status: BookingStatus = Field(default=BookingStatus.CONFIRMED)
    adults: int = Field(ge=1, le=6, default=1)
    children: int = Field(ge=0, le=4, default=0)
    total_amount: float = Field(gt=0)
    paid_amount: float = Field(default=0.0)
    special_requests: str | None = Field(default=None, max_length=1000)

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: datetime, info: core_schema.FieldValidationInfo) -> datetime:
        if info.data and "check_in" in info.data and v <= info.data["check_in"]:
            raise ValueError("Check-out must be after check-in")
        return v


class Booking(BookingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    customer: Optional["Customer"] = Relationship(back_populates="bookings")
    room: Optional["Room"] = Relationship(back_populates="bookings")
    booking_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BookingCreate(BookingBase):
    pass


class BookingUpdate(SQLModel):
    customer_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    status: BookingStatus | None = None
    adults: int | None = None
    children: int | None = None
    total_amount: float | None = None
    paid_amount: float | None = None
    special_requests: str | None = None


class BookingPublic(BookingBase):
    id: uuid.UUID
    customer: CustomerPublic | None = None
    room: RoomPublic | None = None
    booking_date: datetime
    created_at: datetime


# List responses
class RoomsPublic(SQLModel):
    data: list[RoomPublic]
    count: int


class CustomersPublic(SQLModel):
    data: list[CustomerPublic]
    count: int


class BookingsPublic(SQLModel):
    data: list[BookingPublic]
    count: int
