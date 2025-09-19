"""
Booking service layer for centralizing booking business logic.
"""
import uuid
from datetime import datetime

from sqlmodel import Session

from app.core.customer_stats import update_customer_stats_on_booking_change
from app.crud.booking import booking as crud_booking
from app.crud.customer import customer as crud_customer
from app.crud.room import room as crud_room
from app.models import (
    Booking,
    BookingCreate,
    BookingStatus,
    BookingUpdate,
    RoomStatus,
)


class BookingService:
    """Service class for handling booking operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.crud_booking = crud_booking
        self.crud_room = crud_room
        self.crud_customer = crud_customer

    def create_booking(self, booking_in: BookingCreate) -> Booking:
        """
        Create a new booking with all validations.

        Args:
            booking_in: Booking creation data

        Returns:
            Created booking

        Raises:
            ValueError: If validation fails
        """
        # Verify customer exists
        customer = self.crud_customer.get(self.session, id=booking_in.customer_id)
        if not customer:
            raise ValueError("Customer not found")

        # Create booking with room lock to prevent race conditions
        # This handles ALL validations atomically: room check, status check, overlapping check, total amount
        booking = self.crud_booking.create(self.session, obj_in=booking_in)

        # Update customer statistics (use check_in semantics)
        update_customer_stats_on_booking_change(
            session=self.session,
            customer_id=booking_in.customer_id,
            amount_delta=booking_in.total_amount,
            booking_delta=1,
            new_booking_date=booking_in.check_in
        )

        return booking

    def update_booking(self, booking: Booking, booking_in: BookingUpdate) -> Booking:
        """
        Update a booking with validations.

        Args:
            booking: Current booking
            booking_in: Update data

        Returns:
            Updated booking

        Raises:
            ValueError: If validation fails
        """
        # Track changes for customer stats
        old_customer_id = booking.customer_id
        old_amount = booking.total_amount

        # If room is being changed, verify it exists and handle room status updates
        if booking_in.room_id and booking_in.room_id != booking.room_id:
            new_room = self.crud_room.get(self.session, id=booking_in.room_id)
            if not new_room:
                raise ValueError("Room not found")

            # If booking is currently checked in, handle room status transitions
            if booking.status == BookingStatus.CHECKED_IN:
                # Old room becomes available for cleaning
                old_room = self.crud_room.get(self.session, id=booking.room_id)
                if old_room:
                    self.crud_room.update_status(self.session, room=old_room, status=RoomStatus.CLEANING)

                # New room must not be under maintenance
                if new_room.status == RoomStatus.MAINTENANCE:
                    raise ValueError("New room is under maintenance and cannot be used")

                # New room becomes occupied
                self.crud_room.update_status(self.session, room=new_room, status=RoomStatus.OCCUPIED)

        # Check if customer is being changed
        if booking_in.customer_id and booking_in.customer_id != booking.customer_id:
            new_customer = self.crud_customer.get(self.session, id=booking_in.customer_id)
            if not new_customer:
                raise ValueError("Customer not found")

        # Check room availability if dates or room changed
        if (booking_in.check_in or booking_in.check_out or booking_in.room_id):
            room_id = booking_in.room_id or booking.room_id
            check_in = booking_in.check_in or booking.check_in
            check_out = booking_in.check_out or booking.check_out

            overlapping = self.crud_booking.get_overlapping(
                self.session,
                room_id=room_id,
                check_in=check_in,
                check_out=check_out,
                exclude_id=booking.id
            )

            if overlapping:
                raise ValueError("Room is not available for the selected dates")

        # Recalculate total if needed
        if any([booking_in.check_in, booking_in.check_out, booking_in.room_id,
                booking_in.discount is not None]):
            new_total = self.recalculate_booking_total(
                booking,
                new_check_in=booking_in.check_in,
                new_check_out=booking_in.check_out,
                new_room_id=booking_in.room_id,
                new_discount=booking_in.discount
            )

            # Verify provided total matches calculated
            if booking_in.total_amount and abs(booking_in.total_amount - new_total) > 1:
                raise ValueError(
                    f"Total amount mismatch. Expected: {new_total:.2f}, got: {booking_in.total_amount:.2f}"
                )

        # Update booking
        booking = self.crud_booking.update(self.session, db_obj=booking, obj_in=booking_in)

        # Update customer stats if needed
        if booking_in.customer_id and booking_in.customer_id != old_customer_id:
            # Remove from old customer
            update_customer_stats_on_booking_change(
                session=self.session,
                customer_id=old_customer_id,
                amount_delta=-old_amount,
                booking_delta=-1
            )
            # Add to new customer (use check_in semantics)
            update_customer_stats_on_booking_change(
                session=self.session,
                customer_id=booking_in.customer_id,
                amount_delta=booking.total_amount,
                booking_delta=1,
                new_booking_date=(booking_in.check_in or booking.check_in)
            )
        else:
            # Amount and/or dates may have changed while staying with same customer
            amount_delta_value = None
            if booking.total_amount != old_amount:
                amount_delta_value = booking.total_amount - old_amount

            # If dates changed, pass new check_in to potentially update first/last
            new_check_in_for_stats = booking_in.check_in if booking_in.check_in else None

            if amount_delta_value is not None or new_check_in_for_stats is not None:
                update_customer_stats_on_booking_change(
                    session=self.session,
                    customer_id=booking.customer_id,
                    amount_delta=amount_delta_value,
                    booking_delta=0,
                    new_booking_date=new_check_in_for_stats
                )

        return booking

    def check_in_booking(self, booking: Booking) -> Booking:
        """
        Handle check-in with room status updates.

        Args:
            booking: Booking to check in

        Returns:
            Updated booking

        Raises:
            ValueError: If check-in is not allowed
        """
        if booking.status != BookingStatus.CONFIRMED:
            raise ValueError("Only confirmed bookings can be checked in")

        # Validate check-in time has arrived
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc)
        if current_time < booking.check_in:
            time_until_checkin = booking.check_in - current_time
            hours = int(time_until_checkin.total_seconds() / 3600)
            minutes = int((time_until_checkin.total_seconds() % 3600) / 60)
            if hours > 0:
                raise ValueError(f"Check-in time has not arrived yet. Please wait {hours} hours and {minutes} minutes")
            else:
                raise ValueError(f"Check-in time has not arrived yet. Please wait {minutes} minutes")

        room = self.crud_room.get(self.session, id=booking.room_id)
        if not room:
            raise ValueError("Room not found")

        if room.status == RoomStatus.MAINTENANCE:
            raise ValueError("Room is under maintenance and cannot be checked in")

        # Check if room needs cleaning first
        if room.status == RoomStatus.CLEANING:
            raise ValueError("Room is being cleaned. Please confirm it's ready for check-in")

        # Check if room is already occupied
        if room.status == RoomStatus.OCCUPIED:
            raise ValueError("Room is already occupied. This might be a data inconsistency - please contact support")

        # Check for conflicts
        overlapping = self.crud_booking.get_overlapping(
            self.session,
            room_id=booking.room_id,
            check_in=booking.check_in,
            check_out=booking.check_out,
            exclude_id=booking.id
        )

        if overlapping:
            raise ValueError("Cannot check in: room has conflicting bookings")

        # Update statuses
        self.crud_booking.update_status(self.session, booking=booking, status=BookingStatus.CHECKED_IN)
        self.crud_room.update_status(self.session, room=room, status=RoomStatus.OCCUPIED)

        return booking

    def check_out_booking(self, booking: Booking) -> Booking:
        """
        Handle check-out with room status updates.

        Args:
            booking: Booking to check out

        Returns:
            Updated booking

        Raises:
            ValueError: If check-out is not allowed
        """
        if booking.status != BookingStatus.CHECKED_IN:
            raise ValueError("Only checked-in bookings can be checked out")

        room = self.crud_room.get(self.session, id=booking.room_id)
        if room:
            # Room needs cleaning after checkout
            self.crud_room.update_status(self.session, room=room, status=RoomStatus.CLEANING)

        self.crud_booking.update_status(self.session, booking=booking, status=BookingStatus.CHECKED_OUT)

        return booking

    def cancel_booking(self, booking: Booking) -> Booking:
        """
        Cancel a booking with proper status and stats updates.

        Args:
            booking: Booking to cancel

        Returns:
            Updated booking
        """
        if booking.status == BookingStatus.CANCELLED:
            return booking  # Already cancelled

        # Update customer stats
        update_customer_stats_on_booking_change(
            session=self.session,
            customer_id=booking.customer_id,
            amount_delta=-booking.total_amount,
            booking_delta=-1
        )

        # Update room status if checked in
        if booking.status == BookingStatus.CHECKED_IN:
            room = self.crud_room.get(self.session, id=booking.room_id)
            if room:
                # Room must go through cleaning after being occupied
                self.crud_room.update_status(self.session, room=room, status=RoomStatus.CLEANING)

        # Update booking status
        self.crud_booking.update_status(self.session, booking=booking, status=BookingStatus.CANCELLED)

        return booking

    def delete_booking(self, booking: Booking) -> None:
        """
        Handle all operations needed when deleting a booking.

        Args:
            booking: Booking to delete
        """
        # Update customer statistics only if booking wasn't cancelled
        if booking.status != BookingStatus.CANCELLED:
            update_customer_stats_on_booking_change(
                session=self.session,
                customer_id=booking.customer_id,
                amount_delta=-booking.total_amount,
                booking_delta=-1
            )

        # Update room status if needed
        if booking.status == BookingStatus.CHECKED_IN:
            room = self.crud_room.get(self.session, id=booking.room_id)
            if room:
                self.crud_room.update_status(self.session, room=room, status=RoomStatus.CLEANING)

        # Delete the booking
        self.crud_booking.delete(self.session, id=booking.id)

    def recalculate_booking_total(
        self,
        booking: Booking,
        new_check_in: datetime | None = None,
        new_check_out: datetime | None = None,
        new_room_id: uuid.UUID | None = None,
        new_discount: float | None = None
    ) -> float:
        """
        Recalculate booking total amount based on changes.

        Args:
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
        room = self.crud_room.get(self.session, id=room_id)
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
