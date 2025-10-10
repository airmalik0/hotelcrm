import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.room import room as crud_room
from app.crud.room import room_category as crud_room_category
from app.models import (
    Message,
    RoomCategoriesPublic,
    RoomCategoryCreate,
    RoomCategoryPublic,
    RoomCreate,
    RoomPublic,
    RoomsPublic,
    RoomStatus,
    RoomUpdate,
)
from app.services.room import RoomCategoryService, RoomService

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


@router.get("/{room_id:uuid}", response_model=RoomPublic)
def read_room(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    room_id: uuid.UUID,
) -> Any:
    """
    Get room by ID.
    """
    service = RoomService(session)
    room = service.get_room_or_404(room_id)
    # Ensure category relationship is loaded for response
    _ = room.category  # access to trigger load if not already
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

    room = service.create_room(room_in)

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


@router.put("/{room_id:uuid}", response_model=RoomPublic, dependencies=[Depends(require_admin_or_manager)])
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
    service = RoomService(session)
    room = service.get_room_or_404(room_id)

    # Get old values for audit
    update_dict = room_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(room, update_dict)

    room = service.update_room(room, room_in)

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


@router.delete("/{room_id:uuid}", response_model=Message, dependencies=[Depends(require_admin_or_manager)])
def delete_room(
    session: SessionDep,
    current_user: CurrentUser,
    room_id: uuid.UUID,
) -> Any:
    """
    Delete a room. Only admin and manager can delete rooms.
    """
    service = RoomService(session)
    room = service.get_room_for_delete(room_id)

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


# Room Category Routes
@router.get("/categories", response_model=RoomCategoriesPublic)
def read_room_categories(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
) -> Any:
    categories = crud_room_category.get_multi(session, skip=skip, limit=limit)
    count = crud_room_category.count(session)
    return RoomCategoriesPublic(data=categories, count=count)


@router.post("/categories", response_model=RoomCategoryPublic, dependencies=[Depends(require_admin_or_manager)])
def create_room_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    category_in: RoomCategoryCreate,
) -> Any:
    service = RoomCategoryService(session)
    category = service.create_category(category_in)

    entity_name = get_entity_name("room_category", category)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="room_category",
        entity_id=category.id,
        entity_name=entity_name,
    )

    session.commit()
    session.refresh(category)
    return category


@router.delete("/categories/{category_id}", response_model=Message, dependencies=[Depends(require_admin_or_manager)])
def delete_room_category(
    session: SessionDep,
    current_user: CurrentUser,
    category_id: uuid.UUID,
) -> Any:
    service = RoomCategoryService(session)
    category = service.get_category_for_delete(category_id)

    entity_name = get_entity_name("room_category", category)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="room_category",
        entity_id=category.id,
        entity_name=entity_name,
    )

    service.delete_category(category_id)
    session.commit()
    return Message(message="Room category deleted successfully")


@router.post("/{room_id:uuid}/status", response_model=RoomPublic)
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
    service = RoomService(session)
    room = service.get_room_or_404(room_id)

    # Validate permissions and business rules
    service.validate_room_status_change(room, status, current_user)

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
