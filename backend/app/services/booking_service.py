"""
Booking service layer for centralizing booking business logic.
"""
import uuid
from datetime import datetime, timedelta

from sqlmodel import Session, and_, select

from app.core.customer_stats import update_customer_stats_on_booking_change
from app.models import Booking, BookingStatus, Room, RoomStatus


class BookingService:
    """Service class for handling booking operations."""

    @staticmethod
    def check_room_availability(
        session: Session,
        room_id: uuid.UUID,
        check_in: datetime,
        check_out: datetime,
        exclude_booking_id: uuid.UUID | None = None,
        buffer_minutes: int = 15
    ) -> list[Booking]:
        """
        Check if a room is available for the given dates.

        Args:
            session: Database session
            room_id: Room ID to check
            check_in: Check-in date
            check_out: Check-out date
            exclude_booking_id: Booking ID to exclude from check (for updates)
            buffer_minutes: Buffer time between bookings

        Returns:
            List of conflicting bookings (empty if available)
        """
        query = select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.check_out > check_in - timedelta(minutes=buffer_minutes),
                Booking.check_in < check_out + timedelta(minutes=buffer_minutes),
            )
        )

        if exclude_booking_id:
            query = query.where(Booking.id != exclude_booking_id)

        # Use FOR UPDATE to prevent race conditions
        return list(session.exec(query.with_for_update()).all())

    @staticmethod
    def update_room_status_on_checkin(session: Session, room: Room) -> None:
        """Update room status when checking in."""
        if room.status == RoomStatus.AVAILABLE:
            room.status = RoomStatus.OCCUPIED
            session.add(room)

    @staticmethod
    def update_room_status_on_checkout(session: Session, room: Room) -> None:
        """Update room status when checking out."""
        room.status = room.get_next_status_after_checkout()
        session.add(room)

    @staticmethod
    def update_room_status_on_cancel(session: Session, booking: Booking) -> None:
        """Update room status when cancelling a booking."""
        if booking.status == BookingStatus.CHECKED_IN:
            room = session.get(Room, booking.room_id)
            if room:
                # Room must go through cleaning after being occupied
                room.status = RoomStatus.CLEANING
                session.add(room)

    @staticmethod
    def handle_booking_cancellation(
        session: Session,
        booking: Booking
    ) -> None:
        """
        Handle all operations needed when cancelling a booking.

        Args:
            session: Database session
            booking: Booking to cancel
        """
        if booking.status == BookingStatus.CANCELLED:
            return  # Already cancelled

        # Update customer stats if not already cancelled
        update_customer_stats_on_booking_change(
            session=session,
            customer_id=booking.customer_id,
            amount_delta=-booking.total_amount,
            booking_delta=-1
        )

        # Update room status if needed
        BookingService.update_room_status_on_cancel(session, booking)

        # Update booking status
        booking.status = BookingStatus.CANCELLED

    @staticmethod
    def handle_booking_deletion(
        session: Session,
        booking: Booking
    ) -> None:
        """
        Handle all operations needed when deleting a booking.

        Args:
            session: Database session
            booking: Booking to delete
        """
        # Update customer statistics only if booking wasn't cancelled
        if booking.status != BookingStatus.CANCELLED:
            update_customer_stats_on_booking_change(
                session=session,
                customer_id=booking.customer_id,
                amount_delta=-booking.total_amount,
                booking_delta=-1
            )

        # Update room status if needed
        if booking.status == BookingStatus.CHECKED_IN:
            room = session.get(Room, booking.room_id)
            if room:
                room.status = RoomStatus.CLEANING
                session.add(room)

    @staticmethod
    def recalculate_booking_total(
        session: Session,
        booking: Booking,
        new_check_in: datetime | None = None,
        new_check_out: datetime | None = None,
        new_room_id: uuid.UUID | None = None,
        new_discount: float | None = None
    ) -> float:
        """
        Recalculate booking total amount based on changes.

        Args:
            session: Database session
            booking: Current booking
            new_check_in: New check-in date (optional)
            new_check_out: New check-out date (optional)
            new_room_id: New room ID (optional)
            new_discount: New discount percentage (optional)

        Returns:
            New total amount
        """
        # Get the room for pricing
        room_id = new_room_id or booking.room_id
        room = session.get(Room, room_id)
        if not room:
            raise ValueError(f"Room {room_id} not found")

        # Use new or existing dates
        check_in = new_check_in or booking.check_in
        check_out = new_check_out or booking.check_out
        discount = new_discount if new_discount is not None else booking.discount

        # Create a temporary booking to use the model's calculation method
        temp_booking = Booking(
            customer_id=booking.customer_id,
            room_id=room_id,
            check_in=check_in,
            check_out=check_out,
            discount=discount,
            status=booking.status,
            total_amount=0,  # Will be calculated
            payment_method=booking.payment_method,
            registration_need=booking.registration_need
        )

        return temp_booking.calculate_total_amount(room.price_per_night)

    @staticmethod
    def handle_customer_change(
        session: Session,
        booking: Booking,
        old_customer_id: uuid.UUID,
        new_customer_id: uuid.UUID,
        amount_changed: bool = False,
        new_amount: float | None = None
    ) -> None:
        """
        Handle customer change on a booking with proper stats updates.

        Args:
            session: Database session
            booking: Booking being updated
            old_customer_id: Previous customer ID
            new_customer_id: New customer ID
            amount_changed: Whether the amount also changed
            new_amount: New amount if changed
        """
        # Remove from old customer
        update_customer_stats_on_booking_change(
            session=session,
            customer_id=old_customer_id,
            amount_delta=-booking.total_amount,
            booking_delta=-1
        )

        # Add to new customer
        amount = new_amount if amount_changed and new_amount is not None else booking.total_amount
        update_customer_stats_on_booking_change(
            session=session,
            customer_id=new_customer_id,
            amount_delta=amount,
            booking_delta=1,
            new_booking_date=datetime.utcnow()
        )
