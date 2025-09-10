from enum import Enum

from sqlmodel import SQLModel


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    HOST = "host"


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


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None
