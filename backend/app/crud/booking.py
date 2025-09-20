from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import joinedload
from sqlmodel import Session, and_, case, func, select

from app.core.exceptions import BusinessRuleViolation, NotFoundError
from app.core.retry import db_retry
from app.crud.base import CRUDBase
from app.models import Booking, BookingCreate, BookingStatus, BookingUpdate, Room


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
        customer_id: UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None
    ) -> list[Booking]:
        statement = select(Booking)

        if status:
            statement = statement.where(Booking.status == status)
        if room_id:
            statement = statement.where(Booking.room_id == room_id)
        if customer_id:
            statement = statement.where(Booking.customer_id == customer_id)

        # Add date range filtering
        if date_from:
            statement = statement.where(Booking.check_out >= date_from)
        if date_to:
            statement = statement.where(Booking.check_in <= date_to)

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
        customer_id: UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None
    ) -> int:
        statement = select(func.count()).select_from(Booking)

        if status:
            statement = statement.where(Booking.status == status)
        if room_id:
            statement = statement.where(Booking.room_id == room_id)
        if customer_id:
            statement = statement.where(Booking.customer_id == customer_id)

        # Add date range filtering
        if date_from:
            statement = statement.where(Booking.check_out >= date_from)
        if date_to:
            statement = statement.where(Booking.check_in <= date_to)

        return session.exec(statement).one()

    def get_overlapping(
        self,
        session: Session,
        *,
        room_id: UUID,
        check_in: datetime,
        check_out: datetime,
        exclude_id: UUID | None = None,
        buffer_minutes: int = 0
    ) -> list[Booking]:
        # Use actual check-out if available (early checkout frees room earlier)
        # BUT always use planned check-in (room is blocked from planned time regardless of actual arrival)
        effective_check_out = case(
            (Booking.actual_check_out.isnot(None), Booking.actual_check_out),
            else_=Booking.check_out
        )

        query = select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status != BookingStatus.CANCELLED,
                effective_check_out > check_in,
                Booking.check_in < check_out,  # Always use planned check_in
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

    @db_retry(max_attempts=3)
    def create(self, session: Session, *, obj_in: BookingCreate) -> Booking:
        """
        Create booking with room lock to prevent race conditions.
        This ensures no concurrent bookings can be created for the same room.
        ALL validations happen atomically while room is locked.
        Includes retry logic for transient database failures.

        Args:
            session: Database session
            obj_in: Booking creation data
        """
        # Lock the room for update to prevent concurrent modifications
        room = session.exec(
            select(Room).where(Room.id == obj_in.room_id).with_for_update()
        ).first()

        if not room:
            raise NotFoundError("Room", str(obj_in.room_id))

        # Always validate total amount
        temp_booking = Booking.model_validate(obj_in)
        calculated_total = temp_booking.calculate_total_amount(room.price_per_night)
        if abs(obj_in.total_amount - calculated_total) > 1:
            raise BusinessRuleViolation(
                f"Total amount mismatch. Expected: {calculated_total:.2f}, got: {obj_in.total_amount:.2f}"
            )

        # Check room status - only MAINTENANCE prevents booking creation
        # OCCUPIED and CLEANING rooms can be booked for future dates
        from app.models import RoomStatus
        if room.status == RoomStatus.MAINTENANCE:
            raise BusinessRuleViolation("Room is currently under maintenance and cannot be booked")

        # Validate booking dates are not in the past
        current_time = datetime.now(timezone.utc)
        if obj_in.check_in < current_time:
            raise BusinessRuleViolation("Cannot create booking with check-in date in the past")

        # Now check for overlapping bookings while room is locked
        overlapping = self.get_overlapping(
            session,
            room_id=obj_in.room_id,
            check_in=obj_in.check_in,
            check_out=obj_in.check_out
        )

        if overlapping:
            raise BusinessRuleViolation("Room is not available for the selected dates")

        # Create the booking - safe now as room is locked
        booking = Booking.model_validate(obj_in)
        session.add(booking)
        session.flush()
        return booking


booking = CRUDBooking(Booking)
