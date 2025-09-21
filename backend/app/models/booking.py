import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from pydantic import field_validator, model_validator
from pydantic_core import core_schema
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from .common import BookingStatus, PaymentMethod
from .customer import CustomerPublic
from .room import RoomPublic

if TYPE_CHECKING:
    from .customer import Customer
    from .room import Room


class PaymentCalculationMixin:
    """Mixin class for payment calculation methods used by both Booking and BookingPublic."""

    @property
    def refund_amount(self) -> float:
        """Calculate total refunds from payment adjustments."""
        if not hasattr(self, 'payment_adjustments') or not self.payment_adjustments:
            return 0.0
        total = sum(
            adj.get("amount", 0)
            for adj in self.payment_adjustments
            if adj.get("amount", 0) < 0
        )
        return abs(total)

    @property
    def additional_payment(self) -> float:
        """Calculate total additional payments from payment adjustments."""
        if not hasattr(self, 'payment_adjustments') or not self.payment_adjustments:
            return 0.0
        return sum(
            adj.get("amount", 0)
            for adj in self.payment_adjustments
            if adj.get("amount", 0) > 0
        )


class BookingBase(SQLModel):
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)
    room_id: uuid.UUID = Field(foreign_key="room.id", index=True)
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


class Booking(BookingBase, PaymentCalculationMixin, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    customer: Optional["Customer"] = Relationship(back_populates="bookings")
    room: Optional["Room"] = Relationship(back_populates="bookings")
    booking_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))

    # Actual dates (when guest really checked in/out)
    actual_check_in: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    actual_check_out: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)))

    # Payment adjustments history as JSON list (stored as JSONB in PostgreSQL)
    payment_adjustments: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))

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
    actual_check_in: datetime | None = None
    actual_check_out: datetime | None = None
    payment_adjustments: list[dict[str, Any]] | None = None


class BookingPublic(BookingBase, PaymentCalculationMixin):
    id: uuid.UUID
    customer: CustomerPublic | None = None
    room: RoomPublic | None = None
    booking_date: datetime
    created_at: datetime
    actual_check_in: datetime | None = None
    actual_check_out: datetime | None = None
    payment_adjustments: list[dict[str, Any]] = Field(default_factory=list)

    @field_validator("payment_adjustments", mode="before")
    @classmethod
    def validate_payment_adjustments(cls, v: Any) -> list[dict[str, Any]]:
        """Convert NULL payment_adjustments to empty list."""
        return v if v is not None else []


class BookingsPublic(SQLModel):
    data: list[BookingPublic]
    count: int


class DateModificationRequest(SQLModel):
    """Request model for modifying booking dates."""
    new_check_in: datetime | None = None
    new_check_out: datetime | None = None


class RoomChangeRequest(SQLModel):
    """Request model for changing booking room."""
    new_room_id: uuid.UUID


class PaymentAdjustmentResponse(SQLModel):
    """Response model for operations that result in payment adjustments."""
    booking: BookingPublic
    payment_difference: float  # Positive = customer pays more, negative = refund


class DiscountModificationRequest(SQLModel):
    """Request model for modifying booking discount with payment adjustment."""
    new_discount: float = Field(ge=0, le=100)
    discount_reason: str | None = None
