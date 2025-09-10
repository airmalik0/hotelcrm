"""
Customer statistics recalculation utilities
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, func, select

from app.models import Booking, BookingStatus, Customer


def recalculate_customer_stats(session: Session, customer_id: uuid.UUID) -> None:
    """
    Recalculate all customer statistics from bookings.
    This ensures statistics are always consistent with actual booking data.

    Args:
        session: Database session
        customer_id: Customer ID to recalculate stats for
    """
    # Lock customer to prevent concurrent updates
    customer = session.exec(
        select(Customer).where(Customer.id == customer_id).with_for_update()
    ).first()

    if not customer:
        return

    # Calculate total spent and count from non-cancelled bookings
    stats: tuple[Any, ...] | None = session.exec(
        select(
            func.count().label("total_bookings"),
            func.coalesce(func.sum(Booking.total_amount), 0).label("total_spent"),
            func.min(Booking.booking_date).label("first_booking"),
            func.max(Booking.booking_date).label("last_booking")
        )
        .select_from(Booking)
        .where(
            Booking.customer_id == customer_id,
            Booking.status != BookingStatus.CANCELLED
        )
    ).first()

    if stats:
        # Update customer with recalculated stats
        customer.total_bookings = stats[0] or 0
        customer.total_spent = float(stats[1] or 0)
        customer.first_booking_date = stats[2]
        customer.last_booking_date = stats[3]
    else:
        # No bookings found
        customer.total_bookings = 0
        customer.total_spent = 0.0
        customer.first_booking_date = None
        customer.last_booking_date = None

    customer.updated_at = datetime.now(timezone.utc)
    session.add(customer)


def update_customer_stats_on_booking_change(
    session: Session,
    customer_id: uuid.UUID,
    amount_delta: float | None = None,
    booking_delta: int | None = None,
    new_booking_date: datetime | None = None
) -> None:
    """
    Incrementally update customer statistics.
    Use this for performance when you know the exact changes.

    NOTE: This function should be called within the same transaction as the booking change.
    The customer record is locked for update to prevent race conditions.

    Args:
        session: Database session (should be in a transaction)
        customer_id: Customer ID to update
        amount_delta: Change in total spent (positive or negative)
        booking_delta: Change in booking count (1, -1, or 0)
        new_booking_date: New booking date to potentially update first/last dates
    """
    # Lock customer for update to prevent concurrent modifications
    customer = session.exec(
        select(Customer).where(Customer.id == customer_id).with_for_update()
    ).first()

    if not customer:
        return

    if amount_delta is not None:
        # Ensure total_spent never goes negative
        customer.total_spent = max(0.0, customer.total_spent + amount_delta)

    if booking_delta is not None:
        # Ensure total_bookings never goes negative
        customer.total_bookings = max(0, customer.total_bookings + booking_delta)

        # If bookings reach 0, clear the booking dates
        if customer.total_bookings == 0:
            customer.first_booking_date = None
            customer.last_booking_date = None

    if new_booking_date and customer.total_bookings > 0:
        if not customer.first_booking_date or new_booking_date < customer.first_booking_date:
            customer.first_booking_date = new_booking_date
        if not customer.last_booking_date or new_booking_date > customer.last_booking_date:
            customer.last_booking_date = new_booking_date

    customer.updated_at = datetime.now(timezone.utc)
    session.add(customer)

