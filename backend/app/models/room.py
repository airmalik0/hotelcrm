import re
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import field_validator
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from .common import RoomStatus
from .room_category import RoomCategoryPublic  # for typing in public schema

if TYPE_CHECKING:
    from .booking import Booking
    from .room_category import RoomCategory


class RoomBase(SQLModel):
    room_number: str = Field(unique=True, index=True, min_length=1, max_length=10)
    floor: int = Field(ge=1, le=20)
    category_id: uuid.UUID | None = Field(default=None, foreign_key="roomcategory.id", index=True)
    price_per_night: float = Field(gt=0, le=100000)
    max_occupancy: int = Field(default=2, ge=1, le=10, description="Maximum number of guests allowed in the room")
    status: RoomStatus = Field(default=RoomStatus.AVAILABLE)
    description: str | None = Field(default=None, max_length=500)
    room_photo_paths: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Room number cannot be empty")
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9-]*$", v.strip()):
            raise ValueError("Room number must start with letter or number and contain only letters, numbers, and hyphens")
        return v.strip().upper()


class Room(RoomBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    bookings: list["Booking"] = Relationship(back_populates="room")
    category: Optional["RoomCategory"] = Relationship(back_populates="rooms")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))

    def is_status_transition_valid(self, new_status: RoomStatus) -> bool:
        valid_transitions = {
            RoomStatus.AVAILABLE: [RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE, RoomStatus.CLEANING],
            RoomStatus.OCCUPIED: [RoomStatus.CLEANING],
            RoomStatus.CLEANING: [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
            RoomStatus.MAINTENANCE: [RoomStatus.AVAILABLE, RoomStatus.CLEANING],
        }
        return new_status in valid_transitions.get(self.status, [])

    def get_next_status_after_checkout(self) -> RoomStatus:
        return RoomStatus.CLEANING


class RoomCreate(RoomBase):
    pass


class RoomUpdate(SQLModel):
    room_number: str | None = None
    floor: int | None = None
    category_id: uuid.UUID | None = None
    price_per_night: float | None = None
    max_occupancy: int | None = Field(default=None, ge=1, le=10)
    status: RoomStatus | None = None
    description: str | None = None
    room_photo_paths: list[str] | None = None


class RoomPublic(RoomBase):
    id: uuid.UUID
    created_at: datetime
    # Optional expanded category info for convenience in some endpoints
    category: RoomCategoryPublic | None = None


class RoomsPublic(SQLModel):
    data: list[RoomPublic]
    count: int
