import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.rate_limit import RateLimits, limiter
from app.crud.booking import booking as crud_booking
from app.models import (
    BookingCreate,
    BookingPublic,
    BookingsPublic,
    BookingStatus,
    BookingUpdate,
    DateModificationRequest,
    Message,
    PaymentAdjustmentResponse,
    RoomChangeRequest,
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
    date_from: str | None = None,
    date_to: str | None = None,
) -> Any:
    """
    Retrieve bookings.
    """
    # Parse date strings to datetime objects
    parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00")) if date_from else None
    parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00")) if date_to else None

    bookings = crud_booking.get_multi_filtered(
        session,
        skip=skip,
        limit=limit,
        status=status,
        room_id=room_id,
        customer_id=customer_id,
        date_from=parsed_date_from,
        date_to=parsed_date_to
    )
    count = crud_booking.count_filtered(
        session,
        status=status,
        room_id=room_id,
        customer_id=customer_id,
        date_from=parsed_date_from,
        date_to=parsed_date_to
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
    service = BookingService(session)
    return service.get_booking_with_relations_or_404(booking_id)


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
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

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
        # Validate status transition permissions and business rules
        service.validate_status_transition(booking, booking_in.status, current_user)

    # Get old values for audit
    update_dict = booking_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(booking, update_dict)

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


@router.put("/{booking_id}/modify-dates", response_model=PaymentAdjustmentResponse, dependencies=[Depends(require_admin_or_manager)])
def modify_booking_dates(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    request: DateModificationRequest,
) -> Any:
    """
    Modify booking dates with payment recalculation.
    Administrative operation - requires admin or manager role.
    """
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

    booking, payment_difference = service.modify_booking_dates(
        booking,
        new_check_in=request.new_check_in,
        new_check_out=request.new_check_out
    )

    # Log audit
    entity_name = get_entity_name("booking", booking)
    changes = []
    if request.new_check_in:
        changes.append(f"check-in: {request.new_check_in.isoformat()}")
    if request.new_check_out:
        changes.append(f"check-out: {request.new_check_out.isoformat()}")
    if payment_difference != 0:
        action_type = "charge" if payment_difference > 0 else "refund"
        changes.append(f"payment {action_type}: ${abs(payment_difference):.2f}")

    log_audit(
        session=session,
        user=current_user,
        action="modified_dates",
        entity_type="booking",
        entity_id=booking.id,
        entity_name=entity_name,
        new_values={"changes": ", ".join(changes)},
    )

    session.commit()
    session.refresh(booking)

    # Reload with relationships
    updated_booking = crud_booking.get_with_relations(session, booking_id=booking.id)
    return PaymentAdjustmentResponse(booking=updated_booking, payment_difference=payment_difference)


@router.put("/{booking_id}/change-room", response_model=PaymentAdjustmentResponse)
def change_booking_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
    request: RoomChangeRequest,
) -> Any:
    """
    Change booking room with payment adjustment.
    Available to hosts for confirmed bookings, admin/managers for all.
    """
    from app.models import UserRole

    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

    # Permission check: hosts can only change rooms for confirmed bookings
    if current_user.role == UserRole.HOST and booking.status != BookingStatus.CONFIRMED:
        require_admin_or_manager(current_user)

    booking, payment_difference = service.change_room_with_payment_adjustment(
        booking,
        new_room_id=request.new_room_id
    )

    # Log audit
    entity_name = get_entity_name("booking", booking)
    action_details = f"room changed to {booking.room.room_number if booking.room else 'N/A'}"
    if payment_difference != 0:
        action_type = "charge" if payment_difference > 0 else "refund"
        action_details += f", payment {action_type}: ${abs(payment_difference):.2f}"

    log_audit(
        session=session,
        user=current_user,
        action="changed_room",
        entity_type="booking",
        entity_id=booking.id,
        entity_name=entity_name,
        new_values={"changes": action_details},
    )

    session.commit()
    session.refresh(booking)

    # Reload with relationships
    updated_booking = crud_booking.get_with_relations(session, booking_id=booking.id)
    return PaymentAdjustmentResponse(booking=updated_booking, payment_difference=payment_difference)


@router.delete("/{booking_id}", response_model=Message, dependencies=[Depends(require_admin_or_manager)])
def delete_booking(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Delete a booking. Requires admin or manager role.
    """
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

    # Validate business rules for deletion
    service.validate_booking_for_deletion(booking)

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
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

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
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

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


@router.post("/{booking_id}/actual-check-in", response_model=BookingPublic)
def actual_check_in(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Perform actual check-in - sets actual check-in time to current time.
    Available to all roles with check-in permissions.
    """
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

    booking = service.perform_actual_check_in(booking)

    # Log audit
    entity_name = get_entity_name("booking", booking)
    log_audit(
        session=session,
        user=current_user,
        action="actual_checked_in",
        entity_type="booking",
        entity_id=booking.id,
        entity_name=entity_name,
    )

    session.commit()
    session.refresh(booking)

    # Reload with relationships
    return crud_booking.get_with_relations(session, booking_id=booking.id)


@router.post("/{booking_id}/actual-check-out", response_model=BookingPublic)
def actual_check_out(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Perform actual check-out - sets actual check-out time to current time.
    Available to all roles with check-out permissions.
    """
    service = BookingService(session)
    booking = service.get_booking_or_404(booking_id)

    booking = service.perform_actual_check_out(booking)

    # Log audit
    entity_name = get_entity_name("booking", booking)
    log_audit(
        session=session,
        user=current_user,
        action="actual_checked_out",
        entity_type="booking",
        entity_id=booking.id,
        entity_name=entity_name,
    )

    session.commit()
    session.refresh(booking)

    # Reload with relationships
    return crud_booking.get_with_relations(session, booking_id=booking.id)