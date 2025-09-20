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


class PaymentAdjustmentType(str, Enum):
    """Types of payment adjustments for bookings"""
    ROOM_CHANGE = "room_change"  # Room upgrade/downgrade
    DATE_MODIFICATION = "date_modification"  # Extended/shortened stay
    DISCOUNT_CHANGE = "discount_change"  # Discount applied/modified
    EARLY_CHECKOUT = "early_checkout"  # Guest left early (with refund)
    LATE_CHECKIN = "late_checkin"  # Guest arrived late
    DAMAGE_CHARGE = "damage_charge"  # Room damage charges
    SERVICE_CHARGE = "service_charge"  # Additional services
    CANCELLATION_FEE = "cancellation_fee"  # Cancellation penalty
    MANUAL_ADJUSTMENT = "manual_adjustment"  # Manual correction by staff


class District(str, Enum):
    """Districts of Tashkent - stored as uppercase in DB"""
    ALMAZAR = "ALMAZAR"
    BEKTEMIR = "BEKTEMIR"
    MIRABAD = "MIRABAD"
    MIRZO_ULUGBEK = "MIRZO_ULUGBEK"
    SERGELI = "SERGELI"
    UCHTEPA = "UCHTEPA"
    CHILANZAR = "CHILANZAR"
    SHAYKHANTAKHUR = "SHAYKHANTAKHUR"
    YUNUSABAD = "YUNUSABAD"
    YAKKASARAY = "YAKKASARAY"
    YASHNABAD = "YASHNABAD"
    YANGIHAYOT = "YANGIHAYOT"


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None
