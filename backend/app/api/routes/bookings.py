import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import joinedload
from sqlmodel import and_, func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.customer_stats import update_customer_stats_on_booking_change
from app.core.rbac import check_admin_or_manager
from app.models import (
    Booking,
    BookingCreate,
    BookingPublic,
    BookingsPublic,
    BookingStatus,
    BookingUpdate,
    Customer,
    Message,
    Room,
    RoomStatus,
)
from app.services.booking_service import BookingService

router = APIRouter()


@router.get("/", response_model=BookingsPublic)
def read_bookings(
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
    statement = select(Booking)

    if status:
        statement = statement.where(Booking.status == status)
    if room_id:
        statement = statement.where(Booking.room_id == room_id)
    if customer_id:
        statement = statement.where(Booking.customer_id == customer_id)

    # Eagerly load related data to avoid N+1 queries
    statement = statement.options(
        joinedload(Booking.customer),  # type: ignore[arg-type]
        joinedload(Booking.room)  # type: ignore[arg-type]
    )
    statement = statement.offset(skip).limit(limit)
    bookings = session.exec(statement).all()

    count_statement = select(func.count()).select_from(Booking)
    if status:
        count_statement = count_statement.where(Booking.status == status)
    if room_id:
        count_statement = count_statement.where(Booking.room_id == room_id)
    if customer_id:
        count_statement = count_statement.where(Booking.customer_id == customer_id)

    count = session.exec(count_statement).one()

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
    # Get booking with related data eagerly loaded
    statement = select(Booking).where(Booking.id == booking_id).options(
        joinedload(Booking.customer),  # type: ignore[arg-type]
        joinedload(Booking.room)  # type: ignore[arg-type]
    )
    booking = session.exec(statement).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return booking


@router.post("/", response_model=BookingPublic)
def create_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_in: BookingCreate,
) -> Any:
    """
    Create new booking.
    """
    # Verify customer exists
    customer = session.get(Customer, booking_in.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Verify room exists
    room = session.get(Room, booking_in.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Check if room is available for booking
    if room.status != RoomStatus.AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Room is currently {room.status.value} and cannot be booked",
        )

    # Check room availability using service
    overlapping_bookings = BookingService.check_room_availability(
        session=session,
        room_id=booking_in.room_id,
        check_in=booking_in.check_in,
        check_out=booking_in.check_out
    )

    if overlapping_bookings:
        raise HTTPException(
            status_code=400,
            detail="Room is not available for the selected dates (minimum 15-minute gap required between bookings)",
        )

    # Discount reason validation is now handled by the model's @model_validator

    # Create booking instance to use model's calculation method
    booking = Booking.model_validate(booking_in)
    expected_total = booking.calculate_total_amount(room.price_per_night)

    # Allow small difference for rounding (1 currency unit)
    if abs(booking_in.total_amount - expected_total) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"Total amount mismatch. Expected: {expected_total:.2f}, got: {booking_in.total_amount:.2f}",
        )

    # Booking already created above for validation
    session.add(booking)

    # Update customer statistics using centralized function
    update_customer_stats_on_booking_change(
        session=session,
        customer_id=booking_in.customer_id,
        amount_delta=booking_in.total_amount,
        booking_delta=1,
        new_booking_date=datetime.utcnow()
    )

    session.commit()
    session.refresh(booking)

    # Reload booking with relationships eagerly loaded
    reloaded = session.exec(
        select(Booking).where(Booking.id == booking.id).options(
            joinedload(Booking.customer),  # type: ignore[arg-type]
            joinedload(Booking.room)  # type: ignore[arg-type]
        )
    ).first()
    if reloaded:
        booking = reloaded

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

    return booking


