"""Booking factory for creating test bookings."""
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlmodel import Session

from app.crud.booking import booking as crud_booking
from app.models import (
    Booking,
    BookingCreate,
    BookingStatus,
    BookingUpdate,
    Customer,
    PaymentMethod,
    Room,
)
from app.tests.factories.base import BaseFactory


class BookingFactory(BaseFactory[Booking, BookingCreate]):
    """
    Factory for creating test bookings.
    
    Uses CRUD layer for all database operations.
    NO business logic - customer stats should be updated by service layer.
    """
    
    model = Booking
    create_schema = BookingCreate
    crud = crud_booking
    
    @classmethod
    def get_defaults(cls, **overrides: Any) -> dict[str, Any]:
        """Get default values for booking creation."""
        # Import here to avoid circular imports
        from app.tests.factories.customer_factory import CustomerFactory
        from app.tests.factories.room_factory import RoomFactory
        
        # Get or create dependencies
        session = overrides.get("_session")  # Internal use for dependencies
        if session:
            if "customer_id" not in overrides:
                customer = CustomerFactory.create(session)
                overrides["customer_id"] = customer.id
            
            if "room_id" not in overrides:
                room = RoomFactory.create(session)
                overrides["room_id"] = room.id
        
        # Calculate dates
        check_in = overrides.get("check_in", datetime.now(timezone.utc))
        check_out = overrides.get("check_out", check_in + timedelta(days=1))
        
        # Calculate total amount if not provided
        if "total_amount" not in overrides:
            # Simple default calculation
            nights = max(1, (check_out.date() - check_in.date()).days)
            total_amount = 100.0 * nights  # Default price
        else:
            total_amount = overrides["total_amount"]
        
        # Handle discount
        discount = overrides.get("discount", 0.0)
        discount_reason = overrides.get("discount_reason")
        if discount > 0 and discount_reason is None:
            discount_reason = "Test discount"
        
        defaults = {
            "check_in": check_in,
            "check_out": check_out,
            "status": BookingStatus.CONFIRMED,
            "total_amount": total_amount,
            "discount": discount,
            "discount_reason": discount_reason,
            "payment_method": PaymentMethod.CASH,
            "registration_need": True,
        }
        
        # Apply overrides (excluding internal fields)
        for key, value in overrides.items():
            if not key.startswith("_"):
                defaults[key] = value
        
        return defaults
    
    @classmethod
    def create(cls, session: Session, **kwargs: Any) -> Booking:
        """
        Create and persist a booking via CRUD layer.
        
        NOTE: This does NOT update customer stats - that should be
        handled by the service layer in production code.
        """
        # Pass session for dependency creation
        kwargs["_session"] = session
        obj_in = cls.build(**kwargs)
        
        # Create booking via CRUD
        booking = cls.crud.create(session, obj_in=obj_in)
        session.flush()
        
        # For testing purposes, if we need stats updated, 
        # tests should call the service layer explicitly
        return booking

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
        Create a test booking (backward compatibility).
        
        DEPRECATED: Use BookingFactory.create() instead.
        
        NOTE: This no longer updates customer stats. Tests should
        use service layer if stats need to be updated.
        """
        # Import here to avoid circular imports
        from app.tests.factories.customer_factory import CustomerFactory
        from app.tests.factories.room_factory import RoomFactory

        if customer is None:
            customer = CustomerFactory.create(session)

        if room is None:
            room = RoomFactory.create(session)

        kwargs = {
            "customer_id": customer.id,
            "room_id": room.id,
            "status": status,
            "discount": discount,
            "discount_reason": discount_reason,
            "payment_method": payment_method,
            "registration_need": registration_need,
        }
        
        if check_in is not None:
            kwargs["check_in"] = check_in
        if check_out is not None:
            kwargs["check_out"] = check_out
        
        # Calculate total if needed
        if total_amount is not None:
            kwargs["total_amount"] = total_amount
        elif auto_calculate_total:
            check_in = check_in or datetime.now(timezone.utc)
            check_out = check_out or (check_in + timedelta(days=1))
            nights = max(1, (check_out.date() - check_in.date()).days)
            subtotal = room.price_per_night * nights
            discount_amount = subtotal * (discount / 100)
            kwargs["total_amount"] = subtotal - discount_amount
        
        return BookingFactory.create(session, **kwargs)

    @staticmethod
    def create_confirmed_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
        check_in: datetime | None = None,
        check_out: datetime | None = None,
    ) -> Booking:
        """Create a confirmed booking."""
        kwargs = {"status": BookingStatus.CONFIRMED}
        
        if customer:
            kwargs["customer_id"] = customer.id
        if room:
            kwargs["room_id"] = room.id
        if check_in:
            kwargs["check_in"] = check_in
        if check_out:
            kwargs["check_out"] = check_out
        
        return BookingFactory.create(session, **kwargs)

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

        kwargs = {
            "room_id": room.id,
            "status": BookingStatus.CHECKED_IN,
            "check_in": datetime.now(timezone.utc) - timedelta(hours=2),
            "check_out": datetime.now(timezone.utc) + timedelta(days=2),
        }
        
        if customer:
            kwargs["customer_id"] = customer.id
        
        return BookingFactory.create(session, **kwargs)

    @staticmethod
    def create_checked_out_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
    ) -> Booking:
        """Create a checked-out booking."""
        kwargs = {
            "status": BookingStatus.CHECKED_OUT,
            "check_in": datetime.now(timezone.utc) - timedelta(days=3),
            "check_out": datetime.now(timezone.utc) - timedelta(days=1),
        }
        
        if customer:
            kwargs["customer_id"] = customer.id
        if room:
            kwargs["room_id"] = room.id
        
        return BookingFactory.create(session, **kwargs)

    @staticmethod
    def create_cancelled_booking(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
    ) -> Booking:
        """Create a cancelled booking."""
        kwargs = {"status": BookingStatus.CANCELLED}
        
        if customer:
            kwargs["customer_id"] = customer.id
        if room:
            kwargs["room_id"] = room.id
        
        return BookingFactory.create(session, **kwargs)

    @staticmethod
    def create_booking_with_discount(
        session: Session,
        customer: Customer | None = None,
        room: Room | None = None,
        discount: float = 20.0,
        discount_reason: str = "Loyalty discount",
    ) -> Booking:
        """Create a booking with discount."""
        kwargs = {
            "discount": discount,
            "discount_reason": discount_reason,
        }
        
        if customer:
            kwargs["customer_id"] = customer.id
        if room:
            kwargs["room_id"] = room.id
        
        return BookingFactory.create(session, **kwargs)

    @staticmethod
    def update_booking(
        session: Session,
        booking: Booking,
        **kwargs: Any,
    ) -> Booking:
        """
        Update a booking with given data.
        
        Uses CRUD layer for proper update handling.
        """
        booking_update = BookingUpdate(**kwargs)
        updated = crud_booking.update(session, db_obj=booking, obj_in=booking_update)
        session.flush()
        return updated

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
            base_date = datetime.now(timezone.utc)

        customer1 = CustomerFactory.create(session)
        customer2 = CustomerFactory.create(session)

        # First booking: today to 3 days from now
        booking1 = BookingFactory.create(
            session=session,
            customer_id=customer1.id,
            room_id=room.id,
            check_in=base_date,
            check_out=base_date + timedelta(days=3),
        )

        # Second booking: 2 days from now to 5 days from now (overlaps with first)
        booking2 = BookingFactory.create(
            session=session,
            customer_id=customer2.id,
            room_id=room.id,
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
            base_date = datetime.now(timezone.utc)

        customer1 = CustomerFactory.create(session)
        customer2 = CustomerFactory.create(session)

        # First booking
        booking1 = BookingFactory.create(
            session=session,
            customer_id=customer1.id,
            room_id=room.id,
            check_in=base_date,
            check_out=base_date + timedelta(days=2),
        )

        # Second booking with proper buffer
        booking2 = BookingFactory.create(
            session=session,
            customer_id=customer2.id,
            room_id=room.id,
            check_in=base_date + timedelta(days=2, minutes=buffer_minutes),
            check_out=base_date + timedelta(days=4),
        )

        return booking1, booking2