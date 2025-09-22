"""
CRUD operations for analytics.
All SQL queries for analytics data retrieval.
"""
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, func, select

from app.models import Booking, BookingStatus, Customer, Room
from app.models.analytics import AgeGroup


class CRUDAnalytics:
    """CRUD operations for analytics data."""

    def get_revenue_by_period(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        room_id: str | None = None,
        room_type: str | None = None,
        include_cancelled: bool = False,
    ) -> dict[str, Any]:
        """
        Get revenue metrics for a period.

        Returns:
            Dictionary with total_revenue, booking_count, total_nights, discount_amount, refund_amount
        """
        query = select(
            func.sum(Booking.total_amount).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.sum(
                func.greatest(1, func.extract("day", Booking.check_out - Booking.check_in))
            ).label("total_nights"),
            func.sum(
                Booking.total_amount * Booking.discount / 100
            ).label("discount_amount"),
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
        )

        # Status filter - include CONFIRMED, CHECKED_IN, CHECKED_OUT
        if not include_cancelled:
            query = query.where(Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]))

        # Room filter
        if room_id and room_id != "all":
            query = query.where(Booking.room_id == room_id)

        # Room type filter
        if room_type and room_type != "all":
            query = query.join(Room).where(Room.room_type == room_type)

        result = session.exec(query).first()

        # Calculate refunds from payment_adjustments - get bookings with adjustments
        refund_query = select(Booking.payment_adjustments).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
        )

        # Apply same filters as main query
        if not include_cancelled:
            refund_query = refund_query.where(Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]))

        if room_id and room_id != "all":
            refund_query = refund_query.where(Booking.room_id == room_id)

        if room_type and room_type != "all":
            refund_query = refund_query.join(Room).where(Room.room_type == room_type)

        refund_results = session.exec(refund_query).all()

        # Calculate total refunds from payment adjustments
        total_refunds = 0.0
        for payment_adjustments in refund_results:
            if payment_adjustments:
                for adjustment in payment_adjustments:
                    amount = adjustment.get("amount", 0)
                    if amount < 0:  # Negative amounts are refunds
                        total_refunds += abs(amount)

        return {
            "total_revenue": float(result.total_revenue or 0),
            "booking_count": int(result.booking_count or 0),
            "total_nights": int(result.total_nights or 0),
            "discount_amount": float(result.discount_amount or 0),
            "refund_amount": total_refunds,
        }

    def get_occupancy_metrics(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        room_id: str | None = None,
        room_type: str | None = None,
    ) -> dict[str, Any]:
        """
        Calculate occupancy metrics for a period.

        Returns:
            Dictionary with occupancy_rate, average_length_of_stay, check_ins, check_outs, cancellations
        """
        # Get total rooms
        room_query = select(func.count(Room.id))
        if room_id and room_id != "all":
            room_query = room_query.where(Room.id == room_id)
        if room_type and room_type != "all":
            room_query = room_query.where(Room.room_type == room_type)

        total_rooms = session.exec(room_query).first() or 1

        # Calculate total available room nights
        days_in_period = (date_to - date_from).days
        if days_in_period <= 0:
            # Handle same-day or invalid date ranges
            days_in_period = 1
        total_available_nights = total_rooms * days_in_period

        # Get occupied nights - calculate intersection with analysis period
        # For bookings that span the period boundaries, count only the days within the period
        occupied_query = select(
            func.sum(
                func.greatest(1, func.extract("day",
                    func.least(Booking.check_out, date_to) -
                    func.greatest(Booking.check_in, date_from)
                ))
            ).label("occupied_nights"),
            func.avg(
                func.greatest(1, func.extract("day", Booking.check_out - Booking.check_in))
            ).label("avg_stay"),
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        if room_id and room_id != "all":
            occupied_query = occupied_query.where(Booking.room_id == room_id)
        if room_type and room_type != "all":
            occupied_query = occupied_query.join(Room).where(Room.room_type == room_type)

        occupied_result = session.exec(occupied_query).first()
        occupied_nights = int(occupied_result.occupied_nights or 0)
        avg_stay = float(occupied_result.avg_stay or 0)

        # Count actual check-ins (by check_in date)
        # Include both CHECKED_IN and CHECKED_OUT statuses to count all arrivals
        checkin_query = select(func.count(Booking.id)).where(
            Booking.check_in >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
        )
        if room_id and room_id != "all":
            checkin_query = checkin_query.where(Booking.room_id == room_id)
        if room_type and room_type != "all":
            checkin_query = checkin_query.join(Room).where(Room.room_type == room_type)

        check_ins = session.exec(checkin_query).first() or 0

        # Count actual check-outs (by check_out date)
        checkout_query = select(func.count(Booking.id)).where(
            Booking.check_out >= date_from,
            Booking.check_out <= date_to,
            Booking.status == BookingStatus.CHECKED_OUT,
        )
        if room_id and room_id != "all":
            checkout_query = checkout_query.where(Booking.room_id == room_id)
        if room_type and room_type != "all":
            checkout_query = checkout_query.join(Room).where(Room.room_type == room_type)

        check_outs = session.exec(checkout_query).first() or 0

        # Count cancellations (by updated_at for cancelled bookings)
        # Using updated_at as we don't have a dedicated cancelled_at field
        cancellation_query = select(func.count(Booking.id)).where(
            Booking.updated_at >= date_from,
            Booking.updated_at <= date_to,
            Booking.status == BookingStatus.CANCELLED,
        )
        if room_id and room_id != "all":
            cancellation_query = cancellation_query.where(Booking.room_id == room_id)
        if room_type and room_type != "all":
            cancellation_query = cancellation_query.join(Room).where(Room.room_type == room_type)

        cancellations = session.exec(cancellation_query).first() or 0

        occupancy_rate = (occupied_nights / total_available_nights * 100) if total_available_nights > 0 else 0

        return {
            "occupancy_rate": round(occupancy_rate, 2),
            "average_length_of_stay": round(avg_stay, 1),
            "total_available_room_nights": total_available_nights,
            "total_occupied_room_nights": occupied_nights,
            "check_ins": int(check_ins),
            "check_outs": int(check_outs),
            "cancellations": int(cancellations),
        }

    def get_payment_method_distribution(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        include_cancelled: bool = False,
    ) -> dict[str, Any]:
        """
        Get payment method distribution for bookings.

        Returns:
            Dictionary with percentages and amounts for each payment method
        """
        query = select(
            Booking.payment_method,
            func.count(Booking.id).label("count"),
            func.sum(Booking.total_amount).label("amount"),
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
        )

        if not include_cancelled:
            query = query.where(Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]))

        query = query.group_by(Booking.payment_method)
        results = session.exec(query).all()

        total_bookings = sum(r.count for r in results)
        if total_bookings == 0:
            total_bookings = 1  # Prevent division by zero

        distribution = {
            "cash_percentage": 0.0,
            "transfer_percentage": 0.0,
            "terminal_percentage": 0.0,
            "cash_amount": 0.0,
            "transfer_amount": 0.0,
            "terminal_amount": 0.0,
        }

        for result in results:
            method = result.payment_method.value.lower()
            percentage = (result.count / total_bookings * 100) if total_bookings > 0 else 0
            distribution[f"{method}_percentage"] = round(percentage, 2)
            distribution[f"{method}_amount"] = float(result.amount or 0)

        return distribution

    def get_customer_metrics(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        district: str | None = None,
    ) -> dict[str, Any]:
        """
        Get customer-related metrics.

        Returns:
            Dictionary with customer counts, age distribution, district distribution
        """
        # Get unique customer IDs who made bookings in the period
        customer_ids_query = (
            select(Customer.id)
            .join(Booking, Customer.id == Booking.customer_id)
            .where(
                Booking.booking_date >= date_from,
                Booking.booking_date <= date_to,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.CHECKED_OUT
                ]),
            )
            .distinct()
        )

        if district and district != "all":
            customer_ids_query = customer_ids_query.where(Customer.district == district)

        customer_ids = session.exec(customer_ids_query).all()

        # Now get full customer data
        customers = []
        if customer_ids:
            customers_query = select(Customer).where(Customer.id.in_(customer_ids))
            customers = session.exec(customers_query).all()

        # Calculate metrics
        total_customers = len(customers)

        # Determine new vs returning (simplified: new if first booking is in period)
        new_customers = 0
        for customer in customers:
            if customer.first_booking_date:
                # Ensure timezone compatibility for comparison
                first_booking = customer.first_booking_date
                if first_booking.tzinfo is None:
                    # If first_booking_date is naive, assume UTC (consistent with project pattern)
                    first_booking = first_booking.replace(tzinfo=timezone.utc)

                # Ensure date_from is also timezone-aware
                comparison_date = date_from
                if comparison_date.tzinfo is None:
                    comparison_date = comparison_date.replace(tzinfo=timezone.utc)

                if first_booking >= comparison_date:
                    new_customers += 1

        returning_customers = total_customers - new_customers

        # Age distribution
        age_distribution = {
            AgeGroup.GROUP_18_25.value: 0,
            AgeGroup.GROUP_26_35.value: 0,
            AgeGroup.GROUP_36_45.value: 0,
            AgeGroup.GROUP_46_55.value: 0,
            AgeGroup.GROUP_55_PLUS.value: 0,
            AgeGroup.UNKNOWN.value: 0,
        }

        total_age = 0
        customers_with_age = 0

        for customer in customers:
            if customer.date_of_birth:
                age = (datetime.now() - customer.date_of_birth).days // 365
                total_age += age
                customers_with_age += 1

                if age < 26:
                    age_distribution[AgeGroup.GROUP_18_25.value] += 1
                elif age < 36:
                    age_distribution[AgeGroup.GROUP_26_35.value] += 1
                elif age < 46:
                    age_distribution[AgeGroup.GROUP_36_45.value] += 1
                elif age < 56:
                    age_distribution[AgeGroup.GROUP_46_55.value] += 1
                else:
                    age_distribution[AgeGroup.GROUP_55_PLUS.value] += 1
            else:
                age_distribution[AgeGroup.UNKNOWN.value] += 1

        # District distribution
        district_distribution = {}
        for customer in customers:
            if customer.district:
                district_name = customer.district.value
                district_distribution[district_name] = district_distribution.get(district_name, 0) + 1

        average_age = (total_age / customers_with_age) if customers_with_age > 0 else None

        return {
            "total_customers": total_customers,
            "new_customers": new_customers,
            "returning_customers": returning_customers,
            "average_age": round(average_age, 1) if average_age else None,
            "age_distribution": age_distribution,
            "district_distribution": district_distribution,
        }

    def get_room_type_breakdown(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
    ) -> list[dict[str, Any]]:
        """
        Get metrics broken down by room type.

        Returns:
            List of dictionaries with metrics for each room type
        """
        # Use GREATEST to ensure at least 1 day to avoid division by zero
        nights_expr = func.greatest(1, func.extract("day", Booking.check_out - Booking.check_in))

        query = select(
            Room.room_type,
            func.count(Booking.id).label("bookings"),
            func.sum(Booking.total_amount).label("revenue"),
            func.avg(Booking.total_amount / nights_expr).label("avg_rate"),
        ).join(
            Booking, Room.id == Booking.room_id
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(Room.room_type)

        results = session.exec(query).all()

        breakdown = []
        for result in results:
            # Calculate occupancy for this room type
            room_count = session.exec(
                select(func.count(Room.id)).where(Room.room_type == result.room_type)
            ).first()

            days_in_period = (date_to - date_from).days
            if days_in_period <= 0:
                days_in_period = 1
            available_nights = room_count * days_in_period if room_count else 1

            # Get occupied nights for this room type - calculate intersection with analysis period
            occupied_nights = session.exec(
                select(
                    func.sum(func.greatest(1, func.extract("day",
                        func.least(Booking.check_out, date_to) -
                        func.greatest(Booking.check_in, date_from)
                    )))
                ).join(
                    Room, Room.id == Booking.room_id
                ).where(
                    Booking.check_in < date_to,
                    Booking.check_out > date_from,
                    Booking.status.in_([
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN,
                        BookingStatus.CHECKED_OUT
                    ]),
                    Room.room_type == result.room_type,
                )
            ).first() or 0

            occupancy_rate = (occupied_nights / available_nights * 100) if available_nights > 0 else 0

            breakdown.append({
                "room_type": result.room_type.value,
                "revenue": float(result.revenue or 0),
                "bookings": int(result.bookings or 0),
                "occupancy_rate": round(occupancy_rate, 2),
                "average_rate": float(result.avg_rate or 0),
            })

        return breakdown

    def get_revenue_trend(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        group_by: str = "day",
    ) -> list[dict[str, Any]]:
        """
        Get revenue trend over time.

        Args:
            group_by: 'day', 'week', or 'month'

        Returns:
            List of dictionaries with date and revenue value
        """
        # Determine date truncation based on group_by
        # Use check_in date for consistency with revenue filtering
        if group_by == "month":
            date_trunc = func.date_trunc("month", Booking.check_in)
        elif group_by == "week":
            date_trunc = func.date_trunc("week", Booking.check_in)
        else:  # day
            date_trunc = func.date_trunc("day", Booking.check_in)

        query = select(
            date_trunc.label("period"),
            func.sum(Booking.total_amount).label("revenue"),
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(
            date_trunc
        ).order_by(
            date_trunc
        )

        results = session.exec(query).all()

        trend = []
        for result in results:
            trend.append({
                "date": result.period.isoformat() if result.period else "",
                "value": float(result.revenue or 0),
            })

        return trend

    def get_hourly_distribution(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        metric: str = "check_ins",
    ) -> list[dict[str, Any]]:
        """
        Get hourly distribution of check-ins or check-outs.

        Args:
            metric: 'check_ins' or 'check_outs'

        Returns:
            List of dictionaries with hour and count
        """
        # Determine which field to use based on metric
        # Fall back to scheduled times if actual times are not available
        if metric == "check_outs":
            time_field = func.coalesce(Booking.actual_check_out, Booking.check_out)
        else:  # default to check_ins
            time_field = func.coalesce(Booking.actual_check_in, Booking.check_in)

        # Query to get hour distribution
        query = select(
            func.extract("hour", time_field).label("hour"),
            func.count(Booking.id).label("count"),
        ).where(
            time_field >= date_from,
            time_field <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,  # Include CONFIRMED for scheduled times
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(
            func.extract("hour", time_field)
        ).order_by(
            func.extract("hour", time_field)
        )

        results = session.exec(query).all()

        # Create a dictionary for quick lookup
        hour_counts = {int(result.hour): int(result.count) for result in results}

        # Build the full 24-hour distribution
        hourly_data = []
        for hour in range(24):
            hourly_data.append({
                "hour": hour,
                "count": hour_counts.get(hour, 0),
                "label": f"{hour:02d}:00",
            })

        return hourly_data


analytics = CRUDAnalytics()
