import uuid

from sqlmodel import Session

from app.core.exceptions import BusinessRuleViolation, NotFoundError
from app.crud.booking import booking as crud_booking
from app.crud.booking_guest import booking_guest as crud_booking_guest
from app.crud.customer import customer as crud_customer
from app.crud.room import room as crud_room
from app.models.booking_guest import (
    BookingGuest,
    BookingGuestCreate,
    BookingGuestUpdate,
)
from app.models.customer import CustomerCreate


class BookingGuestService:
    """Service for managing booking guests."""

    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_booking_guest

    def get_guest_or_404(self, guest_id: uuid.UUID) -> BookingGuest:
        """Get booking guest by ID or raise NotFoundError."""
        guest = self.crud.get(self.session, id=guest_id)
        if not guest:
            raise NotFoundError("Booking guest", str(guest_id))
        return guest

    def add_guest_to_booking(
        self,
        booking_id: uuid.UUID,
        guest_data: BookingGuestCreate,
    ) -> BookingGuest:
        """Add a guest to a booking with validation."""
        # Get booking
        booking = crud_booking.get(self.session, id=booking_id)
        if not booking:
            raise NotFoundError("Booking", str(booking_id))

        # Get room to check max_occupancy
        room = crud_room.get(self.session, id=booking.room_id)
        if not room:
            raise NotFoundError("Room", str(booking.room_id))

        # Check current guest count
        current_guest_count = self.crud.count_guests_in_booking(
            self.session, booking_id=booking_id
        )

        if current_guest_count >= room.max_occupancy:
            raise BusinessRuleViolation(
                f"Room capacity exceeded. Maximum occupancy: {room.max_occupancy}, "
                f"current guests: {current_guest_count}"
            )

        # Handle customer creation/linking if save_to_customers is True
        customer_id = guest_data.customer_id
        if guest_data.save_to_customers and not customer_id:
            # Create new customer from guest data
            if not guest_data.full_name:
                raise BusinessRuleViolation(
                    "Full name is required when saving guest to customers database"
                )

            # Split full name into first and last
            name_parts = guest_data.full_name.strip().split(maxsplit=1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            # Check if customer with this phone already exists
            existing_customer = None
            if guest_data.phone:
                existing_customer = crud_customer.get_by_phone(
                    self.session, phone=guest_data.phone
                )

            if existing_customer:
                customer_id = existing_customer.id
            else:
                # Create new customer
                customer_create = CustomerCreate(
                    first_name=first_name,
                    last_name=last_name,
                    phone=guest_data.phone,
                    passport_photo_path=guest_data.passport_photo_path,
                    region=guest_data.origin_city,  # Store origin_city as region
                )
                new_customer = crud_customer.create(self.session, obj_in=customer_create)
                self.session.flush()
                customer_id = new_customer.id

        # Create booking guest
        guest_db_data = {
            "booking_id": booking_id,
            "customer_id": customer_id,
            "full_name": guest_data.full_name,
            "passport_photo_path": guest_data.passport_photo_path,
            "origin_city": guest_data.origin_city,
            "phone": guest_data.phone,
            "email": guest_data.email,
            "is_primary": guest_data.is_primary,
        }

        # Use model_validate to create the model properly
        from app.models.booking_guest import BookingGuestBase
        guest_base = BookingGuestBase(**{k: v for k, v in guest_db_data.items() if k not in ["booking_id", "customer_id"]})

        guest = BookingGuest(
            booking_id=booking_id,
            customer_id=customer_id,
            **guest_base.model_dump()
        )

        self.session.add(guest)
        self.session.flush()
        return guest

    def remove_guest_from_booking(self, guest_id: uuid.UUID) -> None:
        """Remove a guest from a booking (cannot remove primary guest)."""
        guest = self.get_guest_or_404(guest_id)

        if guest.is_primary:
            raise BusinessRuleViolation(
                "Cannot remove primary guest from booking. "
                "Primary guest is the booking holder."
            )

        self.crud.delete(self.session, id=guest_id)

    def update_guest(
        self, guest_id: uuid.UUID, guest_update: BookingGuestUpdate
    ) -> BookingGuest:
        """Update guest information."""
        guest = self.get_guest_or_404(guest_id)

        if guest.is_primary:
            raise BusinessRuleViolation(
                "Cannot update primary guest information. "
                "Update the customer record instead."
            )

        updated_guest = self.crud.update(
            self.session, db_obj=guest, obj_in=guest_update
        )
        self.session.flush()
        return updated_guest
