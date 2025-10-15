"""Customer inquiry models - pure Pydantic (no SQLModel/DB)"""
import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class InquiryType(str, Enum):
    """Type of customer inquiry"""
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"
    QUESTION = "question"


class InquiryStatus(str, Enum):
    """Status of inquiry processing"""
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class InquiryPriority(str, Enum):
    """Priority level of inquiry"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CustomerInquiryCreate(BaseModel):
    """Data for creating a customer inquiry via API"""
    bot_user_id: uuid.UUID = Field(description="Bot user who created inquiry")
    customer_id: uuid.UUID | None = Field(default=None, description="Linked CRM customer (if found)")
    booking_id: uuid.UUID | None = Field(default=None, description="Related booking (if specified)")
    inquiry_type: InquiryType = Field(description="Type of inquiry")
    message: str = Field(description="Inquiry message text")
    status: InquiryStatus = Field(default=InquiryStatus.NEW, description="Processing status")
    priority: InquiryPriority = Field(default=InquiryPriority.MEDIUM, description="Priority level")
    inquiry_date: datetime = Field(description="Date when inquiry was made")
    related_booking_date: datetime | None = Field(default=None, description="Date of booking being discussed")


class CustomerInquiryPublic(BaseModel):
    """Customer inquiry response from API"""
    id: uuid.UUID
    bot_user_id: uuid.UUID
    customer_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    inquiry_type: InquiryType
    message: str
    status: InquiryStatus
    priority: InquiryPriority
    inquiry_date: datetime
    related_booking_date: datetime | None = None
    assigned_to: uuid.UUID | None = None
    resolved_at: datetime | None = None
    resolution_notes: str | None = None
    created_at: datetime
    updated_at: datetime
    # Optional enriched fields from backend
    bot_user_name: str | None = None
    customer_name: str | None = None
    assigned_user_name: str | None = None


class CustomerInquiriesPublic(BaseModel):
    """List of customer inquiries from API"""
    data: list[CustomerInquiryPublic]
    count: int
