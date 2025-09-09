import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.room import room as crud_room
from app.models import (
    Message,
    RoomCreate,
    RoomPublic,
    RoomsPublic,
    RoomUpdate,
)
from app.services.room import RoomService

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
    rooms = crud_room.get_multi(session, skip=skip, limit=limit)
    count = crud_room.count(session)
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
    room = crud_room.get(session, id=room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/", response_model=RoomPublic, dependencies=[Depends(require_admin_or_manager)])
def create_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    room_in: RoomCreate,
) -> Any:
    """
    Create new room. Only admin and manager can create rooms.
    """
    service = RoomService(session)

    try:
        room = service.create_room(room_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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


@router.put("/{room_id}", response_model=RoomPublic, dependencies=[Depends(require_admin_or_manager)])
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
    room = crud_room.get(session, id=room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    service = RoomService(session)

    # Get old values for audit
    update_dict = room_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(room, update_dict)

    try:
        room = service.update_room(room, room_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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


@router.delete("/{room_id}", response_model=Message, dependencies=[Depends(require_admin_or_manager)])
def delete_room(
    session: SessionDep,
    current_user: CurrentUser,
    room_id: uuid.UUID,
) -> Any:
    """
    Delete a room. Only admin and manager can delete rooms.
    """
    room = crud_room.get(session, id=room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check for existing bookings
    from app.crud.booking import booking as crud_booking

    # Count active bookings
    active_count = crud_booking.count_filtered(
        session,
        room_id=room_id
    )

    if active_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete room with {active_count} booking(s). Please cancel or complete them first.",
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

    crud_room.delete(session, id=room_id)
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
    rooms = crud_room.get_available(session, skip=skip, limit=limit)
    count = crud_room.count_available(session)
    return RoomsPublic(data=rooms, count=count)