@router.put("/{booking_id}", response_model=BookingPublic)
def update_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_id: uuid.UUID,
    booking_in: BookingUpdate,
) -> Any:
    """
    Update a booking.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # If room is being changed, verify it exists and handle room status updates
    if booking_in.room_id and booking_in.room_id != booking.room_id:
        new_room = session.get(Room, booking_in.room_id)
        if not new_room:
            raise HTTPException(status_code=404, detail="Room not found")

        # If booking is currently checked in, handle room status transitions
        if booking.status == BookingStatus.CHECKED_IN:
            # New room must be available
            if new_room.status != RoomStatus.AVAILABLE:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot transfer to room {new_room.room_number}: room is {new_room.status.value}",
                )

            # Old room goes to cleaning
            old_room = session.get(Room, booking.room_id)
            if old_room:
                old_room.status = RoomStatus.CLEANING
                session.add(old_room)

            # New room becomes occupied
            new_room.status = RoomStatus.OCCUPIED
            session.add(new_room)

    # If customer is being changed, verify the new customer exists
    if booking_in.customer_id:
        new_customer = session.get(Customer, booking_in.customer_id)
        if not new_customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    # If dates or room are being changed, check availability with 15-minute buffer
    if booking_in.check_in or booking_in.check_out or booking_in.room_id:
        check_in = booking_in.check_in or booking.check_in
        check_out = booking_in.check_out or booking.check_out
        room_id = booking_in.room_id or booking.room_id
        buffer_minutes = 15

        overlapping_bookings = session.exec(
            select(Booking).where(
                and_(
                    Booking.id != booking.id,
                    Booking.room_id == room_id,
                    Booking.status != BookingStatus.CANCELLED,
                    Booking.check_out > check_in - timedelta(minutes=buffer_minutes),
                    Booking.check_in < check_out + timedelta(minutes=buffer_minutes),
                )
            ).with_for_update()  # Lock rows to prevent concurrent updates
        ).all()

        if overlapping_bookings:
            raise HTTPException(
                status_code=400,
                detail="Room is not available for the selected dates (minimum 15-minute gap required between bookings)",
            )

    # Check permission to change discount (only manager or admin can change after creation)
    if booking_in.discount is not None and booking_in.discount != booking.discount:
        check_admin_or_manager(current_user)

    # Check permission to change total_amount directly (only manager or admin)
    if booking_in.total_amount is not None and not (booking_in.check_in or booking_in.check_out or booking_in.room_id or booking_in.discount is not None):
        # Direct total_amount change without recalculation triggers
        check_admin_or_manager(current_user)

    # Validate status transitions using model method
    if booking_in.status and booking_in.status != booking.status:
        # Special handling for CHECKED_OUT -> CANCELLED (not normally allowed but might be needed for corrections)
        if booking.status == BookingStatus.CHECKED_OUT and booking_in.status == BookingStatus.CANCELLED:
            # Only allow admins/managers to cancel checked-out bookings (for corrections)
            check_admin_or_manager(current_user)
        elif not booking.is_status_transition_valid(booking_in.status):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from {booking.status} to {booking_in.status}",
            )

    # Check if user can change payment method on checked-in booking
    if booking_in.payment_method and booking.status == BookingStatus.CHECKED_IN:
        check_admin_or_manager(current_user)

    # Update room status if checking in or out
    if booking_in.status:
        if booking_in.status == BookingStatus.CHECKED_IN and booking.status != BookingStatus.CHECKED_IN:
            room = session.get(Room, booking.room_id)
            if room:
                if room.status != RoomStatus.AVAILABLE:
                    raise HTTPException(
                        status_code=400,
                        detail="Room must be available to check in",
                    )
                room.status = RoomStatus.OCCUPIED
                session.add(room)
        elif booking_in.status == BookingStatus.CHECKED_OUT and booking.status == BookingStatus.CHECKED_IN:
            room = session.get(Room, booking.room_id)
            if room:
                room.status = RoomStatus.CLEANING
                session.add(room)
        elif booking_in.status == BookingStatus.CANCELLED:
            # Use service to handle cancellation properly
            BookingService.handle_booking_cancellation(session, booking)

    update_dict = booking_in.model_dump(exclude_unset=True)

    # Recalculate total_amount if dates, room, or discount changed
    if booking_in.check_in or booking_in.check_out or booking_in.room_id or booking_in.discount is not None:
        # Get the room (new or current) to know the rate
        room_id = booking_in.room_id or booking.room_id
        room = session.get(Room, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found for price calculation")
        new_check_in = booking_in.check_in or booking.check_in
        new_check_out = booking_in.check_out or booking.check_out
        new_discount = booking_in.discount if booking_in.discount is not None else booking.discount

        # Calculate nights based on calendar days (hotel standard)
        # Minimum 1 night charge even for same-day checkout
        nights = max(1, (new_check_out.date() - new_check_in.date()).days)

        # Calculate new total with discount
        subtotal = room.price_per_night * nights
        discount_amount = subtotal * (new_discount / 100)
        new_total = subtotal - discount_amount

        update_dict["total_amount"] = float(new_total)

    # Get old and new values for audit
    old_values, new_values = get_change_values(booking, update_dict)

    # Use service to handle customer change edge cases properly
    customer_changed = "customer_id" in update_dict and booking.customer_id != update_dict["customer_id"]
    amount_changed = "total_amount" in update_dict and booking.total_amount != update_dict["total_amount"]

    if customer_changed:
        # Customer is changing - use service to handle properly
        BookingService.handle_customer_change(
            session=session,
            booking=booking,
            old_customer_id=booking.customer_id,
            new_customer_id=update_dict["customer_id"],
            amount_changed=amount_changed,
            new_amount=update_dict.get("total_amount")
        )
    elif amount_changed:
        # Only amount is changing, same customer
        amount_diff = update_dict["total_amount"] - booking.total_amount
        update_customer_stats_on_booking_change(
            session=session,
            customer_id=booking.customer_id,
            amount_delta=amount_diff
        )

    booking.sqlmodel_update(update_dict)
    session.add(booking)
    session.commit()
    session.refresh(booking)

    # Reload booking with relationships eagerly loaded
    reloaded = session.exec(
        select(Booking).where(Booking.id == booking.id).options(
            joinedload(Booking.customer),  # type: ignore[arg-type]
            joinedload(Booking.room)  # type: ignore[arg-type]
        )
    ).first()
    if reloaded:
        booking = reloaded

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

    return booking


@router.delete("/{booking_id}", response_model=Message)
def delete_booking(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_id: uuid.UUID,
) -> Any:
    """
    Delete a booking.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Use service to handle deletion edge cases properly
    BookingService.handle_booking_deletion(session, booking)

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

    session.delete(booking)
    session.commit()
    return Message(message="Booking deleted successfully")


