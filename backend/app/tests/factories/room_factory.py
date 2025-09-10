"""Room factory for creating test rooms."""
import random
from typing import Any

from sqlmodel import Session

from app.crud.room import room as crud_room
from app.models import Room, RoomCreate, RoomStatus, RoomType, RoomUpdate
from app.tests.factories.base import BaseFactory


class RoomFactory(BaseFactory[Room, RoomCreate]):
    """
    Factory for creating test rooms.
    
    Uses CRUD layer for all database operations.
    No business logic - just test data creation.
    """
    
    model = Room
    create_schema = RoomCreate
    crud = crud_room
    
    @classmethod
    def get_defaults(cls, **overrides: Any) -> dict[str, Any]:
        """Get default values for room creation."""
        # Determine room type first to set appropriate price
        room_type = overrides.get("room_type", RoomType.STANDARD)
        
        if "price_per_night" not in overrides:
            if room_type == RoomType.VIP:
                price_per_night = random.uniform(150.0, 500.0)
            else:
                price_per_night = random.uniform(50.0, 150.0)
        else:
            price_per_night = overrides["price_per_night"]
        
        floor = overrides.get("floor", random.randint(1, 10))
        
        defaults = {
            "room_number": f"R{random.randint(100, 999)}",
            "floor": floor,
            "room_type": room_type,
            "price_per_night": price_per_night,
            "status": RoomStatus.AVAILABLE,
            "description": f"Test {room_type.value} room on floor {floor}",
            "room_photo_paths": [],
        }
        
        # Apply overrides
        defaults.update(overrides)
        
        return defaults

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
        Create a test room (backward compatibility).
        
        DEPRECATED: Use RoomFactory.create() instead.
        """
        kwargs = {
            "room_type": room_type,
            "status": status,
        }
        
        if room_number is not None:
            kwargs["room_number"] = room_number
        if floor is not None:
            kwargs["floor"] = floor
        if price_per_night is not None:
            kwargs["price_per_night"] = price_per_night
        if description is not None:
            kwargs["description"] = description
        if room_photo_paths is not None:
            kwargs["room_photo_paths"] = room_photo_paths
        
        return RoomFactory.create(session, **kwargs)

    @staticmethod
    def create_standard_room(
        session: Session,
        room_number: str | None = None,
        price_per_night: float = 100.0,
        status: RoomStatus = RoomStatus.AVAILABLE,
    ) -> Room:
        """Create a standard room."""
        kwargs = {
            "room_type": RoomType.STANDARD,
            "price_per_night": price_per_night,
            "status": status,
        }
        if room_number is not None:
            kwargs["room_number"] = room_number
        
        return RoomFactory.create(session, **kwargs)

    @staticmethod
    def create_vip_room(
        session: Session,
        room_number: str | None = None,
        price_per_night: float = 300.0,
        status: RoomStatus = RoomStatus.AVAILABLE,
    ) -> Room:
        """Create a VIP room."""
        kwargs = {
            "room_type": RoomType.VIP,
            "price_per_night": price_per_night,
            "status": status,
        }
        if room_number is not None:
            kwargs["room_number"] = room_number
        
        return RoomFactory.create(session, **kwargs)

    @staticmethod
    def create_occupied_room(
        session: Session,
        room_number: str | None = None,
    ) -> Room:
        """Create an occupied room."""
        kwargs = {
            "status": RoomStatus.OCCUPIED,
        }
        if room_number is not None:
            kwargs["room_number"] = room_number
        
        return RoomFactory.create(session, **kwargs)

    @staticmethod
    def create_cleaning_room(
        session: Session,
        room_number: str | None = None,
    ) -> Room:
        """Create a room in cleaning status."""
        kwargs = {
            "status": RoomStatus.CLEANING,
        }
        if room_number is not None:
            kwargs["room_number"] = room_number
        
        return RoomFactory.create(session, **kwargs)

    @staticmethod
    def create_maintenance_room(
        session: Session,
        room_number: str | None = None,
    ) -> Room:
        """Create a room in maintenance status."""
        kwargs = {
            "status": RoomStatus.MAINTENANCE,
        }
        if room_number is not None:
            kwargs["room_number"] = room_number
        
        return RoomFactory.create(session, **kwargs)

    @staticmethod
    def update_room(
        session: Session,
        room: Room,
        **kwargs: Any,
    ) -> Room:
        """
        Update a room with given data.
        
        Uses CRUD layer for proper update handling.
        """
        room_update = RoomUpdate(**kwargs)
        updated = crud_room.update(session, db_obj=room, obj_in=room_update)
        session.flush()
        return updated

    @staticmethod
    def create_multiple_rooms(
        session: Session,
        count: int = 5,
        floor: int | None = None,
        room_type: RoomType | None = None,
    ) -> list[Room]:
        """Create multiple test rooms."""
        return RoomFactory.create_batch(
            session,
            count=count,
            room_number=lambda i: f"R{100 + i}",
            floor=floor if floor is not None else lambda i: (i % 5 + 1),
            room_type=room_type if room_type is not None else lambda i: random.choice(list(RoomType)),
        )