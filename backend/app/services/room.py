
from sqlmodel import Session

from app.crud.room import room as crud_room
from app.models import Room, RoomCreate, RoomUpdate


class RoomService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_room

    def create_room(self, room_in: RoomCreate) -> Room:
        """Create room with validations."""
        # Check if room number exists
        if self.crud.get_by_room_number(self.session, room_number=room_in.room_number):
            raise ValueError("Room number already exists")

        return self.crud.create(self.session, obj_in=room_in)

    def update_room(self, room: Room, room_in: RoomUpdate) -> Room:
        """Update room with validations."""
        if room_in.room_number and room_in.room_number != room.room_number:
            if self.crud.get_by_room_number(self.session, room_number=room_in.room_number):
                raise ValueError("Room number already exists")

        return self.crud.update(self.session, db_obj=room, obj_in=room_in)

    def delete_room(self, room_id: str) -> Room | None:
        """Delete room with validation."""
        from uuid import UUID

        from app.crud.booking import booking as crud_booking

        # Convert string to UUID
        room_uuid = UUID(room_id)

        # Check for existing bookings
        if crud_booking.count_filtered(self.session, room_id=room_uuid) > 0:
            raise ValueError("Cannot delete room with existing bookings")

        return self.crud.delete(self.session, id=room_uuid)
