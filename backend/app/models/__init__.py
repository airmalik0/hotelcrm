from .common import (
    UserRole,
    RoomType,
    RoomStatus,
    BookingStatus,
    PaymentMethod,
    CustomerTag,
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
)
from .audit import (
    AuditLog,
    AuditLogPublic,
    AuditLogsPublic,
)

from sqlmodel import SQLModel  # re-export for Alembic

# Auto-generated client trigger