@router.post("/{booking_id}/check-in", response_model=BookingPublic)
def check_in_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_id: uuid.UUID,
) -> Any:
    """
    Check in a booking.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=400,
            detail="Only confirmed bookings can be checked in",
        )

    # Check if room is available for check-in
    # Use FOR UPDATE to prevent race conditions
    room = session.exec(
        select(Room).where(Room.id == booking.room_id).with_for_update()
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.status != RoomStatus.AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail="Room must be available to check in",
        )

    # Check for conflicting bookings one more time with lock and buffer time
    buffer_minutes = 15
    # Check both currently checked-in bookings and future bookings that would overlap
    conflicting_bookings = session.exec(
        select(Booking).where(
            and_(
                Booking.id != booking.id,
                Booking.room_id == booking.room_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.status != BookingStatus.CHECKED_OUT,
            )
        ).with_for_update()
    ).all()

    # Also check if our check-in time conflicts with other bookings (15-minute buffer)
    overlapping_bookings = session.exec(
        select(Booking).where(
            and_(
                Booking.id != booking.id,
                Booking.room_id == booking.room_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.check_in <= booking.check_in + timedelta(minutes=buffer_minutes),
                Booking.check_out >= booking.check_in - timedelta(minutes=buffer_minutes),
            )
        ).with_for_update()
    ).all()

    if conflicting_bookings or overlapping_bookings:
        raise HTTPException(
            status_code=400,
            detail="Cannot check in: room has conflicting bookings or insufficient buffer time",
        )

    booking.status = BookingStatus.CHECKED_IN
    room.status = RoomStatus.OCCUPIED
    session.add(room)

    session.add(booking)
    session.commit()
    session.refresh(booking)

    # Reload booking with relationships eagerly loaded
    reloaded = session.exec(
        select(Booking).where(Booking.id == booking.id).options(
            joinedload(Booking.customer),  # type: ignore[arg-type]
            joinedload(Booking.room)  # type: ignore[arg-type]
        )
    ).first()
    if reloaded:
        booking = reloaded

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

    return booking


@router.post("/{booking_id}/check-out", response_model=BookingPublic)
def check_out_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    booking_id: uuid.UUID,
) -> Any:
    """
    Check out a booking.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.CHECKED_IN:
        raise HTTPException(
            status_code=400,
            detail="Only checked-in bookings can be checked out",
        )

    booking.status = BookingStatus.CHECKED_OUT

    # Update room status
    room = session.get(Room, booking.room_id)
    if room:
        room.status = RoomStatus.CLEANING
        session.add(room)

    session.add(booking)
    session.commit()
    session.refresh(booking)

    # Reload booking with relationships eagerly loaded
    reloaded = session.exec(
        select(Booking).where(Booking.id == booking.id).options(
            joinedload(Booking.customer),  # type: ignore[arg-type]
            joinedload(Booking.room)  # type: ignore[arg-type]
        )
    ).first()
    if reloaded:
        booking = reloaded

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

    return booking
