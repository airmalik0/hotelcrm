import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, Text
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .booking import Booking
    from .bot_user import BotUser
    from .customer import Customer
    from .user import User


class InquiryType(str, Enum):
    """Type of customer inquiry."""
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"
    QUESTION = "question"


class InquiryStatus(str, Enum):
    """Status of inquiry processing."""
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class InquiryPriority(str, Enum):
    """Priority level of inquiry."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CustomerInquiryBase(SQLModel):
    bot_user_id: uuid.UUID = Field(foreign_key="bot_users.id", index=True, description="Bot user who created inquiry")
    customer_id: uuid.UUID | None = Field(default=None, foreign_key="customer.id", index=True, description="Linked CRM customer (if found by phone)")
    booking_id: uuid.UUID | None = Field(default=None, foreign_key="booking.id", index=True, description="Related booking (if specified)")

    inquiry_type: InquiryType = Field(description="Type of inquiry")
    message: str = Field(sa_column=Column(Text), description="Inquiry message text")

    status: InquiryStatus = Field(default=InquiryStatus.NEW, index=True, description="Processing status")
    priority: InquiryPriority = Field(default=InquiryPriority.MEDIUM, description="Priority level")

    inquiry_date: datetime = Field(sa_column=Column(DateTime(timezone=True)), description="Date when inquiry was made")
    related_booking_date: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)), description="Date of booking being discussed")

    assigned_to: uuid.UUID | None = Field(default=None, foreign_key="user.id", description="Staff member assigned to handle inquiry")
    resolved_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True)), description="When inquiry was resolved")
    resolution_notes: str | None = Field(default=None, sa_column=Column(Text), description="Notes about resolution")


class CustomerInquiry(CustomerInquiryBase, table=True):
    __tablename__ = "customer_inquiries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))

    # Relationships
    bot_user: "BotUser" = Relationship(back_populates="inquiries")
    customer: Optional["Customer"] = Relationship()
    booking: Optional["Booking"] = Relationship()
    assigned_user: Optional["User"] = Relationship()


class CustomerInquiryCreate(SQLModel):
    bot_user_id: uuid.UUID
    customer_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    inquiry_type: InquiryType
    message: str
    status: InquiryStatus = InquiryStatus.NEW
    priority: InquiryPriority = InquiryPriority.MEDIUM
    inquiry_date: datetime
    related_booking_date: datetime | None = None


class CustomerInquiryUpdate(SQLModel):
    status: InquiryStatus | None = None
    priority: InquiryPriority | None = None
    assigned_to: uuid.UUID | None = None
    resolved_at: datetime | None = None
    resolution_notes: str | None = None
    booking_id: uuid.UUID | None = None


class CustomerInquiryPublic(CustomerInquiryBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    # Include related data for convenience
    bot_user_name: str | None = None
    customer_name: str | None = None
    assigned_user_name: str | None = None


class CustomerInquiriesPublic(SQLModel):
    data: list[CustomerInquiryPublic]
    count: int
