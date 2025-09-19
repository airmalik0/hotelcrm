
import uuid
from typing import TYPE_CHECKING

from sqlmodel import Session

from app.core.exceptions import AlreadyExistsError, BusinessRuleViolation, NotFoundError

if TYPE_CHECKING:
    from app.models import User
from app.crud.room import room as crud_room
from app.models import BookingStatus, Room, RoomCreate, RoomStatus, RoomUpdate


class RoomService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_room

    def create_room(self, room_in: RoomCreate) -> Room:
        """Create room with validations."""
        # Check if room number exists
        if self.crud.get_by_room_number(self.session, room_number=room_in.room_number):
            raise AlreadyExistsError("room_number", "Room number already exists")

        return self.crud.create(self.session, obj_in=room_in)

    def update_room(self, room: Room, room_in: RoomUpdate) -> Room:
        """Update room with validations."""
        if room_in.room_number and room_in.room_number != room.room_number:
            if self.crud.get_by_room_number(self.session, room_number=room_in.room_number):
                raise AlreadyExistsError("room_number", "Room number already exists")

        return self.crud.update(self.session, db_obj=room, obj_in=room_in)

    def delete_room(self, room_id: str) -> Room | None:
        """Delete room with validation."""
        from uuid import UUID

        from app.crud.booking import booking as crud_booking

        # Convert string to UUID
        room_uuid = UUID(room_id)

        # Check for existing bookings
        if crud_booking.count_filtered(self.session, room_id=room_uuid) > 0:
            raise BusinessRuleViolation("Cannot delete room with existing bookings")

        return self.crud.delete(self.session, id=room_uuid)

    def get_room_or_404(self, room_id: uuid.UUID) -> Room:
        """Get room by ID or raise NotFoundError."""
        room = self.crud.get(self.session, id=room_id)
        if not room:
            raise NotFoundError("Room", str(room_id))
        return room

    def get_room_for_delete(self, room_id: uuid.UUID) -> Room:
        """Get room and validate for deletion."""
        room = self.get_room_or_404(room_id)

        # Check business rules for deletion
        from app.crud.booking import booking as crud_booking

        active_count = crud_booking.count_filtered(self.session, room_id=room_id)
        if active_count > 0:
            raise BusinessRuleViolation(f"Cannot delete room with {active_count} booking(s). Please cancel or complete them first.")

        return room

    def validate_room_status_change(self, room: Room, new_status: RoomStatus, current_user: "User") -> None:
        """Validate room status change permissions and business rules."""
        from app.models import UserRole

        # Permission checks based on role
        if current_user.role == UserRole.HOST:
            if room.status != RoomStatus.CLEANING or new_status != RoomStatus.AVAILABLE:
                raise BusinessRuleViolation("Hosts can only mark rooms as available after cleaning")
        elif current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and not current_user.is_superuser:
            raise BusinessRuleViolation("You don't have permission to change room status")

        # Business rule validation
        if new_status == RoomStatus.OCCUPIED:
            from app.crud.booking import booking as crud_booking
            active_bookings = crud_booking.get_multi_filtered(
                self.session, room_id=room.id, status=BookingStatus.CHECKED_IN, limit=1
            )
            if not active_bookings:
                raise BusinessRuleViolation("Cannot mark room as occupied without an active checked-in booking")
