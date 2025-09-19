"""
Consistency checker for customer statistics and other data integrity tasks.
Runs periodic checks to ensure data consistency.
"""

import logging
from typing import Any
from uuid import UUID

from sqlmodel import Session, select

from app.core.customer_stats import recalculate_customer_stats
from app.core.db import engine
from app.models import Booking, BookingStatus, Customer, Room, RoomStatus

logger = logging.getLogger(__name__)


def verify_customer_stats_task() -> dict[str, Any]:
    """
    Periodic task to verify and fix customer statistics.
    Runs through all customers and recalculates their statistics.

    Returns:
        Dictionary with results of the verification
    """
    results: dict[str, Any] = {
        "customers_checked": 0,
        "customers_fixed": 0,
        "errors": []
    }

    logger.info("Starting customer stats verification task")

    try:
        with Session(engine) as session:
            # Get all customers
            customers = session.exec(select(Customer)).all()
            results["customers_checked"] = len(customers)

            for customer in customers:
                try:
                    # Store current values
                    old_total_spent = customer.total_spent
                    old_total_bookings = customer.total_bookings
                    old_first_booking = customer.first_booking_date
                    old_last_booking = customer.last_booking_date

                    # Recalculate stats
                    recalculate_customer_stats(session, customer.id)

                    # Check if anything changed
                    session.refresh(customer)
                    if (customer.total_spent != old_total_spent or
                        customer.total_bookings != old_total_bookings or
                        customer.first_booking_date != old_first_booking or
                        customer.last_booking_date != old_last_booking):

                        results["customers_fixed"] += 1
                        logger.info(f"Fixed stats for customer {customer.id}: "
                                  f"spent {old_total_spent}->{customer.total_spent}, "
                                  f"bookings {old_total_bookings}->{customer.total_bookings}")

                except Exception as e:
                    logger.error(f"Error processing customer {customer.id}: {e}")
                    errors_list = results.get("errors", [])
                    if isinstance(errors_list, list):
                        errors_list.append(f"Customer {customer.id}: {str(e)}")

            # Commit all changes
            session.commit()

    except Exception as e:
        logger.error(f"Critical error in stats verification: {e}")
        errors_list = results.get("errors", [])
        if isinstance(errors_list, list):
            errors_list.append(f"Critical: {str(e)}")

    logger.info(f"Stats verification completed: {results['customers_fixed']} customers fixed out of {results['customers_checked']}")
    return results


def verify_room_status_consistency_task() -> dict[str, Any]:
    """
    Verify room statuses are consistent with bookings.
    Fixes rooms that should be available but are marked otherwise.

    Returns:
        Dictionary with results of the verification
    """
    results: dict[str, Any] = {
        "rooms_checked": 0,
        "rooms_fixed": 0,
        "errors": []
    }

    logger.info("Starting room status consistency check")

    try:
        with Session(engine) as session:
            # Get all rooms
            rooms = session.exec(select(Room)).all()
            results["rooms_checked"] = len(rooms)

            for room in rooms:
                try:
                    # Check if room has any active bookings (CHECKED_IN)
                    active_bookings = session.exec(
                        select(Booking).where(
                            Booking.room_id == room.id,
                            Booking.status == BookingStatus.CHECKED_IN
                        )
                    ).all()

                    # Determine what status should be
                    if active_bookings:
                        # Room should be occupied
                        if room.status != RoomStatus.OCCUPIED:
                            logger.info(f"Fixing room {room.room_number}: {room.status} -> OCCUPIED")
                            room.status = RoomStatus.OCCUPIED
                            session.add(room)
                            results["rooms_fixed"] += 1
                    else:
                        # Room should not be occupied (unless maintenance or cleaning)
                        if room.status == RoomStatus.OCCUPIED:
                            # No active bookings but room is occupied - fix it
                            logger.info(f"Fixing room {room.room_number}: OCCUPIED -> AVAILABLE")
                            room.status = RoomStatus.AVAILABLE
                            session.add(room)
                            results["rooms_fixed"] += 1

                except Exception as e:
                    logger.error(f"Error processing room {room.id}: {e}")
                    errors_list = results.get("errors", [])
                    if isinstance(errors_list, list):
                        errors_list.append(f"Room {room.room_number}: {str(e)}")

            # Commit all changes
            session.commit()

    except Exception as e:
        logger.error(f"Critical error in room status verification: {e}")
        errors_list = results.get("errors", [])
        if isinstance(errors_list, list):
            errors_list.append(f"Critical: {str(e)}")

    logger.info(f"Room status verification completed: {results['rooms_fixed']} rooms fixed out of {results['rooms_checked']}")
    return results


def run_all_consistency_checks() -> dict[str, Any]:
    """
    Run all consistency checks.

    Returns:
        Combined results from all checks
    """
    logger.info("Running all consistency checks")

    results = {
        "customer_stats": verify_customer_stats_task(),
        "room_status": verify_room_status_consistency_task()
    }

    logger.info("All consistency checks completed")
    return results


def verify_booking_integrity(session: Session, booking_id: UUID) -> list[str]:
    """
    Verify a single booking's data integrity.

    Args:
        session: Database session
        booking_id: Booking ID to verify

    Returns:
        List of issues found (empty if all good)
    """
    issues = []

    booking = session.get(Booking, booking_id)
    if not booking:
        return ["Booking not found"]

    # Check customer exists
    if not session.get(Customer, booking.customer_id):
        issues.append("Customer does not exist")

    # Check room exists
    room = session.get(Room, booking.room_id)
    if not room:
        issues.append("Room does not exist")

    # Check dates are valid
    if booking.check_out <= booking.check_in:
        issues.append("Check-out is not after check-in")

    # Check total amount is reasonable
    if room:
        expected_total = booking.calculate_total_amount(room.price_per_night)
        if abs(booking.total_amount - expected_total) > 1:
            issues.append(f"Total amount mismatch: {booking.total_amount} vs expected {expected_total}")

    # Check status transitions
    if booking.status == BookingStatus.CHECKED_OUT and room and room.status == RoomStatus.OCCUPIED:
        issues.append("Booking is checked out but room is still occupied")

    return issues
