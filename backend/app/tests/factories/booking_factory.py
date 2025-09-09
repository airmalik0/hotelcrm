"""Booking factory for creating test bookings."""
from datetime import datetime, timedelta
from typing import Any

from sqlmodel import Session

from app.models import (
    Booking,
    BookingCreate,
    BookingStatus,
    BookingUpdate,
    Customer,
    PaymentMethod,
    Room,
)


class BookingFactory:
    """Factory for creating test bookings."""

    @staticmethod
    def create_test_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
        check_in: datetime | None = None,
        check_out: datetime | None = None,
        status: BookingStatus = BookingStatus.CONFIRMED,
        total_amount: float | None = None,
        discount: float = 0.0,
        discount_reason: str | None = None,
        payment_method: PaymentMethod = PaymentMethod.CASH,
        registration_need: bool = True,
        auto_calculate_total: bool = True,
    ) -> Booking:
        """
        Create a test booking.

        Args:
            session: Database session
            customer: Customer for the booking (created if None)
            room: Room for the booking (created if None)
            check_in: Check-in date (now if None)
            check_out: Check-out date (tomorrow if None)
            status: Booking status
            total_amount: Total amount (auto-calculated if None and auto_calculate_total is True)
            discount: Discount percentage
            discount_reason: Reason for discount
            payment_method: Payment method
            registration_need: Whether registration is needed
            auto_calculate_total: Whether to auto-calculate total from room price

        Returns:
            Created booking
        """
        # Import factories here to avoid circular imports
        from app.tests.factories.customer_factory import CustomerFactory
        from app.tests.factories.room_factory import RoomFactory

        if customer is None:
            customer = CustomerFactory.create_test_customer(session)

        if room is None:
            room = RoomFactory.create_test_room(session)

        if check_in is None:
            check_in = datetime.utcnow()

        if check_out is None:
            check_out = check_in + timedelta(days=1)

        # Auto-calculate total if not provided
        if total_amount is None and auto_calculate_total:
            nights = max(1, (check_out.date() - check_in.date()).days)
            subtotal = room.price_per_night * nights
            discount_amount = subtotal * (discount / 100)
            total_amount = subtotal - discount_amount

        # Set discount reason if discount is applied
        if discount > 0 and discount_reason is None:
            discount_reason = "Test discount"

        booking_in = BookingCreate(
            customer_id=customer.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            status=status,
            total_amount=total_amount or 100.0,
            discount=discount,
            discount_reason=discount_reason,
            payment_method=payment_method,
            registration_need=registration_need,
        )

        booking = Booking.model_validate(booking_in)
        session.add(booking)

        # Update customer stats if not cancelled
        if status != BookingStatus.CANCELLED:
            customer.total_bookings += 1
            customer.total_spent += booking.total_amount
            if not customer.first_booking_date or booking.booking_date < customer.first_booking_date:
                customer.first_booking_date = booking.booking_date
            if not customer.last_booking_date or booking.booking_date > customer.last_booking_date:
                customer.last_booking_date = booking.booking_date
            session.add(customer)

        session.commit()
        session.refresh(booking)
        return booking

    @staticmethod
    def create_confirmed_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
        check_in: datetime | None = None,
        check_out: datetime | None = None,
    ) -> Booking:
        """Create a confirmed booking."""
        return BookingFactory.create_test_booking(
            session=session,
            customer=customer,
            room=room,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
        )

    @staticmethod
    def create_checked_in_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
    ) -> Booking:
        """Create a checked-in booking."""
        # Import here to avoid circular import
        from app.tests.factories.room_factory import RoomFactory

        # Ensure room is created with OCCUPIED status
        if room is None:
            room = RoomFactory.create_occupied_room(session)

        return BookingFactory.create_test_booking(
            session=session,
            customer=customer,
            room=room,
            check_in=datetime.utcnow() - timedelta(hours=2),
            check_out=datetime.utcnow() + timedelta(days=2),
            status=BookingStatus.CHECKED_IN,
        )

    @staticmethod
    def create_checked_out_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
    ) -> Booking:
        """Create a checked-out booking."""
        return BookingFactory.create_test_booking(
            session=session,
            customer=customer,
            room=room,
            check_in=datetime.utcnow() - timedelta(days=3),
            check_out=datetime.utcnow() - timedelta(days=1),
            status=BookingStatus.CHECKED_OUT,
        )

    @staticmethod
    def create_cancelled_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
    ) -> Booking:
        """Create a cancelled booking."""
        return BookingFactory.create_test_booking(
            session=session,
            customer=customer,
            room=room,
            status=BookingStatus.CANCELLED,
        )

    @staticmethod
    def create_booking_with_discount(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
        discount: float = 20.0,
        discount_reason: str = "Loyalty discount",
    ) -> Booking:
        """Create a booking with discount."""
        return BookingFactory.create_test_booking(
            session=session,
            customer=customer,
            room=room,
            discount=discount,
            discount_reason=discount_reason,
        )

    @staticmethod
    def update_booking(
        session: Session,
        booking: Booking,
        **kwargs: Any,
    ) -> Booking:
        """Update a booking with given data."""
        booking_update = BookingUpdate(**kwargs)
        update_dict = booking_update.model_dump(exclude_unset=True)
        booking.sqlmodel_update(update_dict)
        session.add(booking)
        session.commit()
        session.refresh(booking)
        return booking

    @staticmethod
    def create_overlapping_bookings(
        session: Session,
        room: Room,
        base_date: datetime | None = None,
    ) -> tuple[Booking, Booking]:
        """
        Create two bookings that overlap in time for testing conflicts.

        Returns:
            Tuple of (first_booking, overlapping_booking)
        """
        from app.tests.factories.customer_factory import CustomerFactory

        if base_date is None:
            base_date = datetime.utcnow()

        customer1 = CustomerFactory.create_test_customer(session)
        customer2 = CustomerFactory.create_test_customer(session)

        # First booking: today to 3 days from now
        booking1 = BookingFactory.create_test_booking(
            session=session,
            customer=customer1,
            room=room,
            check_in=base_date,
            check_out=base_date + timedelta(days=3),
        )

        # Second booking: 2 days from now to 5 days from now (overlaps with first)
        booking2 = BookingFactory.create_test_booking(
            session=session,
            customer=customer2,
            room=room,
            check_in=base_date + timedelta(days=2),
            check_out=base_date + timedelta(days=5),
            status=BookingStatus.CONFIRMED,  # Will conflict
        )

        return booking1, booking2

    @staticmethod
    def create_sequential_bookings_with_buffer(
        session: Session,
        room: Room,
        base_date: datetime | None = None,
        buffer_minutes: int = 15,
    ) -> tuple[Booking, Booking]:
        """
        Create two bookings with proper buffer time between them.

        Returns:
            Tuple of (first_booking, second_booking)
        """
        from app.tests.factories.customer_factory import CustomerFactory

        if base_date is None:
            base_date = datetime.utcnow()

        customer1 = CustomerFactory.create_test_customer(session)
        customer2 = CustomerFactory.create_test_customer(session)

        # First booking
        booking1 = BookingFactory.create_test_booking(
            session=session,
            customer=customer1,
            room=room,
            check_in=base_date,
            check_out=base_date + timedelta(days=2),
        )

        # Second booking with proper buffer
        booking2 = BookingFactory.create_test_booking(
            session=session,
            customer=customer2,
            room=room,
            check_in=base_date + timedelta(days=2, minutes=buffer_minutes),
            check_out=base_date + timedelta(days=4),
        )

        return booking1, booking2
