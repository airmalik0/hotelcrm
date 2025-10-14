from .common import (
    UserRole,
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
from .room_category import (
    RoomCategoryBase,
    RoomCategory,
    RoomCategoryCreate,
    RoomCategoryUpdate,
    RoomCategoryPublic,
    RoomCategoriesPublic,
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
from .booking_guest import (
    BookingGuestBase,
    BookingGuest,
    BookingGuestCreate,
    BookingGuestUpdate,
    BookingGuestPublic,
    BookingGuestsPublic,
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
from .expense import (
    ExpenseCategoryBase,
    ExpenseCategory,
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCategoryPublic,
    ExpenseCategoriesPublic,
    ExpenseBase,
    Expense,
    ExpenseCreate,
    ExpenseUpdate,
    ExpensePublic,
    ExpensesPublic,
)
from .bot_user import (
    BotUserBase,
    BotUser,
    BotUserCreate,
    BotUserUpdate,
    BotUserPublic,
    BotUsersPublic,
)
from .customer_inquiry import (
    InquiryType,
    InquiryStatus,
    InquiryPriority,
    CustomerInquiryBase,
    CustomerInquiry,
    CustomerInquiryCreate,
    CustomerInquiryUpdate,
    CustomerInquiryPublic,
    CustomerInquiriesPublic,
)

from sqlmodel import SQLModel  # re-export for Alembic

# Auto-generated client trigger
