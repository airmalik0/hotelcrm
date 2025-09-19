import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.room import room as crud_room
from app.models import (
    BookingStatus,
    Message,
    RoomCreate,
    RoomPublic,
    RoomsPublic,
    RoomStatus,
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
    service = RoomService(session)
    return service.get_rooms(skip=skip, limit=limit)


@router.get("/{room_id}", response_model=RoomPublic)
def read_room(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    room_id: uuid.UUID,
) -> Any:
    """
    Get room by ID.
    """
    service = RoomService(session)
    try:
        return service.get_room_by_id(room_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


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


@router.post("/{room_id}/status", response_model=RoomPublic)
def update_room_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    room_id: uuid.UUID,
    status: RoomStatus,
) -> Any:
    """
    Update room status. Available to all authenticated users.
    Hosts can mark rooms as available after cleaning.
    Managers and admins can set any status.
    """
    from app.models import UserRole

    room = crud_room.get(session, id=room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Permission checks based on role
    if current_user.role == UserRole.HOST:
        # Hosts can only change status from CLEANING to AVAILABLE
        if room.status != RoomStatus.CLEANING or status != RoomStatus.AVAILABLE:
            raise HTTPException(
                status_code=403,
                detail="Hosts can only mark rooms as available after cleaning"
            )
    elif current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to change room status"
        )

    # Additional validation for status changes
    if status == RoomStatus.OCCUPIED:
        # Check if there's an active booking for this room
        from app.crud.booking import booking as crud_booking

        active_bookings = crud_booking.get_multi_filtered(
            session,
            room_id=room_id,
            status=BookingStatus.CHECKED_IN,
            limit=1
        )
        if not active_bookings:
            raise HTTPException(
                status_code=400,
                detail="Cannot mark room as occupied without an active checked-in booking"
            )

    # Log the old status for audit
    old_status = room.status

    # Update room status
    crud_room.update_status(session, room=room, status=status)

    # Log audit
    entity_name = get_entity_name("room", room)
    log_audit(
        session=session,
        user=current_user,
        action="status_changed",
        entity_type="room",
        entity_id=room.id,
        entity_name=entity_name,
        old_values={"status": old_status.value},
        new_values={"status": status.value},
    )

    session.commit()
    session.refresh(room)
    return room
