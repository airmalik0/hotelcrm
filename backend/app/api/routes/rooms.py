import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Room,
    RoomCreate,
    RoomPublic,
    RoomUpdate,
    RoomsPublic,
    RoomStatus,
)

router = APIRouter()


@router.get("/", response_model=RoomsPublic)
def read_rooms(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve rooms.
    """
    statement = select(Room).offset(skip).limit(limit)
    rooms = session.exec(statement).all()
    count_statement = select(Room)
    count = len(session.exec(count_statement).all())
    return RoomsPublic(data=rooms, count=count)


@router.get("/{room_id}", response_model=RoomPublic)
def read_room(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    room_id: uuid.UUID,
) -> Any:
    """
    Get room by ID.
    """
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/", response_model=RoomPublic)
def create_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    room_in: RoomCreate,
) -> Any:
    """
    Create new room.
    """
    # Check if room number already exists
    statement = select(Room).where(Room.room_number == room_in.room_number)
    existing_room = session.exec(statement).first()
    if existing_room:
        raise HTTPException(
            status_code=400,
            detail="Room with this number already exists",
        )
    
    room = Room.model_validate(room_in)
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@router.put("/{room_id}", response_model=RoomPublic)
def update_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    room_id: uuid.UUID,
    room_in: RoomUpdate,
) -> Any:
    """
    Update a room.
    """
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    update_dict = room_in.model_dump(exclude_unset=True)
    room.sqlmodel_update(update_dict)
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@router.delete("/{room_id}")
def delete_room(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    room_id: uuid.UUID,
) -> Any:
    """
    Delete a room.
    """
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check if room has bookings
    if room.bookings:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete room with existing bookings",
        )
    
    session.delete(room)
    session.commit()
    return {"message": "Room deleted successfully"}


@router.get("/available/", response_model=RoomsPublic)
def read_available_rooms(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve available rooms.
    """
    statement = select(Room).where(Room.status == RoomStatus.AVAILABLE).offset(skip).limit(limit)
    rooms = session.exec(statement).all()
    count_statement = select(Room).where(Room.status == RoomStatus.AVAILABLE)
    count = len(session.exec(count_statement).all())
    return RoomsPublic(data=rooms, count=count)