import uuid

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.booking_guest import (
    BookingGuest,
    BookingGuestCreate,
    BookingGuestUpdate,
)


class CRUDBookingGuest(CRUDBase[BookingGuest, BookingGuestCreate, BookingGuestUpdate]):
    """CRUD operations for booking guests."""

    def get_by_booking(
        self, session: Session, *, booking_id: uuid.UUID
    ) -> list[BookingGuest]:
        """Get all guests for a specific booking."""
        statement = select(BookingGuest).where(
            BookingGuest.booking_id == booking_id
        ).order_by(BookingGuest.is_primary.desc(), BookingGuest.added_at)
        return list(session.exec(statement).all())

    def get_primary_guest(
        self, session: Session, *, booking_id: uuid.UUID
    ) -> BookingGuest | None:
        """Get the primary guest for a booking."""
        statement = select(BookingGuest).where(
            BookingGuest.booking_id == booking_id,
            BookingGuest.is_primary == True  # noqa: E712
        )
        return session.exec(statement).first()

    def count_guests_in_booking(
        self, session: Session, *, booking_id: uuid.UUID
    ) -> int:
        """Count total guests in a booking."""
        statement = select(BookingGuest).where(
            BookingGuest.booking_id == booking_id
        )
        return len(list(session.exec(statement).all()))


booking_guest = CRUDBookingGuest(BookingGuest)
