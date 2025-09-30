"""
Analytics models for metrics and reporting.
These are Pydantic models for API request/response, not database tables.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import Field, field_validator
from sqlmodel import SQLModel


class TimePeriod(str, Enum):
    """Predefined time periods for analytics."""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    CUSTOM = "custom"


class GroupBy(str, Enum):
    """Grouping options for analytics."""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    ROOM_TYPE = "room_type"
    ROOM = "room"
    PAYMENT_METHOD = "payment_method"
    DISTRICT = "district"
    AGE_GROUP = "age_group"


class AgeGroup(str, Enum):
    """Age group categories for customer analytics."""
    GROUP_18_25 = "18-25"
    GROUP_26_35 = "26-35"
    GROUP_36_45 = "36-45"
    GROUP_46_55 = "46-55"
    GROUP_55_PLUS = "55+"
    UNKNOWN = "unknown"


class AnalyticsFilter(SQLModel):
    """Filter parameters for analytics queries."""
    date_from: datetime
    date_to: datetime
    room_id: str | None = None  # Can be UUID or "all"
    room_type: str | None = None  # standard/vip/all
    customer_id: str | None = None
    district: str | None = None
    group_by: GroupBy | None = None
    include_cancelled: bool = Field(default=False, description="Include cancelled bookings in metrics")

    @field_validator('date_from', 'date_to')
    @classmethod
    def validate_dates(cls, v: datetime) -> datetime:
        """Ensure dates are timezone-aware (auto-convert naive to UTC)."""
        if v.tzinfo is None:
            # Auto-convert naive datetime to UTC for API compatibility
            from datetime import timezone
            return v.replace(tzinfo=timezone.utc)
        return v

    @field_validator('room_type')
    @classmethod
    def validate_room_type(cls, v: str | None) -> str | None:
        """Validate room type values."""
        if v is not None and v not in ["standard", "vip", "all"]:
            raise ValueError("room_type must be 'standard', 'vip', or 'all'")
        return v


class RevenueMetrics(SQLModel):
    """Revenue-related metrics."""
    total_revenue: float = Field(ge=0, description="Total revenue for the period")
    average_daily_rate: float = Field(ge=0, description="ADR - Average price per night")
    revenue_per_available_room: float = Field(ge=0, description="RevPAR")
    total_bookings: int = Field(ge=0, description="Number of bookings")
    total_nights: int = Field(ge=0, description="Total nights booked")
    discount_amount: float = Field(ge=0, description="Total discounts given")
    refund_amount: float = Field(ge=0, description="Total refunds")


class OccupancyMetrics(SQLModel):
    """Occupancy and utilization metrics."""
    occupancy_rate: float = Field(ge=0, le=100, description="Percentage of rooms occupied")
    average_length_of_stay: float = Field(ge=0, description="Average nights per booking")
    total_available_room_nights: int = Field(ge=0, description="Total room nights available")
    total_occupied_room_nights: int = Field(ge=0, description="Total room nights occupied")
    check_ins: int = Field(ge=0, description="Number of check-ins")
    check_outs: int = Field(ge=0, description="Number of check-outs")
    cancellations: int = Field(ge=0, description="Number of cancellations")


class PaymentDistribution(SQLModel):
    """Payment method distribution."""
    cash_percentage: float = Field(ge=0, le=100, description="Percentage of cash payments")
    transfer_percentage: float = Field(ge=0, le=100, description="Percentage of transfer payments")
    terminal_percentage: float = Field(ge=0, le=100, description="Percentage of terminal payments")
    cash_count: int = Field(ge=0, description="Number of cash payments")
    transfer_count: int = Field(ge=0, description="Number of transfer payments")
    terminal_count: int = Field(ge=0, description="Number of terminal payments")
    cash_amount: float = Field(ge=0, description="Total cash revenue")
    transfer_amount: float = Field(ge=0, description="Total transfer revenue")
    terminal_amount: float = Field(ge=0, description="Total terminal revenue")


class CustomerMetrics(SQLModel):
    """Customer-related metrics."""
    total_customers: int = Field(ge=0, description="Total unique customers")
    new_customers: int = Field(ge=0, description="New customers in period")
    returning_customers: int = Field(ge=0, description="Returning customers")
    average_age: float | None = Field(ge=0, le=150, description="Average customer age")
    district_distribution: dict[str, int] = Field(default_factory=dict, description="Customers by district")
    age_distribution: dict[str, int] = Field(default_factory=dict, description="Customers by age group")


class RoomTypeMetrics(SQLModel):
    """Metrics broken down by room type."""
    room_type: str
    revenue: float = Field(ge=0, description="Revenue for this room type")
    bookings: int = Field(ge=0, description="Number of bookings for this room type")
    occupancy_rate: float = Field(ge=0, le=100, description="Occupancy rate for this room type")
    average_rate: float = Field(ge=0, description="Average rate for this room type")


class TimeSeriesDataPoint(SQLModel):
    """Single data point in a time series."""
    date: str  # ISO format date string
    value: float
    label: str | None = None


class DashboardMetrics(SQLModel):
    """Combined metrics for dashboard view."""
    period: str = Field(description="Period description (e.g., 'Jan 2024 - Dec 2024')")
    revenue: RevenueMetrics
    occupancy: OccupancyMetrics
    payment_distribution: PaymentDistribution
    customer_metrics: CustomerMetrics
    room_type_breakdown: list[RoomTypeMetrics] = Field(default_factory=list)
    revenue_trend: list[TimeSeriesDataPoint] = Field(default_factory=list, description="Revenue over time")


class AnalyticsExportRequest(SQLModel):
    """Request model for exporting analytics."""
    filters: AnalyticsFilter
    format: str = Field(default="pdf", pattern="^(pdf|excel|csv)$")
    include_charts: bool = Field(default=False, description="Include charts in export")
    metrics_to_include: list[str] = Field(
        default_factory=lambda: ["revenue", "occupancy", "payment", "customers"],
        description="Which metric sections to include"
    )


class AnalyticsResponse(SQLModel):
    """Standard response wrapper for analytics endpoints."""
    success: bool = True
    data: Any
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    filters_applied: AnalyticsFilter | None = None
