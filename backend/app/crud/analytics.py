"""
CRUD operations for analytics.
All SQL queries for analytics data retrieval.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import case
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

    def get_seasonal_trends(
        self,
        session: Session,
        years: int = 2,
    ) -> dict[str, Any]:
        """
        Get seasonal trends analysis over multiple years.

        Args:
            years: Number of years to analyze (default: 2)

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
        ).group_by(
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
        ).group_by(
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

    def get_customer_lifetime_value(
        self,
        session: Session,
        months_back: int = 12,
    ) -> dict[str, Any]:
        """
        Calculate customer lifetime value (LTV) metrics.

        Returns:
        - Average LTV
        - LTV by customer segment
        - Top customers by LTV
        - LTV trends over time
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=months_back * 30)

        # Get all customers with their lifetime stats
        ltv_query = select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.first_booking_date,
            Customer.total_spent,
            Customer.total_bookings,
            func.extract("day",
                func.coalesce(Customer.last_booking_date, datetime.now(timezone.utc)) -
                Customer.first_booking_date
            ).label("customer_lifetime_days"),
        ).where(
            Customer.first_booking_date.isnot(None),
            Customer.first_booking_date >= cutoff_date,
        )

        results = session.exec(ltv_query).all()

        if not results:
            return {
                "average_ltv": 0,
                "ltv_by_tenure": [],
                "top_customers": [],
                "metrics": {},
            }

        # Calculate LTV metrics
        ltv_data = []
        for customer in results:
            lifetime_days = max(1, int(customer.customer_lifetime_days or 1))
            lifetime_months = float(lifetime_days) / 30
            revenue_per_month = float(customer.total_spent or 0) / max(1.0, lifetime_months)

            # Combine first and last name
            full_name = f"{customer.first_name} {customer.last_name}" if customer.first_name and customer.last_name else customer.first_name or customer.last_name or ""

            ltv_data.append({
                "id": str(customer.id),
                "name": full_name,
                "ltv": float(customer.total_spent or 0),
                "bookings": customer.total_bookings,
                "lifetime_days": int(lifetime_days),
                "lifetime_months": round(lifetime_months, 1),
                "revenue_per_month": round(revenue_per_month, 2),
                "average_booking_value": round(float(customer.total_spent or 0) / max(1, customer.total_bookings), 2),
            })

        # Sort by LTV
        ltv_data.sort(key=lambda x: x["ltv"], reverse=True)

        # Create LTV distribution buckets
        ltv_distribution = []
        buckets = [(0, 1000, "$0-1K"), (1000, 5000, "$1K-5K"), (5000, 10000, "$5K-10K"),
                   (10000, 25000, "$10K-25K"), (25000, float('inf'), "$25K+")]

        for min_val, max_val, label in buckets:
            customers_in_range = [c for c in ltv_data if min_val <= c["ltv"] < max_val]
            if customers_in_range:
                ltv_distribution.append({
                    "range": label,
                    "customer_count": len(customers_in_range),
                    "total_ltv": sum(c["ltv"] for c in customers_in_range),
                    "average_ltv": round(sum(c["ltv"] for c in customers_in_range) / len(customers_in_range), 2),
                })

        # Create LTV trend (monthly averages)
        ltv_trend = []
        if ltv_data:
            # Create monthly LTV trend for visualization
            # Simplified: use last 6 data points for trend
            for i in range(min(6, len(ltv_data))):
                ltv_trend.append({
                    "period": f"Month {i+1}",
                    "average_ltv": ltv_data[i]["ltv"],
                    "customer_count": 1,
                })

        # Calculate tenure-based LTV
        tenure_groups = {
            "0-3_months": [],
            "3-6_months": [],
            "6-12_months": [],
            "12+_months": [],
        }

        for customer in ltv_data:
            if customer["lifetime_months"] <= 3:
                tenure_groups["0-3_months"].append(customer["ltv"])
            elif customer["lifetime_months"] <= 6:
                tenure_groups["3-6_months"].append(customer["ltv"])
            elif customer["lifetime_months"] <= 12:
                tenure_groups["6-12_months"].append(customer["ltv"])
            else:
                tenure_groups["12+_months"].append(customer["ltv"])

        ltv_by_tenure = []
        for tenure, values in tenure_groups.items():
            if values:
                ltv_by_tenure.append({
                    "tenure": tenure,
                    "average_ltv": round(sum(values) / len(values), 2),
                    "customer_count": len(values),
                })

        # Calculate overall metrics
        total_ltv = sum(c["ltv"] for c in ltv_data)
        average_ltv = total_ltv / len(ltv_data) if ltv_data else 0

        return {
            "average_ltv": round(average_ltv, 2),
            "total_ltv": round(total_ltv, 2),
            "ltv_distribution": ltv_distribution,
            "ltv_trend": ltv_trend,
            "ltv_by_tenure": ltv_by_tenure,
            "top_customers": ltv_data[:20],  # Top 20 customers
            "metrics": {
                "average_bookings_per_customer": round(sum(c["bookings"] for c in ltv_data) / len(ltv_data), 2),
                "average_lifetime_months": round(sum(c["lifetime_months"] for c in ltv_data) / len(ltv_data), 1),
                "average_revenue_per_month": round(sum(c["revenue_per_month"] for c in ltv_data) / len(ltv_data), 2),
            },
            "analysis_period": {
                "months_analyzed": months_back,
                "customers_analyzed": len(ltv_data),
            }
        }

    def get_customer_behavior_patterns(
        self,
        session: Session,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Analyze customer booking behavior patterns.

        Returns:
        - Booking frequency distribution
        - Preferred room types by customer segment
        - Booking lead time analysis
        - Repeat booking patterns
        - Day of week preferences
        """
        if not date_to:
            date_to = datetime.now(timezone.utc)
        if not date_from:
            date_from = date_to - timedelta(days=180)  # Last 6 months

        # Booking frequency distribution
        frequency_query = select(
            Customer.total_bookings,
            func.count(Customer.id).label("customer_count"),
        ).group_by(
            Customer.total_bookings
        ).order_by(
            Customer.total_bookings
        )

        frequency_results = session.exec(frequency_query).all()

        # Group frequency results into ranges for better visualization
        frequency_distribution = []
        ranges = [(1, 1, "1 booking"), (2, 2, "2 bookings"), (3, 4, "3-4 bookings"),
                  (5, 9, "5-9 bookings"), (10, float('inf'), "10+ bookings")]

        for min_val, max_val, label in ranges:
            customer_count = sum(r.customer_count for r in frequency_results
                               if r.total_bookings and min_val <= r.total_bookings <= max_val)
            if customer_count > 0:
                frequency_distribution.append({
                    "frequency_range": label,
                    "customer_count": customer_count,
                })

        # Room type preferences
        room_pref_query = select(
            Room.room_type,
            func.count(Booking.id).label("booking_count"),
            func.count(func.distinct(Booking.customer_id)).label("unique_customers"),
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
            Room.room_type
        )

        room_pref_results = session.exec(room_pref_query).all()

        # Convert room preferences to the expected format
        room_preferences = {}
        for result in room_pref_results:
            room_preferences[result.room_type.value] = result.booking_count

        # Booking lead time analysis (days between booking and check-in)
        lead_time_query = select(
            func.extract("day", Booking.check_in - Booking.booking_date).label("lead_days"),
            func.count(Booking.id).label("count"),
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(
            func.extract("day", Booking.check_in - Booking.booking_date)
        )

        lead_time_results = session.exec(lead_time_query).all()

        # Categorize lead times
        lead_time_categories = {
            "same_day": 0,
            "1-3_days": 0,
            "4-7_days": 0,
            "8-14_days": 0,
            "15-30_days": 0,
            "30+_days": 0,
        }

        for result in lead_time_results:
            if result.lead_days is not None:
                lead_days = int(result.lead_days)
                count = result.count

                if lead_days == 0:
                    lead_time_categories["same_day"] += count
                elif lead_days <= 3:
                    lead_time_categories["1-3_days"] += count
                elif lead_days <= 7:
                    lead_time_categories["4-7_days"] += count
                elif lead_days <= 14:
                    lead_time_categories["8-14_days"] += count
                elif lead_days <= 30:
                    lead_time_categories["15-30_days"] += count
                else:
                    lead_time_categories["30+_days"] += count

        # Day of week preferences
        dow_query = select(
            func.extract("dow", Booking.check_in).label("day_of_week"),
            func.count(Booking.id).label("count"),
        ).where(
            Booking.check_in >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        ).group_by(
            func.extract("dow", Booking.check_in)
        ).order_by(
            func.extract("dow", Booking.check_in)
        )

        dow_results = session.exec(dow_query).all()

        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        day_of_week_preferences = []
        for result in dow_results:
            if result.day_of_week is not None:
                dow_idx = int(result.day_of_week)
                day_of_week_preferences.append({
                    "day": day_names[dow_idx],
                    "day_number": dow_idx,
                    "bookings": result.count,
                })

        # Repeat booking rate (customers with multiple bookings)
        repeat_query = select(
            func.count(Customer.id).label("total_customers"),
            func.sum(case((Customer.total_bookings > 1, 1), else_=0)).label("repeat_customers"),
        ).where(
            Customer.first_booking_date >= date_from,
            Customer.first_booking_date <= date_to,
        )

        repeat_result = session.exec(repeat_query).first()

        repeat_rate = 0
        if repeat_result and repeat_result.total_customers:
            repeat_rate = (repeat_result.repeat_customers or 0) / repeat_result.total_customers * 100

        # Create booking timing pattern for chart
        booking_timing = []
        total_lead_days = 0
        total_lead_bookings = 0
        for result in lead_time_results:
            if result.lead_days is not None:
                booking_timing.append({
                    "days_in_advance": int(result.lead_days),
                    "booking_count": result.count,
                })
                total_lead_days += int(result.lead_days) * result.count
                total_lead_bookings += result.count

        # Calculate average days in advance
        avg_days_in_advance = total_lead_days / total_lead_bookings if total_lead_bookings > 0 else 0

        # Calculate average booking frequency
        avg_booking_frequency = 0
        if frequency_results:
            total_customers = sum(r.customer_count for r in frequency_results if r.total_bookings)
            total_bookings = sum(r.total_bookings * r.customer_count for r in frequency_results if r.total_bookings)
            avg_booking_frequency = total_bookings / total_customers if total_customers > 0 else 0

        # Find most preferred room type
        most_preferred_room_type = None
        if room_preferences:
            # room_preferences is a dict, find the key with max value
            most_preferred_room_type = max(room_preferences, key=room_preferences.get) if room_preferences else None

        # Calculate average stay duration (need to query for this)
        avg_stay_query = select(
            func.avg(
                func.greatest(1, func.extract("day", Booking.check_out - Booking.check_in))
            ).label("avg_stay")
        ).where(
            Booking.check_out >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        avg_stay_result = session.exec(avg_stay_query).first()
        avg_stay_duration = float(avg_stay_result.avg_stay) if avg_stay_result and avg_stay_result.avg_stay else 0

        return {
            "frequency_distribution": frequency_distribution,
            "room_preferences": room_preferences,
            "booking_timing": booking_timing,
            "lead_time_distribution": lead_time_categories,
            "day_of_week_preferences": day_of_week_preferences,
            "avg_booking_frequency": round(avg_booking_frequency, 1),
            "avg_days_in_advance": round(avg_days_in_advance, 0),
            "most_preferred_room_type": most_preferred_room_type,
            "avg_stay_duration": round(avg_stay_duration, 1),
            "metrics": {
                "repeat_customer_rate": round(repeat_rate, 2),
                "total_customers_analyzed": repeat_result.total_customers if repeat_result else 0,
            },
            "analysis_period": {
                "start": date_from.isoformat(),
                "end": date_to.isoformat(),
            }
        }


analytics = CRUDAnalytics()
