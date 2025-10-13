import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import field_validator
from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .booking import Booking
    from .customer import Customer


class BookingGuestBase(SQLModel):
    """Base model for booking guests."""
    # Optional reference to existing customer (if saved to database)
    customer_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="customer.id",
        description="Reference to customer if saved to database"
    )

    # Inline guest data (used when customer_id is None or for override)
    full_name: str | None = Field(
        default=None,
        max_length=200,
        description="Guest full name (required if not linked to customer)"
    )

    # Required fields for all guests
    passport_photo_path: str = Field(
        max_length=500,
        description="Path to passport photo (required for all guests)"
    )
    origin_city: str = Field(
        max_length=100,
        description="City/country where guest is from (required)"
    )

    # Optional contact information
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)

    # Guest role
    is_primary: bool = Field(
        default=False,
        description="True if this is the primary guest (booking holder)"
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Full name cannot be empty if provided")
            return v.title()
        return v

    @field_validator("origin_city")
    @classmethod
    def validate_origin_city(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Origin city is required")
        return v.title()


class BookingGuest(BookingGuestBase, table=True):
    """Database model for booking guests."""
    __tablename__ = "booking_guests"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    booking_id: uuid.UUID = Field(
        foreign_key="booking.id",
        index=True,
        ondelete="CASCADE",
        description="Booking this guest belongs to"
    )

    added_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True)),
        description="When this guest was added to the booking"
    )

    # Relationships
    booking: "Booking" = Relationship(back_populates="guests")
    customer: Optional["Customer"] = Relationship()


class BookingGuestCreate(SQLModel):
    """Schema for creating a booking guest."""
    customer_id: uuid.UUID | None = None
    full_name: str | None = None
    passport_photo_path: str
    origin_city: str
    phone: str | None = None
    email: str | None = None
    is_primary: bool = False
    save_to_customers: bool = Field(
        default=False,
        description="If true, create/link customer in database"
    )

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str | None, values) -> str | None:
        # If customer_id is not provided, full_name is required
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Full name cannot be empty if provided")
            return v.title()
        return v


class BookingGuestUpdate(SQLModel):
    """Schema for updating a booking guest."""
    full_name: str | None = None
    passport_photo_path: str | None = None
    origin_city: str | None = None
    phone: str | None = None
    email: str | None = None


class BookingGuestPublic(BookingGuestBase):
    """Public schema for booking guest (API responses)."""
    id: uuid.UUID
    booking_id: uuid.UUID
    added_at: datetime

    # Include customer name for convenience
    customer_name: str | None = None


class BookingGuestsPublic(SQLModel):
    """List of booking guests."""
    data: list[BookingGuestPublic]
    count: int
