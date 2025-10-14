import uuid

from sqlmodel import Session

from app.core.exceptions import BusinessRuleViolation, NotFoundError
from app.crud.booking import booking as crud_booking
from app.crud.booking_guest import booking_guest as crud_booking_guest
from app.crud.room import room as crud_room
from app.models.booking_guest import (
    BookingGuest,
    BookingGuestCreate,
    BookingGuestUpdate,
)


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

        # Determine linkage to existing customer if provided
        customer_id = guest_data.customer_id

        # If no customer_id, require inline first_name and last_name (validated at schema level as well)
        if not customer_id and (not guest_data.first_name or not guest_data.last_name):
            raise BusinessRuleViolation("first_name and last_name are required when customer_id is not provided")

        # Create booking guest directly to avoid duplicate kwargs (customer_id)
        guest = BookingGuest(
            booking_id=booking_id,
            customer_id=customer_id,
            first_name=guest_data.first_name,
            last_name=guest_data.last_name,
            passport_photo_path=guest_data.passport_photo_path,
            country_code=guest_data.country_code,
            region=guest_data.region,
            district=guest_data.district,
            phone=guest_data.phone,
            is_primary=guest_data.is_primary,
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
