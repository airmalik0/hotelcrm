import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_entity_name, log_audit
from app.crud.booking import booking as crud_booking
from app.models.booking_guest import (
    BookingGuestCreate,
    BookingGuestPublic,
    BookingGuestsPublic,
    BookingGuestUpdate,
)
from app.models.common import Message
from app.services.booking_guest import BookingGuestService

router = APIRouter()


@router.get("/{booking_id}/guests", response_model=BookingGuestsPublic)
def get_booking_guests(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_id: uuid.UUID,
) -> Any:
    """
    Get all guests for a booking.
    """
    service = BookingGuestService(session)
    guests = service.crud.get_by_booking(session, booking_id=booking_id)
    return BookingGuestsPublic(data=guests, count=len(guests))


@router.post("/{booking_id}/guests", response_model=BookingGuestPublic)
def add_guest_to_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    guest_in: BookingGuestCreate,
) -> Any:
    """
    Add a guest to a booking.

    - **customer_id**: Optional — link to existing customer
    - **first_name/last_name**: Required if not linking to customer
    - **passport_photo_path**: Required — upload via /api/v1/files/upload/passport first
    - **location**: Uses the same geo fields as customers (`country_code`, `region`, `district`)
    """
    service = BookingGuestService(session)
    guest = service.add_guest_to_booking(booking_id, guest_in)

    # Log audit
    booking = crud_booking.get(session, id=booking_id)
    entity_name = get_entity_name("booking", booking) if booking else f"Booking #{booking_id}"
    guest_name = f"{guest.first_name or ''} {guest.last_name or ''}".strip() or "N/A"

    log_audit(
        session=session,
        user=current_user,
        action="added_guest",
        entity_type="booking",
        entity_id=booking_id,
        entity_name=entity_name,
        description=f"Added guest: {guest_name}",
    )

    session.commit()
    session.refresh(guest)
    return guest


@router.put("/{booking_id}/guests/{guest_id}", response_model=BookingGuestPublic)
def update_booking_guest(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,  # noqa: ARG001
    guest_id: uuid.UUID,
    guest_in: BookingGuestUpdate,
) -> Any:
    """
    Update guest information.

    Note: Cannot update primary guest (booking holder).
    """
    service = BookingGuestService(session)
    guest = service.update_guest(guest_id, guest_in)

    # Log audit
    guest_name = f"{guest.first_name or ''} {guest.last_name or ''}".strip() or "N/A"

    log_audit(
        session=session,
        user=current_user,
        action="updated_guest",
        entity_type="booking_guest",
        entity_id=guest_id,
        entity_name=guest_name,
        description=f"Updated guest: {guest_name}",
    )

    session.commit()
    session.refresh(guest)
    return guest


@router.delete(
    "/{booking_id}/guests/{guest_id}",
    dependencies=[Depends(require_admin_or_manager)],
)
def remove_guest_from_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    guest_id: uuid.UUID,
) -> Message:
    """
    Remove a guest from a booking.

    Note: Cannot remove primary guest (booking holder).
    Only admins and managers can remove guests.
    """
    service = BookingGuestService(session)
    guest = service.get_guest_or_404(guest_id)

    # Log audit before deletion
    booking = crud_booking.get(session, id=booking_id)
    entity_name = get_entity_name("booking", booking) if booking else f"Booking #{booking_id}"
    guest_name = f"{guest.first_name or ''} {guest.last_name or ''}".strip() or "N/A"

    log_audit(
        session=session,
        user=current_user,
        action="removed_guest",
        entity_type="booking",
        entity_id=booking_id,
        entity_name=entity_name,
        description=f"Removed guest: {guest_name}",
    )

    service.remove_guest_from_booking(guest_id)
    session.commit()
    return Message(message="Guest removed successfully")
