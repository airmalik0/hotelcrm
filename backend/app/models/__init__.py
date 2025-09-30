from .common import (
    UserRole,
    RoomType,
    RoomStatus,
    BookingStatus,
    PaymentMethod,
    CustomerTag,
    CampaignType,
    CampaignStatus,
    SMSStatus,
    Message,
    Token,
    TokenPayload,
)
from .user import (
    UserBase,
    UserCreate,
    UserRegister,
    UserUpdate,
    UserUpdateMe,
    UpdatePassword,
    User,
    UserPublic,
    UsersPublic,
)
from .room import (
    RoomBase,
    Room,
    RoomCreate,
    RoomUpdate,
    RoomPublic,
    RoomsPublic,
)
from .customer import (
    CustomerBase,
    Customer,
    CustomerCreate,
    CustomerUpdate,
    CustomerPublic,
    CustomersPublic,
)
from .booking import (
    BookingBase,
    Booking,
    BookingCreate,
    BookingUpdate,
    BookingPublic,
    BookingsPublic,
    DateModificationRequest,
    DiscountModificationRequest,
    RoomChangeRequest,
    PaymentAdjustmentResponse,
)
from .audit import (
    AuditLog,
    AuditLogPublic,
    AuditLogsPublic,
)
from .analytics import (
    AnalyticsFilter,
    AnalyticsResponse,
    AnalyticsExportRequest,
    DashboardMetrics,
    RevenueMetrics,
    OccupancyMetrics,
    PaymentDistribution,
    CustomerMetrics,
    GroupBy,
    TimePeriod,
    AgeGroup,
)
from .campaigns import (
    CampaignBase,
    Campaign,
    CampaignCreate,
    CampaignUpdate,
    CampaignPublic,
    CampaignsPublic,
    SMSHistory,
    SMSHistoryPublic,
    SMSHistoryList,
    CampaignExecutionRequest,
    CampaignExecutionResponse,
    CustomerPreviewResponse,
    TriggerCheckResponse,
)

from sqlmodel import SQLModel  # re-export for Alembic

# Auto-generated client trigger
