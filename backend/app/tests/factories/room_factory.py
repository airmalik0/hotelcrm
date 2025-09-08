"""Room factory for creating test rooms."""
import random
from typing import Any

from sqlmodel import Session

from app.models import Room, RoomCreate, RoomStatus, RoomType, RoomUpdate


class RoomFactory:
    """Factory for creating test rooms."""

    @staticmethod
    def create_test_room(
        session: Session,
        room_number: str | None = None,
        floor: int | None = None,
        room_type: RoomType = RoomType.STANDARD,
        price_per_night: float | None = None,
        status: RoomStatus = RoomStatus.AVAILABLE,
        description: str | None = None,
        room_photo_paths: list[str] | None = None,
    ) -> Room:
        """
        Create a test room.

        Args:
            session: Database session
            room_number: Room number (auto-generated if None)
            floor: Floor number (random 1-10 if None)
            room_type: Type of room
            price_per_night: Price per night (random based on type if None)
            status: Room status
            description: Room description
            room_photo_paths: List of photo paths

        Returns:
            Created room
        """
        if room_number is None:
            room_number = f"R{random.randint(100, 999)}"

        if floor is None:
            floor = random.randint(1, 10)

        if price_per_night is None:
            if room_type == RoomType.VIP:
                price_per_night = random.uniform(150.0, 500.0)
            else:
                price_per_night = random.uniform(50.0, 150.0)

        room_in = RoomCreate(
            room_number=room_number,
            floor=floor,
            room_type=room_type,
            price_per_night=price_per_night,
            status=status,
            description=description or f"Test {room_type.value} room on floor {floor}",
            room_photo_paths=room_photo_paths or [],
        )

        room = Room.model_validate(room_in)
        session.add(room)
        session.commit()
        session.refresh(room)
        return room

    @staticmethod
    def create_standard_room(
        session: Session,
        room_number: str | None = None,
        price_per_night: float = 100.0,
        status: RoomStatus = RoomStatus.AVAILABLE,
    ) -> Room:
        """Create a standard room."""
        return RoomFactory.create_test_room(
            session=session,
            room_number=room_number,
            room_type=RoomType.STANDARD,
            price_per_night=price_per_night,
            status=status,
        )

    @staticmethod
    def create_vip_room(
        session: Session,
        room_number: str | None = None,
        price_per_night: float = 300.0,
        status: RoomStatus = RoomStatus.AVAILABLE,
    ) -> Room:
        """Create a VIP room."""
        return RoomFactory.create_test_room(
            session=session,
            room_number=room_number,
            room_type=RoomType.VIP,
            price_per_night=price_per_night,
            status=status,
        )

    @staticmethod
    def create_occupied_room(
        session: Session,
        room_number: str | None = None,
    ) -> Room:
        """Create an occupied room."""
        return RoomFactory.create_test_room(
            session=session,
            room_number=room_number,
            status=RoomStatus.OCCUPIED,
        )

    @staticmethod
    def create_cleaning_room(
        session: Session,
        room_number: str | None = None,
    ) -> Room:
        """Create a room in cleaning status."""
        return RoomFactory.create_test_room(
            session=session,
            room_number=room_number,
            status=RoomStatus.CLEANING,
        )

    @staticmethod
    def create_maintenance_room(
        session: Session,
        room_number: str | None = None,
    ) -> Room:
        """Create a room in maintenance status."""
        return RoomFactory.create_test_room(
            session=session,
            room_number=room_number,
            status=RoomStatus.MAINTENANCE,
        )

    @staticmethod
    def update_room(
        session: Session,
        room: Room,
        **kwargs: Any,
    ) -> Room:
        """Update a room with given data."""
        room_update = RoomUpdate(**kwargs)
        update_dict = room_update.model_dump(exclude_unset=True)
        room.sqlmodel_update(update_dict)
        session.add(room)
        session.commit()
        session.refresh(room)
        return room

    @staticmethod
    def create_multiple_rooms(
        session: Session,
        count: int = 5,
        floor: int | None = None,
        room_type: RoomType | None = None,
    ) -> list[Room]:
        """Create multiple test rooms."""
        rooms = []
        for i in range(count):
            room = RoomFactory.create_test_room(
                session=session,
                room_number=f"R{100 + i}",
                floor=floor or (i % 5 + 1),
                room_type=room_type or random.choice(list(RoomType)),
            )
            rooms.append(room)
        return rooms
