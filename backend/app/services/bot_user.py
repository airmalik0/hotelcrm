"""BotUser service for business logic and context generation"""
import logging
import re
import uuid
from typing import Any

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.exceptions import NotFoundError
from app.crud.bot_session import bot_session as crud_bot_session
from app.crud.bot_user import bot_user as crud_bot_user
from app.crud.customer import customer as crud_customer
from app.models import Booking, BookingGuest, BotUser, Customer

logger = logging.getLogger(__name__)


def normalize_phone_for_search(phone: str) -> str:
    """
    Normalize phone number for search by removing all non-digit characters.
    
    This ensures that phones stored in different formats (+998..., 998..., etc.)
    can be found regardless of format.
    
    Args:
        phone: Phone number in any format (E164, with/without +, etc.)
        
    Returns:
        Phone number with only digits
    """
    if not phone:
        return ""
    # Remove all non-digit characters
    return re.sub(r'\D', '', phone)


class BotUserService:
    """Service for bot user operations and context generation"""

    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_bot_user
        self.crud_session = crud_bot_session

    def get_bot_user_by_telegram_id(self, telegram_id: int) -> BotUser | None:
        """Get bot user by telegram_id (via active session)"""
        session_obj = self.crud_session.get_by_telegram_id(self.session, telegram_id=telegram_id)
        if not session_obj:
            return None
        return self.crud.get(self.session, id=session_obj.bot_user_id)

    def get_bot_user_or_404(self, telegram_id: int) -> BotUser:
        """Get bot user by telegram_id or raise NotFoundError."""
        user = self.get_bot_user_by_telegram_id(telegram_id)
        if not user:
            raise NotFoundError("BotUser session", str(telegram_id))
        return user

    def get_customer_by_phone(self, phone: str) -> Customer | None:
        """
        Find customer by normalized phone number using CRUD layer.
        
        Normalizes phone to digits-only format before search to handle
        format differences (E164 with + vs digits-only).
        """
        try:
            # Normalize phone to digits-only for comparison
            # Customer.phone is stored as digits-only (validated in Customer model)
            normalized_phone = normalize_phone_for_search(phone)
            
            customer = crud_customer.get_by_phone(self.session, phone=normalized_phone)

            if customer:
                logger.info(f"Found customer {customer.id} for phone {phone} (normalized: {normalized_phone})")
            else:
                logger.info(f"No customer found for phone {phone} (normalized: {normalized_phone})")

            return customer
        except Exception as e:
            logger.error(f"Error getting customer by phone {phone}: {e}")
            return None

    def get_customer_bookings(
        self, customer_id: uuid.UUID, limit: int = 10
    ) -> list[Booking]:
        """Get recent bookings for a customer."""
        try:
            stmt = (
                select(Booking)
                .options(selectinload(Booking.room))  # type: ignore[arg-type]
                .where(Booking.customer_id == customer_id)
                .order_by(Booking.check_in.desc())  # type: ignore
                .limit(limit)
            )
            bookings = list(self.session.exec(stmt).all())

            logger.info(f"Found {len(bookings)} bookings for customer {customer_id}")
            return bookings
        except Exception as e:
            logger.error(f"Error getting bookings for customer {customer_id}: {e}")
            return []

    def get_guest_bookings_by_phone(self, phone: str, limit: int = 10) -> list[Booking]:
        """
        Get bookings where person is listed as guest.
        
        Normalizes phone to digits-only format and searches for both
        normalized and original format to handle format inconsistencies.
        """
        try:
            # Normalize phone to digits-only
            normalized_phone = normalize_phone_for_search(phone)
            
            # Search for bookings where guest phone matches normalized or original format
            # BookingGuest.phone may be stored in different formats (with/without +)
            # Use PostgreSQL regexp_replace to normalize on the fly for comparison
            from sqlalchemy import func, or_
            
            # Build OR conditions for different phone formats
            conditions = [
                # Match normalized phone (digits-only) using regexp_replace
                func.regexp_replace(
                    func.coalesce(BookingGuest.phone, ''),
                    r'\D',
                    '',
                    'g'
                ) == normalized_phone,
                # Also try direct match for normalized format (in case it's already stored normalized)
                BookingGuest.phone == normalized_phone,
            ]
            
            # Add original format match if different from normalized
            if phone and phone != normalized_phone:
                conditions.append(BookingGuest.phone == phone)
            
            stmt = (
                select(Booking)
                .join(BookingGuest)
                .options(selectinload(Booking.room))  # type: ignore[arg-type]
                .where(or_(*conditions))
                .order_by(Booking.check_in.desc())  # type: ignore
                .limit(limit)
            )
            bookings = list(self.session.exec(stmt).all())

            logger.info(f"Found {len(bookings)} guest bookings for phone {phone} (normalized: {normalized_phone})")
            return bookings
        except Exception as e:
            logger.error(f"Error getting guest bookings for phone {phone}: {e}")
            return []

    def format_bookings_for_context(self, bookings: list[Booking]) -> dict[str, Any]:
        """
        Format bookings for AI bot context.

        Returns:
            {
                "booking_dates": ["01.10.2025", "24.09.2025", ...],
                "bookings_info": [
                    {
                        "check_in": "01.10.2025",           # Запланированная дата заезда
                        "check_out": "05.10.2025",          # Запланированная дата выезда
                        "actual_check_in": "01.10.2025 14:30",  # Фактическая дата/время заезда
                        "actual_check_out": "05.10.2025 12:00", # Фактическая дата/время выезда
                        "room": "101",
                        "status": "checked_out",
                        "total_amount": 50000.0,
                        "nights": 4
                    },
                    ...
                ]
            }
        """
        booking_dates = []
        bookings_info = []

        for booking in bookings:
            try:
                # Format planned dates as DD.MM.YYYY
                check_in_str = booking.check_in.strftime("%d.%m.%Y")
                check_out_str = booking.check_out.strftime("%d.%m.%Y")

                # Format actual dates with time if available
                actual_check_in_str = None
                if booking.actual_check_in:
                    actual_check_in_str = booking.actual_check_in.strftime("%d.%m.%Y %H:%M")

                actual_check_out_str = None
                if booking.actual_check_out:
                    actual_check_out_str = booking.actual_check_out.strftime("%d.%m.%Y %H:%M")

                # Get room number
                room_number = "N/A"
                if booking.room:
                    room_number = str(booking.room.room_number)

                # Get status
                status = booking.status.value if booking.status else "unknown"

                # Calculate number of nights
                nights = max(1, (booking.check_out.date() - booking.check_in.date()).days)

                booking_dates.append(check_in_str)
                booking_info = {
                    "check_in": check_in_str,
                    "check_out": check_out_str,
                    "room": room_number,
                    "status": status,
                    "total_amount": float(booking.total_amount),
                    "nights": nights,
                }

                # Add actual dates only if they exist
                if actual_check_in_str:
                    booking_info["actual_check_in"] = actual_check_in_str
                if actual_check_out_str:
                    booking_info["actual_check_out"] = actual_check_out_str

                bookings_info.append(booking_info)
            except Exception as e:
                logger.error(f"Error formatting booking {booking.id}: {e}")
                continue

        logger.info(f"Formatted {len(bookings_info)} bookings for bot context")

        return {"booking_dates": booking_dates, "bookings_info": bookings_info}

    def generate_user_context(self, phone: str) -> dict[str, Any]:
        """
        Generate full context for a phone number (customer + guest bookings).

        Args:
            phone: Normalized phone number

        Returns:
            Dictionary with booking data for AI context
        """
        try:
            all_bookings = []

            # Check if customer exists with this phone
            customer = self.get_customer_by_phone(phone)
            if customer:
                # Get customer's bookings
                customer_bookings = self.get_customer_bookings(customer.id, limit=5)
                all_bookings.extend(customer_bookings)

            # Also check if person was a guest in other bookings
            guest_bookings = self.get_guest_bookings_by_phone(phone, limit=5)
            all_bookings.extend(guest_bookings)

            # Remove duplicates (if person was both customer and guest)
            unique_bookings = list({b.id: b for b in all_bookings}.values())

            # Sort by date
            unique_bookings.sort(key=lambda b: b.check_in, reverse=True)

            # Take only last 5
            recent_bookings = unique_bookings[:5]

            return self.format_bookings_for_context(recent_bookings)
        except Exception as e:
            logger.error(f"Error generating context for phone {phone}: {e}")
            return {"booking_dates": [], "bookings_info": []}

    def create_or_get_bot_user(self, phone: str, name: str, language: str = "ru") -> BotUser:
        """Create or get bot user by phone"""
        from app.models import BotUserCreate

        user = self.crud.get_by_phone(self.session, phone=phone)
        if user:
            # Update existing user
            user.name = name
            user.language = language
            self.session.add(user)
            self.session.flush()
            logger.info(f"Updated existing bot user for phone {phone}")
            return user

        # Create new user
        user_in = BotUserCreate(
            phone=phone,
            name=name,
            language=language
        )
        user = self.crud.create(self.session, obj_in=user_in)
        logger.info(f"Created new bot user for phone {phone}")
        return user

    def create_session(
        self,
        telegram_id: int,
        bot_user_id: uuid.UUID,
        username: str | None = None,
        first_name: str = "",
        last_name: str | None = None,
        language_code: str | None = None
    ) -> None:
        """Create or update session for telegram_id with Telegram metadata"""
        from app.models import BotSessionCreate

        # Delete existing session for this telegram_id
        self.crud_session.delete_by_telegram_id(self.session, telegram_id=telegram_id)

        # Create new session with Telegram metadata
        session_in = BotSessionCreate(
            telegram_id=telegram_id,
            bot_user_id=bot_user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            language_code=language_code
        )
        self.crud_session.create(self.session, obj_in=session_in)
        logger.info(f"Created session for telegram_id {telegram_id} (@ {username}) → bot_user_id {bot_user_id}")

    def delete_session(self, telegram_id: int) -> bool:
        """Delete session (logout)"""
        success = self.crud_session.delete_by_telegram_id(self.session, telegram_id=telegram_id)
        if success:
            logger.info(f"Deleted session for telegram_id {telegram_id}")
        return success
