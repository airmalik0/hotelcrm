import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import and_, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Booking,
    BookingCreate,
    BookingPublic,
    BookingStatus,
    BookingUpdate,
    BookingsPublic,
    Customer,
    Room,
    RoomStatus,
)

router = APIRouter()


@router.get("/", response_model=BookingsPublic)
def read_bookings(
    session: SessionDep,
    current_user: CurrentUser,
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

    statement = statement.offset(skip).limit(limit)
    bookings = session.exec(statement).all()

    # Eagerly load related data
    for booking in bookings:
        _ = booking.customer
        _ = booking.room

    count_statement = select(Booking)
    if status:
        count_statement = count_statement.where(Booking.status == status)
    if room_id:
        count_statement = count_statement.where(Booking.room_id == room_id)
    if customer_id:
        count_statement = count_statement.where(Booking.customer_id == customer_id)

    count = len(session.exec(count_statement).all())

    return BookingsPublic(data=bookings, count=count)


@router.get("/{booking_id}", response_model=BookingPublic)
def read_booking(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Get booking by ID.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Eagerly load related data
    _ = booking.customer
    _ = booking.room

    return booking


@router.post("/", response_model=BookingPublic)
def create_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
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

    # Check room availability for the dates
    overlapping_bookings = session.exec(
        select(Booking).where(
            and_(
                Booking.room_id == booking_in.room_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.check_in < booking_in.check_out,
                Booking.check_out > booking_in.check_in,
            )
        )
    ).all()

    if overlapping_bookings:
        raise HTTPException(
            status_code=400,
            detail="Room is not available for the selected dates",
        )

    # Check room capacity
    total_guests = booking_in.adults + booking_in.children
    if total_guests > room.max_occupancy:
        raise HTTPException(
            status_code=400,
            detail=f"Room maximum occupancy is {room.max_occupancy} guests",
        )

    # Create booking
    booking = Booking.model_validate(booking_in)
    session.add(booking)

    # Update customer statistics
    customer.total_bookings += 1
    customer.total_spent += booking_in.total_amount
    if not customer.first_booking_date:
        customer.first_booking_date = datetime.utcnow()
    customer.last_booking_date = datetime.utcnow()

    session.add(customer)
    session.commit()
    session.refresh(booking)

    # Load related data
    _ = booking.customer
    _ = booking.room

    return booking


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
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # If dates or room are being changed, check availability
    if booking_in.check_in or booking_in.check_out or booking_in.room_id:
        check_in = booking_in.check_in or booking.check_in
        check_out = booking_in.check_out or booking.check_out
        room_id = booking_in.room_id or booking.room_id
        
        overlapping_bookings = session.exec(
            select(Booking).where(
                and_(
                    Booking.id != booking_id,
                    Booking.room_id == room_id,
                    Booking.status != BookingStatus.CANCELLED,
                    Booking.check_in < check_out,
                    Booking.check_out > check_in,
                )
            )
        ).all()
        
        if overlapping_bookings:
            raise HTTPException(
                status_code=400,
                detail="Room is not available for the selected dates",
            )
    
    # Update room status if checking in or out
    if booking_in.status:
        if booking_in.status == BookingStatus.CHECKED_IN and booking.status != BookingStatus.CHECKED_IN:
            room = session.get(Room, booking.room_id)
            if room:
                room.status = RoomStatus.OCCUPIED
                session.add(room)
        elif booking_in.status in [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED]:
            room = session.get(Room, booking.room_id)
            if room:
                room.status = RoomStatus.AVAILABLE
                session.add(room)
    
    update_dict = booking_in.model_dump(exclude_unset=True)
    booking.sqlmodel_update(update_dict)
    session.add(booking)
    session.commit()
    session.refresh(booking)
    
    # Load related data
    _ = booking.customer
    _ = booking.room
    
    return booking


@router.delete("/{booking_id}")
def delete_booking(
    session: SessionDep,
    current_user: CurrentUser,
    booking_id: uuid.UUID,
) -> Any:
    """
    Delete a booking.
    """
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update customer statistics
    customer = session.get(Customer, booking.customer_id)
    if customer:
        customer.total_bookings = max(0, customer.total_bookings - 1)
        customer.total_spent = max(0, customer.total_spent - booking.total_amount)
        session.add(customer)
    
    # Update room status if needed
    if booking.status == BookingStatus.CHECKED_IN:
        room = session.get(Room, booking.room_id)
        if room:
            room.status = RoomStatus.AVAILABLE
            session.add(room)
    
    session.delete(booking)
    session.commit()
    return {"message": "Booking deleted successfully"}


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
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != BookingStatus.CONFIRMED:
        raise HTTPException(
            status_code=400,
            detail="Only confirmed bookings can be checked in",
        )
    
    booking.status = BookingStatus.CHECKED_IN
    
    # Update room status
    room = session.get(Room, booking.room_id)
    if room:
        room.status = RoomStatus.OCCUPIED
        session.add(room)
    
    session.add(booking)
    session.commit()
    session.refresh(booking)
    
    # Load related data
    _ = booking.customer
    _ = booking.room
    
    return booking


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
    
    # Load related data
    _ = booking.customer
    _ = booking.room
    
    return booking