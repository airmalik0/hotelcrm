"""
CRUD operations for analytics.
All SQL queries for analytics data retrieval.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlmodel import Session, func, select

from app.models import Booking, BookingStatus, Customer, Room
from app.models.analytics import AgeGroup


def _ensure_timezone_aware(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware, converting naive to UTC if needed."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


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

        # Count cancellations (by check_in date - shows cancelled bookings that were supposed to arrive in this period)
        cancellation_query = select(func.count(Booking.id)).where(
            Booking.check_in >= date_from,
            Booking.check_in <= date_to,
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

        distribution = {
            "cash_percentage": 0.0,
            "transfer_percentage": 0.0,
            "terminal_percentage": 0.0,
            "cash_count": 0,
            "transfer_count": 0,
            "terminal_count": 0,
            "cash_amount": 0.0,
            "transfer_amount": 0.0,
            "terminal_amount": 0.0,
        }

        for result in results:
            method = result.payment_method.value.lower()
            percentage = (result.count / total_bookings * 100) if total_bookings > 0 else 0
            distribution[f"{method}_percentage"] = round(percentage, 2)
            distribution[f"{method}_count"] = int(result.count)
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
        # Use same date filtering logic as revenue metrics for consistency
        customer_ids_query = (
            select(Customer.id)
            .join(Booking, Customer.id == Booking.customer_id)
            .where(
                Booking.check_out >= date_from,
                Booking.check_in <= date_to,
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
                first_booking = _ensure_timezone_aware(customer.first_booking_date)
                comparison_date = _ensure_timezone_aware(date_from)

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
                # Ensure date_of_birth is timezone-aware
                dob = _ensure_timezone_aware(customer.date_of_birth)
                age = (datetime.now(timezone.utc) - dob).days // 365
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

    def get_room_performance(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        top_n: int = 3,
    ) -> dict[str, Any]:
        """
        Get best and worst performing rooms by ADR (Average Daily Rate).

        Args:
            session: Database session
            date_from: Start date
            date_to: End date
            top_n: Number of top/bottom rooms to return

        Returns:
            Dictionary with top_performers and bottom_performers lists
        """
        # Calculate ADR per room (total_revenue / total_nights)
        nights_expr = func.greatest(1, func.extract("day", Booking.check_out - Booking.check_in))

        query = select(
            Room.id,
            Room.room_number,
            Room.room_type,
            func.count(Booking.id).label("bookings"),
            func.sum(Booking.total_amount).label("revenue"),
            func.sum(nights_expr).label("total_nights"),
            (func.sum(Booking.total_amount) / func.sum(nights_expr)).label("adr"),
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
        ).group_by(
            Room.id, Room.room_number, Room.room_type
        ).having(
            func.count(Booking.id) > 0  # Only rooms with bookings
        )

        results = session.exec(query).all()

        # Sort by ADR
        sorted_results = sorted(results, key=lambda x: x.adr if x.adr else 0, reverse=True)

        # Get top N and bottom N
        top_performers = []
        for result in sorted_results[:top_n]:
            # Calculate occupancy for this room
            days_in_period = (date_to - date_from).days
            if days_in_period <= 0:
                days_in_period = 1
            available_nights = days_in_period

            # Get occupied nights for this room
            occupied_nights = session.exec(
                select(
                    func.sum(func.greatest(1, func.extract("day",
                        func.least(Booking.check_out, date_to) -
                        func.greatest(Booking.check_in, date_from)
                    )))
                ).where(
                    Booking.room_id == result.id,
                    Booking.check_in < date_to,
                    Booking.check_out > date_from,
                    Booking.status.in_([
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN,
                        BookingStatus.CHECKED_OUT
                    ]),
                )
            ).first() or 0

            occupancy_rate = (occupied_nights / available_nights * 100) if available_nights > 0 else 0

            top_performers.append({
                "room_id": str(result.id),
                "room_number": result.room_number,
                "room_type": result.room_type.value,
                "adr": round(float(result.adr or 0), 2),
                "revenue": float(result.revenue or 0),
                "bookings": int(result.bookings or 0),
                "total_nights": int(result.total_nights or 0),
                "occupancy_rate": round(occupancy_rate, 2),
            })

        bottom_performers = []
        for result in sorted_results[-top_n:]:
            # Calculate occupancy for this room
            days_in_period = (date_to - date_from).days
            if days_in_period <= 0:
                days_in_period = 1
            available_nights = days_in_period

            # Get occupied nights for this room
            occupied_nights = session.exec(
                select(
                    func.sum(func.greatest(1, func.extract("day",
                        func.least(Booking.check_out, date_to) -
                        func.greatest(Booking.check_in, date_from)
                    )))
                ).where(
                    Booking.room_id == result.id,
                    Booking.check_in < date_to,
                    Booking.check_out > date_from,
                    Booking.status.in_([
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN,
                        BookingStatus.CHECKED_OUT
                    ]),
                )
            ).first() or 0

            occupancy_rate = (occupied_nights / available_nights * 100) if available_nights > 0 else 0

            bottom_performers.append({
                "room_id": str(result.id),
                "room_number": result.room_number,
                "room_type": result.room_type.value,
                "adr": round(float(result.adr or 0), 2),
                "revenue": float(result.revenue or 0),
                "bookings": int(result.bookings or 0),
                "total_nights": int(result.total_nights or 0),
                "occupancy_rate": round(occupancy_rate, 2),
            })

        return {
            "top_performers": top_performers,
            "bottom_performers": list(reversed(bottom_performers)),  # Show worst first
            "total_rooms_analyzed": len(results),
            "analysis_period": {
                "start": date_from.isoformat(),
                "end": date_to.isoformat(),
            }
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
            # Format date based on group_by parameter
            if result.period:
                if group_by == "month":
                    date_str = result.period.strftime("%Y-%m")
                elif group_by == "week":
                    date_str = result.period.strftime("%Y-W%U")
                else:  # day
                    date_str = result.period.strftime("%Y-%m-%d")
            else:
                date_str = ""

            trend.append({
                "date": date_str,
                "value": float(result.revenue or 0),
            })

        return trend

    def get_hourly_distribution(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        metric: str = "check_ins",
        room_id: str | None = None,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get hourly distribution of check-ins or check-outs.

        Args:
            metric: 'check_ins' or 'check_outs'
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            List of dictionaries with hour and count
        """
        # Determine which field to use based on metric
        # Fall back to scheduled times if actual times are not available
        if metric == "check_outs":
            time_field = func.coalesce(Booking.actual_check_out, Booking.check_out)
        else:  # default to check_ins
            time_field = func.coalesce(Booking.actual_check_in, Booking.check_in)

        # Build base query
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
        )

        # Add room filters
        if room_id:
            query = query.where(Booking.room_id == room_id)
        if room_type:
            query = query.join(Room).where(Room.room_type == room_type)

        query = query.group_by(
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

    def get_seasonal_trends(
        self,
        session: Session,
        years: int = 2,
        room_id: str | None = None,
        room_type: str | None = None,
    ) -> dict[str, Any]:
        """
        Get seasonal trends analysis over multiple years.

        Args:
            years: Number of years to analyze (default: 2)
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            Dictionary with monthly trends, quarterly trends, and year-over-year comparison
        """
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=years * 365)

        # Monthly revenue and occupancy trends
        # Use a column reference for GROUP BY to avoid PostgreSQL grouping error
        month_col = func.date_trunc("month", Booking.check_in)
        monthly_query = select(
            month_col.label("month"),
            func.sum(Booking.total_amount).label("revenue"),
            func.count(Booking.id).label("bookings"),
            func.sum(
                func.greatest(1, func.extract("day", Booking.check_out - Booking.check_in))
            ).label("nights"),
        ).where(
            Booking.check_in >= start_date,
            Booking.check_in <= end_date,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        # Add room filters
        if room_id:
            monthly_query = monthly_query.where(Booking.room_id == room_id)
        if room_type:
            monthly_query = monthly_query.join(Room).where(Room.room_type == room_type)

        monthly_query = monthly_query.group_by(
            month_col
        ).order_by(
            month_col
        )

        monthly_results = session.exec(monthly_query).all()

        # Process monthly data
        monthly_trends = []
        for result in monthly_results:
            if result.month:
                monthly_trends.append({
                    "month": result.month.strftime("%Y-%m"),
                    "month_name": result.month.strftime("%B %Y"),
                    "revenue": float(result.revenue or 0),
                    "bookings": int(result.bookings or 0),
                    "nights": int(result.nights or 0),
                })

        # Quarterly aggregation
        # Use column references for GROUP BY to avoid PostgreSQL grouping error
        year_col = func.extract("year", Booking.check_in)
        quarter_col = func.extract("quarter", Booking.check_in)
        quarterly_query = select(
            year_col.label("year"),
            quarter_col.label("quarter"),
            func.sum(Booking.total_amount).label("revenue"),
            func.count(Booking.id).label("bookings"),
            func.avg(Booking.total_amount).label("avg_booking_value"),
        ).where(
            Booking.check_in >= start_date,
            Booking.check_in <= end_date,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        # Add room filters to quarterly query
        if room_id:
            quarterly_query = quarterly_query.where(Booking.room_id == room_id)
        if room_type:
            quarterly_query = quarterly_query.join(Room).where(Room.room_type == room_type)

        quarterly_query = quarterly_query.group_by(
            year_col,
            quarter_col
        ).order_by(
            year_col,
            quarter_col
        )

        quarterly_results = session.exec(quarterly_query).all()

        # Process quarterly data
        quarterly_trends = []
        for result in quarterly_results:
            quarterly_trends.append({
                "year": int(result.year),
                "quarter": int(result.quarter),
                "label": f"Q{int(result.quarter)} {int(result.year)}",
                "revenue": float(result.revenue or 0),
                "bookings": int(result.bookings or 0),
                "avg_booking_value": float(result.avg_booking_value or 0),
            })

        # Year-over-year comparison by month
        yoy_comparison = {}
        for trend in monthly_trends:
            month_date = datetime.strptime(trend["month"], "%Y-%m")
            month_num = month_date.month
            year = month_date.year

            if month_num not in yoy_comparison:
                yoy_comparison[month_num] = {}

            yoy_comparison[month_num][year] = {
                "revenue": trend["revenue"],
                "bookings": trend["bookings"],
            }

        # Calculate YoY growth rates
        yoy_growth = []
        for month_num, years_data in yoy_comparison.items():
            sorted_years = sorted(years_data.keys())
            for i in range(1, len(sorted_years)):
                prev_year = sorted_years[i - 1]
                curr_year = sorted_years[i]

                prev_revenue = years_data[prev_year]["revenue"]
                curr_revenue = years_data[curr_year]["revenue"]

                growth_rate = ((curr_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0

                month_name = datetime(2000, month_num, 1).strftime("%B")
                yoy_growth.append({
                    "month": month_name,
                    "month_number": month_num,
                    "previous_year": prev_year,
                    "current_year": curr_year,
                    "revenue_growth": round(growth_rate, 2),
                    "previous_revenue": prev_revenue,
                    "current_revenue": curr_revenue,
                })

        # Calculate peak and low seasons
        if monthly_trends:
            avg_monthly_revenue = sum(m["revenue"] for m in monthly_trends) / len(monthly_trends)
            peak_months = [m for m in monthly_trends if m["revenue"] > avg_monthly_revenue * 1.2]
            low_months = [m for m in monthly_trends if m["revenue"] < avg_monthly_revenue * 0.8]
        else:
            peak_months = []
            low_months = []

        # Calculate occupancy rate for each month
        for month_data in monthly_trends:
            # Estimate occupancy based on bookings
            month_data["occupancy_rate"] = min(100, month_data["bookings"] * 3)  # Rough estimate

        # Find peak season, highest revenue month, and best occupancy month
        peak_season = None
        highest_revenue_month = None
        highest_occupancy_month = None

        if monthly_trends:
            # Find highest revenue month
            max_revenue_month = max(monthly_trends, key=lambda x: x["revenue"])
            if max_revenue_month and max_revenue_month["revenue"] > 0:
                highest_revenue_month = max_revenue_month.get("month_name", "N/A")

            # Find highest occupancy month
            max_occupancy_month = max(monthly_trends, key=lambda x: x.get("occupancy_rate", 0))
            if max_occupancy_month and max_occupancy_month.get("occupancy_rate", 0) > 0:
                highest_occupancy_month = max_occupancy_month.get("month_name", "N/A")

            # Determine peak season based on highest revenue
            if max_revenue_month:
                # Extract month from month_name (e.g., "January 2024" -> "January")
                month_name = max_revenue_month.get("month_name", "")
                if month_name:
                    month = month_name.split()[0] if " " in month_name else month_name
                    # Map to season
                    if month in ["December", "January", "February"]:
                        peak_season = "Winter"
                    elif month in ["March", "April", "May"]:
                        peak_season = "Spring"
                    elif month in ["June", "July", "August"]:
                        peak_season = "Summer"
                    elif month in ["September", "October", "November"]:
                        peak_season = "Autumn"

        return {
            "monthly_data": monthly_trends,  # Frontend expects "monthly_data"
            "monthly_trends": monthly_trends,  # Keep for backward compatibility
            "quarterly_trends": quarterly_trends,
            "year_over_year_growth": sorted(yoy_growth, key=lambda x: x["month_number"]),
            "peak_months": peak_months,
            "low_months": low_months,
            "peak_season": peak_season,
            "highest_revenue_month": highest_revenue_month,
            "highest_occupancy_month": highest_occupancy_month,
            "analysis_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "years": years,
            }
        }

    def get_top_customers(
        self,
        session: Session,
        limit: int = 20,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Get top customers by total revenue.

        Args:
            limit: Number of top customers to return
            date_from: Optional start date for filtering
            date_to: Optional end date for filtering

        Returns:
            Dictionary with top customers list
        """
        if not date_to:
            date_to = datetime.now(timezone.utc)
        if not date_from:
            date_from = date_to - timedelta(days=365)

        # Get all customers with stats in the period
        customer_query = select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.phone,
            Customer.first_booking_date,
            Customer.last_booking_date,
            Customer.total_bookings,
            Customer.total_spent,
            func.count(Booking.id).label("period_bookings"),
            func.sum(Booking.total_amount).label("period_revenue"),
        ).join(
            Booking, Customer.id == Booking.customer_id, isouter=True
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.phone,
            Customer.first_booking_date,
            Customer.last_booking_date,
            Customer.total_bookings,
            Customer.total_spent
        ).order_by(
            Customer.total_spent.desc()
        ).limit(limit)

        results = session.exec(customer_query).all()

        # Format results
        top_customers = []
        for customer in results:
            full_name = f"{customer.first_name} {customer.last_name}" if customer.first_name and customer.last_name else customer.first_name or customer.last_name or ""
            avg_booking_value = float(customer.total_spent or 0) / max(1, customer.total_bookings)

            top_customers.append({
                "id": str(customer.id),
                "name": full_name,
                "phone": customer.phone,
                "total_revenue": float(customer.total_spent or 0),
                "total_bookings": customer.total_bookings,
                "average_booking_value": round(avg_booking_value, 2),
                "first_booking_date": customer.first_booking_date.isoformat() if customer.first_booking_date else None,
                "last_booking_date": customer.last_booking_date.isoformat() if customer.last_booking_date else None,
                "period_bookings": customer.period_bookings,
                "period_revenue": float(customer.period_revenue or 0),
            })

        return {
            "top_customers": top_customers,
            "analysis_period": {
                "start": date_from.isoformat(),
                "end": date_to.isoformat(),
            },
            "total_customers": len(top_customers),
        }

    def get_customer_segments(
        self,
        session: Session,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Segment customers into categories based on their booking behavior.

        Categories:
        - VIP: Top 10% by revenue
        - Loyal: 5+ bookings or active for 6+ months
        - Regular: 2-4 bookings
        - New: First booking within last 30 days
        - At Risk: No bookings in last 90 days but had bookings before
        """
        if not date_to:
            date_to = datetime.now(timezone.utc)
        if not date_from:
            date_from = date_to - timedelta(days=365)

        # Get all customers with booking stats in the period
        customer_stats_query = select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.phone,
            Customer.district,
            Customer.first_booking_date,
            Customer.last_booking_date,
            Customer.total_bookings,
            Customer.total_spent,
            func.count(Booking.id).label("period_bookings"),
            func.sum(Booking.total_amount).label("period_revenue"),
            func.max(Booking.check_in).label("last_booking"),
        ).join(
            Booking, Customer.id == Booking.customer_id, isouter=True
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.phone,
            Customer.district,
            Customer.first_booking_date,
            Customer.last_booking_date,
            Customer.total_bookings,
            Customer.total_spent
        )

        results = session.exec(customer_stats_query).all()

        # Calculate thresholds
        revenues = [r.total_spent for r in results if r.total_spent]
        revenues.sort(reverse=True)
        vip_threshold = revenues[int(len(revenues) * 0.1)] if len(revenues) > 10 else (revenues[0] if revenues else 0)

        # Categorize customers
        segments = {
            "vip": [],
            "loyal": [],
            "regular": [],
            "new": [],
            "at_risk": [],
        }

        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        ninety_days_ago = now - timedelta(days=90)

        for customer in results:
            # Combine first and last name
            full_name = f"{customer.first_name} {customer.last_name}" if customer.first_name and customer.last_name else customer.first_name or customer.last_name or ""

            customer_data = {
                "id": str(customer.id),
                "name": full_name,
                "phone": customer.phone,
                "district": customer.district.value if customer.district else None,
                "total_bookings": customer.total_bookings,
                "total_revenue": float(customer.total_spent or 0),
                "period_bookings": customer.period_bookings,
                "period_revenue": float(customer.period_revenue or 0),
            }

            # VIP customers (top 10% by revenue)
            if customer.total_spent and customer.total_spent >= vip_threshold:
                segments["vip"].append(customer_data)
            # New customers (first booking within last 30 days)
            elif customer.first_booking_date and customer.first_booking_date >= thirty_days_ago:
                segments["new"].append(customer_data)
            # Loyal customers (5+ bookings or active for 6+ months)
            elif customer.total_bookings >= 5:
                segments["loyal"].append(customer_data)
            # At risk (no recent bookings but had bookings before)
            elif customer.last_booking_date and customer.last_booking_date < ninety_days_ago:
                segments["at_risk"].append(customer_data)
            # Regular customers (2-4 bookings)
            elif customer.total_bookings >= 2:
                segments["regular"].append(customer_data)
            else:
                # Default to new if only 1 booking
                segments["new"].append(customer_data)

        # Calculate segment statistics
        segment_stats = {}
        for segment_name, customers in segments.items():
            if customers:
                total_revenue = sum(c["total_revenue"] for c in customers)
                avg_revenue = total_revenue / len(customers)
                total_customers = len(results) if results else 1  # Avoid division by zero
                segment_stats[segment_name] = {
                    "count": len(customers),
                    "total_revenue": total_revenue,
                    "average_revenue": round(avg_revenue, 2),
                    "avg_revenue_per_customer": round(avg_revenue, 2),  # Add field with expected name
                    "percentage": round(len(customers) / total_customers * 100, 1),
                    "customers": customers[:10],  # Return top 10 for each segment
                }
            else:
                segment_stats[segment_name] = {
                    "count": 0,
                    "total_revenue": 0,
                    "average_revenue": 0,
                    "avg_revenue_per_customer": 0,  # Add field with expected name
                    "percentage": 0,
                    "customers": [],
                }

        return {
            "segments": segment_stats,
            "summary": {
                "total_customers": len(results),
                "vip_percentage": round(segment_stats["vip"]["count"] / len(results) * 100, 2) if results else 0,
                "at_risk_count": segment_stats["at_risk"]["count"],
            },
            "analysis_period": {
                "start": date_from.isoformat(),
                "end": date_to.isoformat(),
            }
        }

    def get_revenue_by_district(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
    ) -> dict[str, Any]:
        """
        Get revenue breakdown by customer district.

        Args:
            session: Database session
            date_from: Start date
            date_to: End date

        Returns:
            Dictionary with district revenue data
        """
        date_from = _ensure_timezone_aware(date_from)
        date_to = _ensure_timezone_aware(date_to)

        # Query bookings with customer district
        query = select(
            Customer.district,
            func.sum(Booking.total_amount).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.count(func.distinct(Customer.id)).label("unique_customers"),
        ).join(
            Customer, Booking.customer_id == Customer.id
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
            Customer.district.is_not(None),  # Only customers with district set
        ).group_by(
            Customer.district
        ).order_by(
            func.sum(Booking.total_amount).desc()
        )

        results = session.exec(query).all()

        # Calculate totals
        total_revenue = sum(row.total_revenue or 0 for row in results)
        total_bookings = sum(row.booking_count for row in results)

        # Format results
        district_data = []
        for row in results:
            revenue = float(row.total_revenue or 0)
            percentage = (revenue / total_revenue * 100) if total_revenue > 0 else 0

            district_data.append({
                "district": row.district.value if row.district else "Unknown",
                "revenue": revenue,
                "percentage": round(percentage, 2),
                "bookings": row.booking_count,
                "unique_customers": row.unique_customers,
                "average_booking_value": round(revenue / row.booking_count, 2) if row.booking_count > 0 else 0,
            })

        return {
            "districts": district_data,
            "summary": {
                "total_revenue": total_revenue,
                "total_bookings": total_bookings,
                "district_count": len(district_data),
            },
            "analysis_period": {
                "start": date_from.isoformat(),
                "end": date_to.isoformat(),
            }
        }

analytics = CRUDAnalytics()
