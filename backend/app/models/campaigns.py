import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from pydantic import field_validator, model_validator
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from .common import CampaignStatus, CampaignType, SMSStatus

if TYPE_CHECKING:
    from .customer import Customer


class CampaignBase(SQLModel):
    """Base campaign model with shared properties and validations"""
    name: str = Field(max_length=255, index=True)
    type: CampaignType = Field(index=True)
    status: CampaignStatus = Field(default=CampaignStatus.DRAFT, index=True)
    message_template: str = Field(max_length=1000)

    # JSON criteria for flexible customer filtering (like payment_adjustments in booking)
    criteria: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON),
        description="JSON criteria for customer selection"
    )

    # Trigger-specific settings
    trigger_frequency_minutes: int | None = Field(
        default=None,
        ge=5,
        le=1440,  # Max 24 hours
        description="For trigger campaigns: check frequency in minutes"
    )

    @field_validator("message_template")
    @classmethod
    def validate_message_template(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message template cannot be empty")
        if len(v.strip()) < 10:
            raise ValueError("Message template must be at least 10 characters")
        return v.strip()

    @model_validator(mode="after")
    def validate_trigger_settings(self) -> "CampaignBase":
        """Validate trigger-specific requirements"""
        if self.type == CampaignType.TRIGGER:
            if not self.trigger_frequency_minutes:
                raise ValueError("Trigger campaigns must specify frequency_minutes")
        elif self.type == CampaignType.ONETIME:
            if self.trigger_frequency_minutes:
                raise ValueError("One-time campaigns cannot have frequency_minutes")
        return self


class Campaign(CampaignBase, table=True):
    """Campaign database model with relationships and audit fields"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )

    # Execution tracking
    last_executed_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True)),
        description="When campaign was last executed (for triggers)"
    )

    # Execution statistics
    total_sent: int = Field(default=0, ge=0, description="Total SMS sent")
    total_delivered: int = Field(default=0, ge=0, description="Total SMS delivered")
    total_failed: int = Field(default=0, ge=0, description="Total SMS failed")

    # Relationships
    sms_history: list["SMSHistory"] = Relationship(back_populates="campaign")

    def update_stats(self) -> None:
        """Update campaign statistics from SMS history"""
        # Note: This is only used when sms_history is already loaded
        # For production use, consider using SQL aggregation in CRUD layer
        if self.sms_history:
            self.total_sent = len([sms for sms in self.sms_history if sms.status in [SMSStatus.SENT, SMSStatus.DELIVERED, SMSStatus.MOCK]])
            self.total_delivered = len([sms for sms in self.sms_history if sms.status == SMSStatus.DELIVERED])
            self.total_failed = len([sms for sms in self.sms_history if sms.status == SMSStatus.FAILED])


class SMSHistory(SQLModel, table=True):
    """SMS sending history and audit log"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    campaign_id: uuid.UUID = Field(foreign_key="campaign.id", index=True)
    customer_id: uuid.UUID = Field(foreign_key="customer.id", index=True)

    # Message details
    message: str = Field(max_length=1000)
    status: SMSStatus = Field(index=True)

    # Timestamps
    sent_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    delivered_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )

    # Customer snapshot for historical accuracy
    customer_phone: str | None = Field(default=None, max_length=20)
    customer_name: str | None = Field(default=None, max_length=255)

    # Error details
    error_message: str | None = Field(default=None, max_length=500)

    # Provider metadata
    provider: str | None = Field(default="eskiz", max_length=50, index=True)
    provider_message_id: str | None = Field(default=None, max_length=100, index=True)
    provider_status: str | None = Field(default=None, max_length=50)
    error_code: str | None = Field(default=None, max_length=50)
    user_sms_id: str | None = Field(default=None, max_length=100, index=True)

    # Relationships
    campaign: Optional["Campaign"] = Relationship(back_populates="sms_history")
    customer: Optional["Customer"] = Relationship()


# API Schema Models (following BookingCreate/Update/Public pattern)

class CampaignCreate(CampaignBase):
    """Schema for creating new campaigns"""
    pass


class CampaignUpdate(SQLModel):
    """Schema for updating campaigns - all fields optional"""
    name: str | None = Field(default=None, max_length=255)
    type: CampaignType | None = None
    status: CampaignStatus | None = None
    message_template: str | None = Field(default=None, max_length=1000)
    criteria: dict[str, Any] | None = None
    trigger_frequency_minutes: int | None = Field(default=None, ge=5, le=1440)


class CampaignPublic(CampaignBase):
    """Public campaign schema for API responses"""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_executed_at: datetime | None = None

    # Statistics
    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0

    # Note: success_rate can be calculated on frontend: (total_delivered / total_sent) * 100


class CampaignsPublic(SQLModel):
    """Collection wrapper for campaigns list API"""
    data: list[CampaignPublic]
    count: int


# Request/Response Models for specialized operations

class CampaignExecutionRequest(SQLModel):
    """Request model for executing one-time campaigns"""
    test_mode: bool = Field(default=False, description="Execute in test mode (mock SMS)")


class CampaignExecutionResponse(SQLModel):
    """Response model for campaign execution"""
    campaign_id: uuid.UUID
    execution_type: str  # "onetime" or "trigger_check"
    customers_matched: int
    sms_sent: int
    sms_failed: int
    test_mode: bool = False
    execution_summary: dict[str, Any] = Field(default_factory=dict)


class CustomerPreviewResponse(SQLModel):
    """Response model for campaign recipient preview"""
    campaign_id: uuid.UUID
    total_matching_customers: int
    preview_customers: list[dict[str, Any]]  # Customer preview data
    criteria_applied: dict[str, Any]


class TriggerCheckResponse(SQLModel):
    """Response model for trigger campaign checks"""
    campaigns_checked: int
    campaigns_executed: int
    total_sms_sent: int
    execution_details: list[dict[str, Any]] = Field(default_factory=list)


class SMSHistoryPublic(SQLModel):
    """Public SMS history schema"""
    id: uuid.UUID
    campaign_id: uuid.UUID
    customer_id: uuid.UUID
    message: str
    status: SMSStatus
    sent_at: datetime
    delivered_at: datetime | None = None
    customer_phone: str | None = None
    customer_name: str | None = None
    error_message: str | None = None


class SMSHistoryList(SQLModel):
    """Collection wrapper for SMS history"""
    data: list[SMSHistoryPublic]
    count: int
