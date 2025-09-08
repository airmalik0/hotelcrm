import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.rbac import check_admin_or_manager
from app.models import (
    Message,
    Room,
    RoomCreate,
    RoomPublic,
    RoomsPublic,
    RoomStatus,
    RoomUpdate,
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
    count = session.exec(select(func.count()).select_from(Room)).one()
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
    current_user: CurrentUser,
    room_in: RoomCreate,
) -> Any:
    """
    Create new room. Only admin and manager can create rooms.
    """
    check_admin_or_manager(current_user)
    # Room number uniqueness is enforced at the database level
    # The model validator will normalize the room number to uppercase
    room = Room.model_validate(room_in)
    session.add(room)
    session.flush()  # Get ID without committing

    # Log audit in the same transaction
    entity_name = get_entity_name("room", room)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="room",
        entity_id=room.id,
        entity_name=entity_name,
    )

    # Single commit for both room and audit
    session.commit()
    session.refresh(room)
    return room


@router.put("/{room_id}", response_model=RoomPublic)
def update_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    room_id: uuid.UUID,
    room_in: RoomUpdate,
) -> Any:
    """
    Update a room. Only admin and manager can update rooms.
    """
    check_admin_or_manager(current_user)
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Room number uniqueness is enforced at the database level
    update_dict = room_in.model_dump(exclude_unset=True)

    # Get old and new values for audit
    old_values, new_values = get_change_values(room, update_dict)

    room.sqlmodel_update(update_dict)
    session.add(room)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("room", room)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="room",
            entity_id=room.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    # Single commit for both room update and audit
    session.commit()
    session.refresh(room)
    return room


@router.delete("/{room_id}", response_model=Message)
def delete_room(
    session: SessionDep,
    current_user: CurrentUser,
    room_id: uuid.UUID,
) -> Any:
    """
    Delete a room. Only admin and manager can delete rooms.
    """
    check_admin_or_manager(current_user)
    room = session.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if room has bookings using COUNT queries (more efficient than loading all bookings)
    from app.models import Booking, BookingStatus

    # Count active bookings
    active_count = session.exec(
        select(func.count()).select_from(Booking).where(
            Booking.room_id == room_id,
            ~Booking.status.in_([BookingStatus.CANCELLED, BookingStatus.CHECKED_OUT])  # type: ignore[attr-defined]
        )
    ).one()

    if active_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete room with {active_count} active booking(s). Please cancel or complete them first.",
        )

    # Count total bookings (including historical)
    total_count = session.exec(
        select(func.count()).select_from(Booking).where(Booking.room_id == room_id)
    ).one()

    if total_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete room with {total_count} historical booking(s). Consider archiving instead.",
        )

    # Log audit before deletion
    entity_name = get_entity_name("room", room)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="room",
        entity_id=room.id,
        entity_name=entity_name,
    )

    session.delete(room)
    session.commit()
    return Message(message="Room deleted successfully")


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
    count = session.exec(
        select(func.count()).select_from(Room).where(Room.status == RoomStatus.AVAILABLE)
    ).one()
    return RoomsPublic(data=rooms, count=count)
