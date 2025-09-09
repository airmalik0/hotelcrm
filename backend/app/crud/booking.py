from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import joinedload
from sqlmodel import Session, and_, func, select

from app.crud.base import CRUDBase
from app.models import Booking, BookingCreate, BookingStatus, BookingUpdate


class CRUDBooking(CRUDBase[Booking, BookingCreate, BookingUpdate]):
    def get_with_relations(self, session: Session, *, booking_id: UUID) -> Booking | None:
        statement = (
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                joinedload(Booking.customer),  # type: ignore[arg-type]
                joinedload(Booking.room)  # type: ignore[arg-type]
            )
        )
        return session.exec(statement).first()

    def get_multi_filtered(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: BookingStatus | None = None,
        room_id: UUID | None = None,
        customer_id: UUID | None = None
    ) -> list[Booking]:
        statement = select(Booking)

        if status:
            statement = statement.where(Booking.status == status)
        if room_id:
            statement = statement.where(Booking.room_id == room_id)
        if customer_id:
            statement = statement.where(Booking.customer_id == customer_id)

        statement = statement.options(
            joinedload(Booking.customer),  # type: ignore[arg-type]
            joinedload(Booking.room)  # type: ignore[arg-type]
        )
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()

    def count_filtered(
        self,
        session: Session,
        *,
        status: BookingStatus | None = None,
        room_id: UUID | None = None,
        customer_id: UUID | None = None
    ) -> int:
        statement = select(func.count()).select_from(Booking)

        if status:
            statement = statement.where(Booking.status == status)
        if room_id:
            statement = statement.where(Booking.room_id == room_id)
        if customer_id:
            statement = statement.where(Booking.customer_id == customer_id)

        return session.exec(statement).one()

    def get_overlapping(
        self,
        session: Session,
        *,
        room_id: UUID,
        check_in: datetime,
        check_out: datetime,
        exclude_id: UUID | None = None,
        buffer_minutes: int = 15
    ) -> list[Booking]:
        query = select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.check_out > check_in - timedelta(minutes=buffer_minutes),
                Booking.check_in < check_out + timedelta(minutes=buffer_minutes),
            )
        )
        if exclude_id:
            query = query.where(Booking.id != exclude_id)

        return session.exec(query.with_for_update()).all()

    def update_status(self, session: Session, *, booking: Booking, status: BookingStatus) -> Booking:
        """Update booking status."""
        booking.status = status
        session.add(booking)
        session.flush()
        return booking


booking = CRUDBooking(Booking)
