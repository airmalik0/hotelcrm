import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import field_validator, model_validator
from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from .common import District

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
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)

    # Required fields for all guests
    passport_photo_path: str = Field(
        max_length=500,
        description="Path to passport photo (required for all guests)"
    )

    # Geographic fields (same logic as customers)
    country_code: str | None = Field(default=None, max_length=2, description="ISO-3166 alpha-2 code (e.g., UZ)")
    region: str | None = Field(default=None, max_length=64)
    district: District | None = None

    # Optional contact information
    phone: str | None = Field(default=None, max_length=20)

    # Guest role
    is_primary: bool = Field(
        default=False,
        description="True if this is the primary guest (booking holder)"
    )

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty if provided")
            return v.title()
        return v

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        v_norm = v.strip().upper()
        if len(v_norm) != 2:
            raise ValueError("country_code must be ISO-3166 alpha-2 (2 letters)")
        return v_norm

    @field_validator("region")
    @classmethod
    def normalize_region(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        # Store in upper-case with underscores for consistency
        import re as _re
        return _re.sub(r"\s+", "_", v.strip()).upper()

    @model_validator(mode="before")
    @classmethod
    def validate_geo_consistency(cls, data):  # type: ignore[no-untyped-def]
        """Replicate customers' geo consistency rules.

        - If country != UZ → region and district must be None
        - If country == UZ and region != TASHKENT_CITY → district must be None
        - If district is set but country/region are missing → set UZ/TASHKENT_CITY
        """
        if not isinstance(data, dict):
            try:
                data = data.model_dump()
            except AttributeError:
                return data

        country = data.get("country_code")
        region = data.get("region")
        district = data.get("district")

        if district is not None and not country and not region:
            data["country_code"] = "UZ"
            data["region"] = "TASHKENT_CITY"

        country = data.get("country_code")
        region = data.get("region")

        if country and country != "UZ":
            data["region"] = None
            data["district"] = None
        elif country == "UZ":
            if region and region != "TASHKENT_CITY":
                data["district"] = None
        return data


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
    first_name: str | None = None
    last_name: str | None = None
    passport_photo_path: str
    country_code: str | None = None
    region: str | None = None
    district: District | None = None
    phone: str | None = None
    is_primary: bool = False

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty if provided")
            return v.title()
        return v

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        v_norm = v.strip().upper()
        if len(v_norm) != 2:
            raise ValueError("country_code must be ISO-3166 alpha-2 (2 letters)")
        return v_norm

    @field_validator("region")
    @classmethod
    def normalize_region(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        import re as _re
        return _re.sub(r"\s+", "_", v.strip()).upper()

    @model_validator(mode="before")
    @classmethod
    def ensure_name_or_customer(cls, data):  # type: ignore[no-untyped-def]
        # If customer_id is not provided, require first_name and last_name
        if not isinstance(data, dict):
            return data
        if not data.get("customer_id"):
            if not data.get("first_name") or not data.get("last_name"):
                raise ValueError("first_name and last_name are required when customer_id is not provided")
        # Geo consistency like in base validator
        country = data.get("country_code")
        region = data.get("region")
        district = data.get("district")
        if district is not None and not country and not region:
            data["country_code"] = "UZ"
            data["region"] = "TASHKENT_CITY"
        if country and country != "UZ":
            data["region"] = None
            data["district"] = None
        elif country == "UZ":
            if region and region != "TASHKENT_CITY":
                data["district"] = None
        return data


class BookingGuestUpdate(SQLModel):
    """Schema for updating a booking guest."""
    first_name: str | None = None
    last_name: str | None = None
    passport_photo_path: str | None = None
    country_code: str | None = None
    region: str | None = None
    district: District | None = None
    phone: str | None = None


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
