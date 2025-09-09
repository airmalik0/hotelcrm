import re
import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from pydantic import field_validator, model_validator
from pydantic_core import core_schema
from sqlalchemy import JSON, Column, ForeignKey, Uuid
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    pass


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    HOST = "host"


# Shared properties
class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: "UserRole" = Field(default=UserRole.HOST)

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
    STANDARD = "standard"
    VIP = "vip"


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


class PaymentMethod(str, Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    TERMINAL = "terminal"


class CustomerTag(str, Enum):
    LOYAL = "loyal"
    VIP = "vip"
    PROBLEMATIC = "problematic"


# Room models
class RoomBase(SQLModel):
    room_number: str = Field(unique=True, index=True, min_length=1, max_length=10)
    floor: int = Field(ge=1, le=20)
    room_type: RoomType
    price_per_night: float = Field(gt=0, le=100000)  # Max price limit for sanity
    status: RoomStatus = Field(default=RoomStatus.AVAILABLE)
    description: str | None = Field(default=None, max_length=500)
    room_photo_paths: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Room number cannot be empty")
        # Allow alphanumeric with optional floor/section indicators
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9-]*$", v.strip()):
            raise ValueError("Room number must start with letter or number and contain only letters, numbers, and hyphens")
        return v.strip().upper()  # Normalize to uppercase


class Room(RoomBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    bookings: list["Booking"] = Relationship(back_populates="room")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def is_status_transition_valid(self, new_status: RoomStatus) -> bool:
        """Check if a room status transition is valid."""
        # Define valid transitions
        valid_transitions = {
            RoomStatus.AVAILABLE: [RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE, RoomStatus.CLEANING],
            RoomStatus.OCCUPIED: [RoomStatus.CLEANING],  # Must go through cleaning after occupied
            RoomStatus.CLEANING: [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
            RoomStatus.MAINTENANCE: [RoomStatus.AVAILABLE, RoomStatus.CLEANING],
        }
        return new_status in valid_transitions.get(self.status, [])

    def get_next_status_after_checkout(self) -> RoomStatus:
        """Get the next status after a room is checked out."""
        return RoomStatus.CLEANING  # Always go to cleaning after checkout


class RoomCreate(RoomBase):
    pass


class RoomUpdate(SQLModel):
    room_number: str | None = None
    floor: int | None = None
    room_type: RoomType | None = None
    price_per_night: float | None = None
    status: RoomStatus | None = None
    description: str | None = None
    room_photo_paths: list[str] | None = None


class RoomPublic(RoomBase):
    id: uuid.UUID
    created_at: datetime


# Customer models
class CustomerBase(SQLModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=20, unique=True, index=True)  # Index for faster lookups
    date_of_birth: datetime | None = None
    district: str | None = Field(default=None, max_length=200)
    passport_photo_path: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        # Strip whitespace and ensure proper capitalization
        return v.strip().title()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v:
            # Remove all non-digit characters for validation
            digits_only = re.sub(r'\D', '', v)
            if len(digits_only) < 7 or len(digits_only) > 15:
                raise ValueError("Phone number must contain between 7 and 15 digits")
            # Store normalized format with original formatting preserved
            return v.strip()
        return v


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
    phone: str | None = None
    date_of_birth: datetime | None = None
    district: str | None = None
    passport_photo_path: str | None = None
    tags: list[str] | None = None
    notes: str | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Name cannot be empty")
            # Strip whitespace and ensure proper capitalization
            return v.strip().title()
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v:
            # Remove all non-digit characters for validation
            digits_only = re.sub(r'\D', '', v)
            if len(digits_only) < 7 or len(digits_only) > 15:
                raise ValueError("Phone number must contain between 7 and 15 digits")
            # Store normalized format with original formatting preserved
            return v.strip()
        return v


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
    total_amount: float = Field(gt=0, le=1000000)  # Max amount limit for sanity
    discount: float = Field(default=0.0, ge=0, le=100)
    discount_reason: str | None = Field(default=None, max_length=500)
    payment_method: PaymentMethod = Field(default=PaymentMethod.CASH)
    registration_need: bool = Field(default=True)

    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: datetime, info: core_schema.FieldValidationInfo) -> datetime:
        # Safely check if check_in exists in the data
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
    booking_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def calculate_total_amount(self, room_price_per_night: float) -> float:
        """Calculate total amount for the booking based on room price and discount."""
        # Calculate nights (minimum 1 night even for same-day checkout)
        nights = (self.check_out.date() - self.check_in.date()).days
        nights = max(1, nights)

        subtotal = room_price_per_night * nights
        discount_amount = subtotal * (self.discount / 100) if self.discount else 0
        total = subtotal - discount_amount

        # Ensure total is positive
        return max(0.0, total)

    def is_status_transition_valid(self, new_status: BookingStatus) -> bool:
        """Check if a status transition is valid."""
        valid_transitions = {
            BookingStatus.CONFIRMED: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED],
            BookingStatus.CHECKED_IN: [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED],
            BookingStatus.CHECKED_OUT: [],  # Cannot change from checked-out
            BookingStatus.CANCELLED: [],  # Cannot change from cancelled
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


# Audit Log models
class AuditLog(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True,
        )
    )
    action: str = Field(max_length=50, index=True)  # Index for filtering
    entity_type: str = Field(max_length=50, index=True)  # Index for filtering
    entity_id: uuid.UUID
    entity_name: str = Field(max_length=255)
    description: str = Field(max_length=1000)
    old_values: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    new_values: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)  # Index for sorting

    # Relationship to get current username (no back_populates as User doesn't have audit_logs field)
    user: Optional["User"] = Relationship()


