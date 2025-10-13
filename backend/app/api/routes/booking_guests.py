import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
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
    current_user: CurrentUser,  # noqa: ARG001 - needed for authentication
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
    current_user: CurrentUser,  # noqa: ARG001 - needed for authentication
    booking_id: uuid.UUID,
    guest_in: BookingGuestCreate,
) -> Any:
    """
    Add a guest to a booking.

    - **customer_id**: Optional - link to existing customer
    - **full_name**: Required if not linking to customer
    - **passport_photo_path**: Required - upload via /api/v1/files/upload/passport first
    - **origin_city**: Required - where the guest is from
    - **save_to_customers**: If true, creates/links customer in database
    """
    service = BookingGuestService(session)
    guest = service.add_guest_to_booking(booking_id, guest_in)
    session.commit()
    session.refresh(guest)
    return guest


@router.put("/{booking_id}/guests/{guest_id}", response_model=BookingGuestPublic)
def update_booking_guest(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001 - needed for authentication
    booking_id: uuid.UUID,  # noqa: ARG001 - needed for route consistency
    guest_id: uuid.UUID,
    guest_in: BookingGuestUpdate,
) -> Any:
    """
    Update guest information.

    Note: Cannot update primary guest (booking holder).
    """
    service = BookingGuestService(session)
    guest = service.update_guest(guest_id, guest_in)
    session.commit()
    session.refresh(guest)
    return guest


@router.delete(
    "/{booking_id}/guests/{guest_id}",
    dependencies=[Depends(get_current_active_superuser)],
)
def remove_guest_from_booking(
    *,
    session: SessionDep,
    booking_id: uuid.UUID,  # noqa: ARG001 - needed for route consistency
    guest_id: uuid.UUID,
) -> Message:
    """
    Remove a guest from a booking.

    Note: Cannot remove primary guest (booking holder).
    Only admins can remove guests.
    """
    service = BookingGuestService(session)
    service.remove_guest_from_booking(guest_id)
    session.commit()
    return Message(message="Guest removed successfully")
