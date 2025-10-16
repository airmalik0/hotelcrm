"""BotUser service for business logic and context generation"""
import logging
import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.exceptions import NotFoundError
from app.crud.bot_session import bot_session as crud_bot_session
from app.crud.bot_user import bot_user as crud_bot_user
from app.crud.customer import customer as crud_customer
from app.models import Booking, BookingGuest, BotUser, Customer

logger = logging.getLogger(__name__)


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
        """Find customer by normalized phone number using CRUD layer."""
        try:
            customer = crud_customer.get_by_phone(self.session, phone=phone)

            if customer:
                logger.info(f"Found customer {customer.id} for phone {phone}")
            else:
                logger.info(f"No customer found for phone {phone}")

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
        """Get bookings where person is listed as guest."""
        try:
            stmt = (
                select(Booking)
                .join(BookingGuest)
                .where(BookingGuest.phone == phone)
                .order_by(Booking.check_in.desc())  # type: ignore
                .limit(limit)
            )
            bookings = list(self.session.exec(stmt).all())

            logger.info(f"Found {len(bookings)} guest bookings for phone {phone}")
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
                    {"date": "01.10.2025", "room": "101", "status": "checked_out"},
                    ...
                ]
            }
        """
        booking_dates = []
        bookings_info = []

        for booking in bookings:
            try:
                # Format date as DD.MM.YYYY
                date_str = booking.check_in.strftime("%d.%m.%Y")

                # Get room number
                room_number = "N/A"
                if booking.room:
                    room_number = str(booking.room.room_number)

                # Get status
                status = booking.status.value if booking.status else "unknown"

                booking_dates.append(date_str)
                bookings_info.append({
                    "date": date_str,
                    "room": room_number,
                    "status": status,
                })
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