class AuditLogPublic(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    username: str  # Include username from relationship
    action: str
    entity_type: str
    entity_id: uuid.UUID
    entity_name: str
    description: str
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    timestamp: datetime


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


class AuditLogsPublic(SQLModel):
    data: list[AuditLogPublic]
    count: int


# Report and Export Models


class ReportJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ReportJobType(str, Enum):
    BOOKING_SUMMARY = "booking_summary"
    CUSTOMER_REPORT = "customer_report"
    ROOM_OCCUPANCY = "room_occupancy"
    REVENUE_REPORT = "revenue_report"
    AUDIT_LOG_EXPORT = "audit_log_export"
    FULL_DATA_EXPORT = "full_data_export"


class ReportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"


# Report Job models
class ReportJobBase(SQLModel):
    type: ReportJobType
    status: ReportJobStatus = Field(default=ReportJobStatus.PENDING)
    format: ReportFormat = Field(default=ReportFormat.JSON)
    params: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    error_message: str | None = Field(default=None, max_length=1000)
    progress: int = Field(default=0, ge=0, le=100)
    result_path: str | None = Field(default=None, max_length=500)
    result_size: int | None = Field(default=None)  # File size in bytes


class ReportJob(ReportJobBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True,
        )
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    expires_at: datetime | None = None  # When the report file will be deleted

    # Relationships
    user: Optional["User"] = Relationship()
    history_entries: list["ReportHistory"] = Relationship(back_populates="job")

    def is_expired(self) -> bool:
        """Check if the report has expired."""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return False

    def can_transition_to(self, new_status: ReportJobStatus) -> bool:
        """Check if status transition is valid."""
        valid_transitions = {
            ReportJobStatus.PENDING: [ReportJobStatus.PROCESSING, ReportJobStatus.CANCELLED],
            ReportJobStatus.PROCESSING: [ReportJobStatus.COMPLETED, ReportJobStatus.FAILED, ReportJobStatus.CANCELLED],
            ReportJobStatus.COMPLETED: [],  # Cannot change from completed
            ReportJobStatus.FAILED: [ReportJobStatus.PENDING],  # Can retry
            ReportJobStatus.CANCELLED: [],  # Cannot change from cancelled
        }
        return new_status in valid_transitions.get(self.status, [])


class ReportJobCreate(SQLModel):
    type: ReportJobType
    format: ReportFormat = Field(default=ReportFormat.JSON)
    params: dict[str, Any] | None = None


class ReportJobUpdate(SQLModel):
    status: ReportJobStatus | None = None
    error_message: str | None = None
    progress: int | None = None
    result_path: str | None = None
    result_size: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    expires_at: datetime | None = None


class ReportJobPublic(ReportJobBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    expires_at: datetime | None


# Report History models (for tracking downloads and access)
class ReportHistoryBase(SQLModel):
    action: str = Field(max_length=50, index=True)  # downloaded, viewed, deleted
    ip_address: str | None = Field(default=None, max_length=45)  # IPv6 max length
    user_agent: str | None = Field(default=None, max_length=500)


class ReportHistory(ReportHistoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("reportjob.id", ondelete="CASCADE"),
            index=True,
        )
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True,
        )
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Relationships
    job: Optional["ReportJob"] = Relationship(back_populates="history_entries")
    user: Optional["User"] = Relationship()


class ReportHistoryPublic(ReportHistoryBase):
    id: uuid.UUID
    job_id: uuid.UUID
    user_id: uuid.UUID
    timestamp: datetime


# List responses
class ReportJobsPublic(SQLModel):
    data: list[ReportJobPublic]
    count: int


class ReportHistoriesPublic(SQLModel):
    data: list[ReportHistoryPublic]
    count: int
