import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import field_validator, model_validator
from pydantic_core import core_schema
from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from .common import BookingStatus, PaymentMethod
from .customer import CustomerPublic
from .room import RoomPublic

if TYPE_CHECKING:
    from .customer import Customer
    from .room import Room


class BookingBase(SQLModel):
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)
    room_id: uuid.UUID = Field(foreign_key="room.id")
    check_in: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    check_out: datetime = Field(sa_column=Column(DateTime(timezone=True)))
    status: BookingStatus = Field(default=BookingStatus.CONFIRMED, index=True)
    total_amount: float = Field(gt=0, le=1000000)
    discount: float = Field(default=0.0, ge=0, le=100)
    discount_reason: str | None = Field(default=None, max_length=500)
    payment_method: PaymentMethod = Field(default=PaymentMethod.CASH)
    registration_need: bool = Field(default=True)

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: datetime, info: core_schema.FieldValidationInfo) -> datetime:
        if info.data:
            check_in = info.data.get("check_in")
            if check_in is not None and v <= check_in:
                raise ValueError("Check-out must be after check-in")
        return v

    @model_validator(mode="after")
    def validate_discount_reason(self) -> "BookingBase":
        if self.discount and self.discount > 0 and not self.discount_reason:
            raise ValueError("Discount reason is required when applying a discount")
        return self


class Booking(BookingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    customer: Optional["Customer"] = Relationship(back_populates="bookings")
    room: Optional["Room"] = Relationship(back_populates="bookings")
    booking_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))

    def calculate_total_amount(self, room_price_per_night: float) -> float:
        nights = (self.check_out.date() - self.check_in.date()).days
        nights = max(1, nights)
        subtotal = room_price_per_night * nights
        discount_amount = subtotal * (self.discount / 100) if self.discount else 0
        total = subtotal - discount_amount
        return max(0.0, total)

    def is_status_transition_valid(self, new_status: BookingStatus) -> bool:
        valid_transitions = {
            BookingStatus.CONFIRMED: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED],
            BookingStatus.CHECKED_IN: [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED],
            BookingStatus.CHECKED_OUT: [],
            BookingStatus.CANCELLED: [],
        }
        return new_status in valid_transitions.get(self.status, [])


class BookingCreate(BookingBase):
    pass


class BookingUpdate(SQLModel):
    customer_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    status: BookingStatus | None = None
    total_amount: float | None = None
    discount: float | None = None
    discount_reason: str | None = None
    payment_method: PaymentMethod | None = None
    registration_need: bool | None = None


class BookingPublic(BookingBase):
    id: uuid.UUID
    customer: CustomerPublic | None = None
    room: RoomPublic | None = None
    booking_date: datetime
    created_at: datetime


class BookingsPublic(SQLModel):
    data: list[BookingPublic]
    count: int
