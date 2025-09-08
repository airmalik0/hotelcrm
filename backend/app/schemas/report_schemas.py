import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ReportType(str, Enum):
    OCCUPANCY_STANDARD = "occupancy_standard"
    OCCUPANCY_DAILY_PATTERN = "occupancy_daily_pattern"
    OCCUPANCY_WEEKLY_PATTERN = "occupancy_weekly_pattern"
    OCCUPANCY_SEASONAL_TREND = "occupancy_seasonal_trend"
    REVENUE = "revenue"
    TOP_CUSTOMERS = "top_customers"
    REPEAT_GUEST_RATE = "repeat_guest_rate"
    PAYMENT_METHODS = "payment_methods"
    GEOGRAPHIC_ANALYSIS = "geographic_analysis"


class ReportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"


class GroupByPeriod(str, Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportGenerationRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    room_type: str | None = Field(default=None, description="all|standard|vip")
    room_id: uuid.UUID | None = None
    group_by: GroupByPeriod = GroupByPeriod.DAY
    format: ReportFormat = ReportFormat.JSON
    include_charts: bool = False

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v),
        }


class TopCustomersRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    limit: int = Field(default=10, ge=1, le=100)
    sort_by: str = Field(default="revenue", pattern="^(revenue|bookings)$")
    format: ReportFormat = ReportFormat.JSON


class ReportJobResponse(BaseModel):
    job_id: uuid.UUID
    status: JobStatus
    message: str | None = None

    class Config:
        json_encoders = {
            uuid.UUID: lambda v: str(v),
        }


class ReportJobStatus(BaseModel):
    job_id: uuid.UUID
    status: JobStatus
    progress: int = Field(ge=0, le=100)
    message: str | None = None
    result_path: str | None = None
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v),
        }


class ReportMetadata(BaseModel):
    job_id: uuid.UUID
    report_type: ReportType
    format: ReportFormat
    parameters: dict[str, Any]
    created_at: datetime
    file_path: str | None = None
    file_size: int | None = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v),
        }


class ReportListResponse(BaseModel):
    reports: list[ReportMetadata]
    total: int


class OccupancyReportData(BaseModel):
    period: str
    period_label: str
    total_bookings: int
    unique_rooms: int
    total_rooms: int
    occupancy_rate: float


class RevenueReportData(BaseModel):
    period: str
    period_label: str
    total_revenue: float
    booking_count: int
    avg_booking_value: float


class CustomerReportData(BaseModel):
    customer_id: str
    full_name: str
    phone: str | None
    district: str | None
    total_revenue: float
    booking_count: int
    first_booking: str | None
    last_booking: str | None


class PaymentMethodsReportData(BaseModel):
    period: str
    period_label: str
    cash: dict[str, Any]
    terminal: dict[str, Any]
    transfer: dict[str, Any]
    total_bookings: int
    total_amount: float


class GeographicReportData(BaseModel):
    district: str
    customer_count: int
    booking_count: int
    total_revenue: float
    avg_booking_value: float
