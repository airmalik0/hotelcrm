import uuid

from sqlmodel import Session

from app.crud.room import room as crud_room
from app.models import Room, RoomCreate, RoomsPublic, RoomUpdate


class RoomService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_room

    def get_rooms(self, skip: int = 0, limit: int = 100) -> RoomsPublic:
        """
        Get rooms with pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            RoomsPublic with data and count
        """
        rooms = self.crud.get_multi(self.session, skip=skip, limit=limit)
        count = self.crud.count(self.session)
        return RoomsPublic(data=rooms, count=count)

    def get_room_by_id(self, room_id: uuid.UUID) -> Room:
        """
        Get room by ID.

        Args:
            room_id: Room UUID

        Returns:
            Room object

        Raises:
            ValueError: If room not found
        """
        room = self.crud.get(self.session, id=room_id)
        if not room:
            raise ValueError("Room not found")
        return room

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
