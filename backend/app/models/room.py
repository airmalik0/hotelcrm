import re
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import field_validator
from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, Relationship, SQLModel

from .common import RoomStatus, RoomType

if TYPE_CHECKING:
    from .booking import Booking


class RoomBase(SQLModel):
    room_number: str = Field(unique=True, index=True, min_length=1, max_length=10)
    floor: int = Field(ge=1, le=20)
    room_type: RoomType
    price_per_night: float = Field(gt=0, le=100000)
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    version: int = Field(default=0, index=True)

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
    room_type: RoomType | None = None
    price_per_night: float | None = None
    status: RoomStatus | None = None
    description: str | None = None
    room_photo_paths: list[str] | None = None


class RoomPublic(RoomBase):
    id: uuid.UUID
    created_at: datetime


class RoomsPublic(SQLModel):
    data: list[RoomPublic]
    count: int
