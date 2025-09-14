import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.rate_limit import RateLimits, limiter
from app.crud.base import ConcurrentUpdateError
from app.crud.booking import booking as crud_booking
from app.models import (
    BookingCreate,
    BookingPublic,
    BookingsPublic,
    BookingStatus,
    BookingUpdate,
    Message,
)
from app.services.booking import BookingService

router = APIRouter()


@router.get("/", response_model=BookingsPublic)
@limiter.limit(RateLimits.READ_LIST)
def read_bookings(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
    status: BookingStatus | None = None,
    room_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
) -> Any:
    """
    Retrieve bookings.
    """
    bookings = crud_booking.get_multi_filtered(
        session,
        skip=skip,
        limit=limit,
        status=status,
        room_id=room_id,
        customer_id=customer_id
    )
    count = crud_booking.count_filtered(
        session,
        status=status,
        room_id=room_id,
        customer_id=customer_id
    )
    return BookingsPublic(data=bookings, count=count)


@router.get("/{booking_id}", response_model=BookingPublic)
def read_booking(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_id: uuid.UUID,
) -> Any:
    """
    Get booking by ID.
    """
    booking = crud_booking.get_with_relations(session, booking_id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/", response_model=BookingPublic)
@limiter.limit(RateLimits.BOOKING_CREATE)
def create_booking(
    *,
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: CurrentUser,
    booking_in: BookingCreate,
) -> Any:
    """
    Create new booking.
    """
    service = BookingService(session)

    try:
        booking = service.create_booking(booking_in)

        # Log audit
        entity_name = get_entity_name("booking", booking)
        log_audit(
            session=session,
            user=current_user,
            action="created",
            entity_type="booking",
            entity_id=booking.id,
            entity_name=entity_name,
        )

        # Commit everything
        session.commit()

        # Get booking with relationships in one query
        return crud_booking.get_with_relations(session, booking_id=booking.id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConcurrentUpdateError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/{booking_id}", response_model=BookingPublic)
def update_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    booking_in: BookingUpdate,
) -> Any:
    """
    Update a booking.
    """
    booking = crud_booking.get(session, id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check permissions for specific operations
    # Only admin/manager can change discount
    if booking_in.discount is not None and booking_in.discount != booking.discount:
        require_admin_or_manager(current_user)

    # Only admin/manager can directly change total_amount without recalculation
    if booking_in.total_amount is not None and not any([
        booking_in.check_in, booking_in.check_out, booking_in.room_id,
        booking_in.discount is not None
    ]):
        require_admin_or_manager(current_user)

    # Only admin/manager can change payment method on checked-in booking
    if booking_in.payment_method and booking.status == BookingStatus.CHECKED_IN:
        require_admin_or_manager(current_user)

    # Special status transitions
    if booking_in.status and booking_in.status != booking.status:
        # Only admin/manager can cancel checked-out bookings
        if booking.status == BookingStatus.CHECKED_OUT and booking_in.status == BookingStatus.CANCELLED:
            require_admin_or_manager(current_user)
        # Validate other transitions
        elif not booking.is_status_transition_valid(booking_in.status):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from {booking.status} to {booking_in.status}"
            )

    service = BookingService(session)

    # Get old values for audit
    update_dict = booking_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(booking, update_dict)

    try:
        # Handle special status changes
        if booking_in.status == BookingStatus.CANCELLED and booking.status != BookingStatus.CANCELLED:
            booking = service.cancel_booking(booking)
        elif booking_in.status == BookingStatus.CHECKED_IN and booking.status == BookingStatus.CONFIRMED:
            booking = service.check_in_booking(booking)
        elif booking_in.status == BookingStatus.CHECKED_OUT and booking.status == BookingStatus.CHECKED_IN:
            booking = service.check_out_booking(booking)
        else:
            # Regular update
            booking = service.update_booking(booking, booking_in)

        # Log audit if there were changes
        if old_values:
            entity_name = get_entity_name("booking", booking)
            log_audit(
                session=session,
                user=current_user,
                action="updated",
                entity_type="booking",
                entity_id=booking.id,
                entity_name=entity_name,
                old_values=old_values,
                new_values=new_values,
            )

        session.commit()
        session.refresh(booking)

        # Reload with relationships
        return crud_booking.get_with_relations(session, booking_id=booking.id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConcurrentUpdateError as e:
        raise HTTPException(status_code=409, detail=str(e))



@router.delete("/{booking_id}", response_model=Message)
def delete_booking(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Delete a booking.
    """
    booking = crud_booking.get(session, id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    service = BookingService(session)

    # Log audit before deletion
    entity_name = get_entity_name("booking", booking)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="booking",
        entity_id=booking.id,
        entity_name=entity_name,
    )

    # Use service to handle deletion properly
    service.delete_booking(booking)
    session.commit()

    return Message(message="Booking deleted successfully")


@router.post("/{booking_id}/check-in", response_model=BookingPublic)
def check_in_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Check in a booking.
    """
    booking = crud_booking.get(session, id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    service = BookingService(session)

    try:
        booking = service.check_in_booking(booking)

        # Log audit
        entity_name = get_entity_name("booking", booking)
        log_audit(
            session=session,
            user=current_user,
            action="checked_in",
            entity_type="booking",
            entity_id=booking.id,
            entity_name=entity_name,
        )

        session.commit()
        session.refresh(booking)

        # Reload with relationships
        return crud_booking.get_with_relations(session, booking_id=booking.id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConcurrentUpdateError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/{booking_id}/check-out", response_model=BookingPublic)
def check_out_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Check out a booking.
    """
    booking = crud_booking.get(session, id=booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    service = BookingService(session)

    try:
        booking = service.check_out_booking(booking)

        # Log audit
        entity_name = get_entity_name("booking", booking)
        log_audit(
            session=session,
            user=current_user,
            action="checked_out",
            entity_type="booking",
            entity_id=booking.id,
            entity_name=entity_name,
        )

        session.commit()
        session.refresh(booking)

        # Reload with relationships
        return crud_booking.get_with_relations(session, booking_id=booking.id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConcurrentUpdateError as e:
        raise HTTPException(status_code=409, detail=str(e))
