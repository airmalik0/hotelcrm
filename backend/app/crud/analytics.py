"""
CRUD operations for analytics.
All SQL queries for analytics data retrieval.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, cast

from sqlalchemy import cast as sa_cast
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Session, func, or_, select

from app.models import Booking, BookingStatus, Customer, Room
from app.models.analytics import AgeGroup, AnalyticsFilter
from app.models.room_category import RoomCategory


def _ensure_timezone_aware(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware, converting naive to UTC if needed."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class CRUDAnalytics:
    """CRUD operations for analytics data."""

    def _compute_occupancy(
        self,
        session: Session,
        *,
        period_start: datetime,
        period_end: datetime,
        room_id: str | None = None,
        category_id: str | None = None,
        filters: Optional["AnalyticsFilter"] = None,
    ) -> tuple[int, int, float]:
        """
        Unified occupancy calculation.

        Returns: (available_nights, occupied_nights, occupancy_rate_percent).

        - available_nights = rooms_count * days_in_period (respecting filters)
        - occupied_nights = sum of overlapping day-fractions per booking in [period_start, period_end)
        - occupancy_rate = occupied_nights / available_nights * 100
        May exceed 100% if в один день было несколько оплаченных заездов (разные брони).
        """
        rooms_query = select(func.count(Room.id))
        if room_id and room_id != "all":
            rooms_query = rooms_query.where(Room.id == room_id)
        if category_id:
            rooms_query = rooms_query.where(Room.category_id == category_id)
        if filters and getattr(filters, "category_id", None) and not category_id:
            rooms_query = rooms_query.where(Room.category_id == filters.category_id)
        rooms_count = int(session.exec(rooms_query).first() or 0)

        days_in_period = (period_end - period_start).days
        if days_in_period <= 0:
            days_in_period = 1
        available_nights = rooms_count * days_in_period

        days_in_period_expr = func.greatest(
            1,
            func.extract(
                "epoch",
                func.least(Booking.check_out, period_end) - func.greatest(Booking.check_in, period_start)
            ) / 86400
        )
        occupied_query = select(func.sum(days_in_period_expr)).where(
            Booking.check_in < period_end,
            Booking.check_out > period_start,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )
        if room_id and room_id != "all":
            occupied_query = occupied_query.where(Booking.room_id == room_id)
        if category_id or (filters and getattr(filters, "category_id", None)):
            occupied_query = occupied_query.join(Room, Room.id == Booking.room_id)
            if category_id:
                occupied_query = occupied_query.where(Room.category_id == category_id)
            else:
                occupied_query = occupied_query.where(Room.category_id == filters.category_id)

        if filters and any([filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type]):
            occupied_query = occupied_query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                occupied_query = occupied_query.where(Customer.country_code == filters.country_code)
            if filters.region:
                occupied_query = occupied_query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                occupied_query = occupied_query.where(Customer.district == filters.district)
            if filters.tags:
                col = sa_cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    occupied_query = occupied_query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    occupied_query = occupied_query.where(Customer.first_booking_date >= period_start)
                elif filters.customer_type.value == "returning":
                    occupied_query = occupied_query.where(Customer.first_booking_date < period_start)

        occupied_nights = int(session.exec(occupied_query).first() or 0)
        occupancy_rate = (occupied_nights / available_nights * 100) if available_nights > 0 else 0.0

        return available_nights, occupied_nights, float(occupancy_rate)

    def get_revenue_by_period(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        room_id: str | None = None,
        include_cancelled: bool = False,
        filters: Optional["AnalyticsFilter"] = None,
    ) -> dict[str, Any]:
        """
        Get revenue metrics for a period using proportional calculation.

        For bookings that span multiple days, only counts revenue/nights
        for the days that fall within the specified period.

        Example: 7-day booking ($700) overlapping 1 day of period = $100 revenue

        Returns:
            Dictionary with total_revenue, booking_count, total_nights, discount_amount, refund_amount
        """
        # Calculate proportional revenue for days within the period
        # Formula: (days_in_period / total_booking_days) * total_amount
        # Use EPOCH (seconds) / 86400 for accurate fractional days
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            func.sum(
                Booking.total_amount * days_in_period / total_booking_days
            ).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.sum(days_in_period).label("total_nights"),
            func.sum(
                Booking.total_amount * Booking.discount / 100 * days_in_period / total_booking_days
            ).label("discount_amount"),
        ).where(
            Booking.check_in < date_to,  # Booking starts before period ends
            Booking.check_out > date_from,  # Booking ends after period starts
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

        # Category filter
        if filters and getattr(filters, "category_id", None):
            query = query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        # Customer-based filters
        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            query = query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                query = query.where(Customer.district == filters.district)
            if filters.tags:
                col = sa_cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

        result = session.exec(query).first()

        # Calculate refunds from payment_adjustments - get bookings with adjustments
        refund_query = select(Booking.payment_adjustments).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
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

        if filters and getattr(filters, "category_id", None):
            refund_query = refund_query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        # Apply same customer-based filters to refunds
        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            refund_query = refund_query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                refund_query = refund_query.where(Customer.country_code == filters.country_code)
            if filters.region:
                refund_query = refund_query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                refund_query = refund_query.where(Customer.district == filters.district)
            if filters.tags:
                col = sa_cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    refund_query = refund_query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    refund_query = refund_query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    refund_query = refund_query.where(Customer.first_booking_date < date_from)

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
        filters: Optional["AnalyticsFilter"] = None,
    ) -> dict[str, Any]:
        """
        Calculate occupancy metrics for a period.

        Returns:
            Dictionary with occupancy_rate, average_length_of_stay, check_ins, check_outs, cancellations
        """
        # Use unified occupancy calculator
        total_available_nights, occupied_nights, occupancy_rate = self._compute_occupancy(
            session,
            period_start=date_from,
            period_end=date_to,
            room_id=room_id,
            category_id=getattr(filters, "category_id", None) if filters else None,
            filters=filters,
        )

        # Average length of stay (in nights) among bookings overlapping the period
        avg_stay_query = select(
            func.avg(
                func.greatest(1, func.extract("epoch", Booking.check_out - Booking.check_in) / 86400)
            )
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
            avg_stay_query = avg_stay_query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            avg_stay_query = avg_stay_query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)
        if filters and any([filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type]):
            avg_stay_query = avg_stay_query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                avg_stay_query = avg_stay_query.where(Customer.country_code == filters.country_code)
            if filters.region:
                avg_stay_query = avg_stay_query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                avg_stay_query = avg_stay_query.where(Customer.district == filters.district)
            if filters.tags:
                col = sa_cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    avg_stay_query = avg_stay_query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    avg_stay_query = avg_stay_query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    avg_stay_query = avg_stay_query.where(Customer.first_booking_date < date_from)
        avg_stay = float(session.exec(avg_stay_query).first() or 0)

        # Count actual check-ins (by check_in date)
        # Include both CHECKED_IN and CHECKED_OUT statuses to count all arrivals
        checkin_query = select(func.count(Booking.id)).where(
            Booking.check_in >= date_from,
            Booking.check_in <= date_to,
            Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
        )
        if room_id and room_id != "all":
            checkin_query = checkin_query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            checkin_query = checkin_query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        check_ins = session.exec(checkin_query).first() or 0

        # Count actual check-outs (by check_out date)
        checkout_query = select(func.count(Booking.id)).where(
            Booking.check_out >= date_from,
            Booking.check_out <= date_to,
            Booking.status == BookingStatus.CHECKED_OUT,
        )
        if room_id and room_id != "all":
            checkout_query = checkout_query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            checkout_query = checkout_query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            checkin_query = checkin_query.join(Customer, Customer.id == Booking.customer_id)
            checkout_query = checkout_query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                checkin_query = checkin_query.where(Customer.country_code == filters.country_code)
                checkout_query = checkout_query.where(Customer.country_code == filters.country_code)
            if filters.region:
                checkin_query = checkin_query.where(Customer.region == filters.region)
                checkout_query = checkout_query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                checkin_query = checkin_query.where(Customer.district == filters.district)
                checkout_query = checkout_query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    checkin_query = checkin_query.where(or_(*tag_filters))
                    checkout_query = checkout_query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    checkin_query = checkin_query.where(Customer.first_booking_date >= date_from)
                    checkout_query = checkout_query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    checkin_query = checkin_query.where(Customer.first_booking_date < date_from)
                    checkout_query = checkout_query.where(Customer.first_booking_date < date_from)

        check_outs = session.exec(checkout_query).first() or 0

        # Count cancellations (by check_in date - shows cancelled bookings that were supposed to arrive in this period)
        cancellation_query = select(func.count(Booking.id)).where(
            Booking.check_in >= date_from,
            Booking.check_in <= date_to,
            Booking.status == BookingStatus.CANCELLED,
        )
        if room_id and room_id != "all":
            cancellation_query = cancellation_query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            cancellation_query = cancellation_query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        cancellations = session.exec(cancellation_query).first() or 0

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
        room_id: str | None = None,
        filters: Optional["AnalyticsFilter"] = None,
    ) -> dict[str, Any]:
        """
        Get payment method distribution for bookings with proportional amounts.

        Returns:
            Dictionary with percentages and amounts for each payment method
        """
        # Proportional calculation using EPOCH for accuracy
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            Booking.payment_method,
            func.count(Booking.id).label("count"),
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("amount"),
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
        )

        if not include_cancelled:
            query = query.where(Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]))

        if room_id and room_id != "all":
            query = query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            query = query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            query = query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                query = query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

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
        filters: "AnalyticsFilter",
        room_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Get customer-related metrics.

        Args:
            district: Optional filter by customer district
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            Dictionary with customer counts, age distribution, district distribution
        """
        # Get unique customer IDs who made bookings in the period
        # Use consistent date filtering logic (overlap condition)
        customer_ids_query = (
            select(Customer.id)
            .join(Booking, Customer.id == Booking.customer_id)
            .where(
                Booking.check_in < date_to,
                Booking.check_out > date_from,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.CHECKED_OUT
                ]),
            )
            .distinct()
        )

        # Location filters
        if filters.country_code and filters.country_code != "":
            customer_ids_query = customer_ids_query.where(Customer.country_code == filters.country_code)
        if filters.region and filters.region != "":
            customer_ids_query = customer_ids_query.where(Customer.region == filters.region)
        if filters.district and filters.district != "all":
            customer_ids_query = customer_ids_query.where(Customer.district == filters.district)
        # Tags filter (any-of) for JSON array: use Postgres @> operator
        if filters.tags:
            col = cast(Customer.tags, JSONB)
            tag_filters = [col.contains([tag]) for tag in filters.tags]
            if tag_filters:
                customer_ids_query = customer_ids_query.where(or_(*tag_filters))
        # Customer type filter
        if filters.customer_type:
            if filters.customer_type.value == "new":
                customer_ids_query = customer_ids_query.where(Customer.first_booking_date >= date_from)
            elif filters.customer_type.value == "returning":
                customer_ids_query = customer_ids_query.where(Customer.first_booking_date < date_from)

        # Add room filters
        if room_id:
            customer_ids_query = customer_ids_query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            customer_ids_query = customer_ids_query.join(Room, Booking.room_id == Room.id).where(Room.category_id == filters.category_id)

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

        # Geo distributions
        country_distribution: dict[str, int] = {}
        region_distribution: dict[str, int] = {}
        district_distribution: dict[str, int] = {}
        for customer in customers:
            if customer.country_code:
                country = customer.country_code
                country_distribution[country] = country_distribution.get(country, 0) + 1
            if customer.region:
                region = customer.region
                region_distribution[region] = region_distribution.get(region, 0) + 1
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
            "country_distribution": country_distribution,
            "region_distribution": region_distribution,
            "district_distribution": district_distribution,
        }

    def get_room_performance(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        top_n: int = 3,
        filters: Optional["AnalyticsFilter"] = None,
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
        # Calculate ADR per room with proportional revenue (use seconds/86400 to avoid zero-day divisions)
        days_in_period = func.greatest(1,
            func.extract("epoch",
                func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)
            ) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            Room.id,
            Room.room_number,
            Room.category_id,
            func.count(Booking.id).label("bookings"),
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("revenue"),
            func.sum(days_in_period).label("total_nights"),
            (
                func.sum(Booking.total_amount * days_in_period / total_booking_days)
                / func.nullif(func.sum(days_in_period), 0)
            ).label("adr"),
        ).join(
            Booking, Room.id == Booking.room_id
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )
        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            query = query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                query = query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

        query = query.group_by(
            Room.id, Room.room_number, Room.category_id
        ).having(
            func.count(Booking.id) > 0  # Only rooms with bookings
        )

        results = session.exec(query).all()

        # Sort by ADR
        sorted_results = sorted(results, key=lambda x: x.adr if x.adr else 0, reverse=True)

        # Get top N and bottom N
        top_performers = []
        for result in sorted_results[:top_n]:
            # Calculate occupancy for this room via unified method
            available_nights, occupied_nights, occupancy_rate = self._compute_occupancy(
                session,
                period_start=date_from,
                period_end=date_to,
                room_id=str(result.id),
                filters=filters,
            )

            # Resolve category name lazily (small N)
            category_name = None
            if result.category_id:
                cat = session.exec(select(RoomCategory).where(RoomCategory.id == result.category_id)).first()
                category_name = cat.name if cat else None

            top_performers.append({
                "room_id": str(result.id),
                "room_number": result.room_number,
                "category_id": str(result.category_id) if result.category_id else None,
                "category_name": category_name,
                "adr": round(float(result.adr or 0), 2),
                "revenue": float(result.revenue or 0),
                "bookings": int(result.bookings or 0),
                "total_nights": int(result.total_nights or 0),
                "occupancy_rate": round(occupancy_rate, 2),
            })

        bottom_performers = []
        for result in sorted_results[-top_n:]:
            # Calculate occupancy for this room via unified method
            available_nights, occupied_nights, occupancy_rate = self._compute_occupancy(
                session,
                period_start=date_from,
                period_end=date_to,
                room_id=str(result.id),
                filters=filters,
            )

            category_name = None
            if result.category_id:
                cat = session.exec(select(RoomCategory).where(RoomCategory.id == result.category_id)).first()
                category_name = cat.name if cat else None

            bottom_performers.append({
                "room_id": str(result.id),
                "room_number": result.room_number,
                "category_id": str(result.category_id) if result.category_id else None,
                "category_name": category_name,
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

    def get_category_breakdown(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        filters: Optional["AnalyticsFilter"] = None,
    ) -> list[dict[str, Any]]:
        # Proportional revenue calculation
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            Room.category_id,
            func.count(Booking.id).label("bookings"),
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("revenue"),
        ).join(
            Booking, Room.id == Booking.room_id
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            query = query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                query = query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

        if filters and getattr(filters, "category_id", None):
            query = query.where(Room.category_id == filters.category_id)

        query = query.group_by(Room.category_id)

        rows = session.exec(query).all()

        # Names map
        category_ids = [r.category_id for r in rows if r.category_id]
        names_map: dict[str, str] = {}
        if category_ids:
            cats = session.exec(select(RoomCategory).where(RoomCategory.id.in_(category_ids))).all()
            names_map = {str(c.id): c.name for c in cats}

        # Compute occupancy rate and avg_rate per category
        results: list[dict[str, Any]] = []
        for r in rows:
            cat_id = str(r.category_id) if r.category_id else None

            # Use unified occupancy per category
            available_nights, occupied_nights, occupancy_rate = self._compute_occupancy(
                session,
                period_start=date_from,
                period_end=date_to,
                category_id=str(r.category_id) if r.category_id else None,
                filters=filters,
            )
            avg_rate = float(r.revenue or 0) / max(1.0, float(occupied_nights))

            results.append({
                "category_id": cat_id,
                "category_name": names_map.get(cat_id or "", None),
                "revenue": float(r.revenue or 0),
                "bookings": int(r.bookings or 0),
                "occupancy_rate": round(float(occupancy_rate), 2),
                "average_rate": round(avg_rate, 2),
            })

        return results

    def get_revenue_trend(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
        group_by: str = "day",
        filters: Optional["AnalyticsFilter"] = None,
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

        # Proportional revenue calculation using EPOCH for accurate day count
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            date_trunc.label("period"),
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("revenue"),
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )
        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            query = query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                query = query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

        query = query.group_by(
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
                    # Use ISO week format (%V) to match chart service parser
                    date_str = result.period.strftime("%Y-W%V")
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
        filters: Optional["AnalyticsFilter"] = None,
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
        if filters and getattr(filters, "category_id", None):
            query = query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            query = query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                query = query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

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
        filters: Optional["AnalyticsFilter"] = None,
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

        # Monthly revenue and occupancy trends (accurate per-month allocation)
        # Мы распределяем выручку и «занятые ночи» по каждому месяцу на основе
        # фактического пересечения бронирования с границами месяца и считаем
        # occupancy_rate как occupied_nights / available_nights.

        # Подготовим список месяцев в анализируемом диапазоне
        monthly_trends: list[dict[str, Any]] = []
        current_month_start = datetime(start_date.year, start_date.month, 1, tzinfo=timezone.utc)

        # Начало следующего месяца
        def _next_month(dt: datetime) -> datetime:
            year = dt.year + (1 if dt.month == 12 else 0)
            month = 1 if dt.month == 12 else dt.month + 1
            return datetime(year, month, 1, tzinfo=timezone.utc)

        while current_month_start < end_date:
            month_end = _next_month(current_month_start)

            # Параметры месяца
            month_label = current_month_start.strftime("%Y-%m")
            month_name = current_month_start.strftime("%B %Y")

            # Выручка/броней/ночей по месяцу (revenue и nights через пересечение с месяцем)
            days_in_period = func.greatest(
                1,
                func.extract(
                    "epoch",
                    func.least(Booking.check_out, month_end) - func.greatest(Booking.check_in, current_month_start),
                ) / 86400,
            )
            total_booking_days = func.greatest(
                1,
                func.extract("epoch", Booking.check_out - Booking.check_in) / 86400,
            )

            per_month_query = select(
                func.sum(Booking.total_amount * days_in_period / total_booking_days).label("revenue"),
                func.count(Booking.id).label("bookings"),
                func.sum(days_in_period).label("nights"),
            ).where(
                Booking.check_in < month_end,
                Booking.check_out > current_month_start,
                Booking.status.in_(
                    [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]
                ),
            )

            # Фильтры по номеру/категории
            if room_id:
                per_month_query = per_month_query.where(Booking.room_id == room_id)
            if filters and getattr(filters, "category_id", None):
                per_month_query = per_month_query.join(Room, Room.id == Booking.room_id).where(
                    Room.category_id == filters.category_id
                )

            # Клиентские фильтры
            if filters and any([
                filters.country_code,
                filters.region,
                filters.district,
                filters.tags,
                filters.customer_type,
            ]):
                per_month_query = per_month_query.join(Customer, Customer.id == Booking.customer_id)
                if filters.country_code:
                    per_month_query = per_month_query.where(Customer.country_code == filters.country_code)
                if filters.region:
                    per_month_query = per_month_query.where(Customer.region == filters.region)
                if filters.district and filters.district != "all":
                    per_month_query = per_month_query.where(Customer.district == filters.district)
                if filters.tags:
                    col = cast(Customer.tags, JSONB)
                    tag_filters = [col.contains([tag]) for tag in filters.tags]
                    if tag_filters:
                        per_month_query = per_month_query.where(or_(*tag_filters))
                if filters.customer_type:
                    if filters.customer_type.value == "new":
                        per_month_query = per_month_query.where(Customer.first_booking_date >= start_date)
                    elif filters.customer_type.value == "returning":
                        per_month_query = per_month_query.where(Customer.first_booking_date < start_date)

            r = session.exec(per_month_query).first()
            revenue = float(r.revenue if r and r.revenue is not None else 0)
            bookings = int(r.bookings if r and r.bookings is not None else 0)
            occupied_nights = int(r.nights if r and r.nights is not None else 0)

            # Единый расчёт occupancy для месяца
            available_nights, _, occupancy_rate = self._compute_occupancy(
                session,
                period_start=current_month_start,
                period_end=month_end,
                room_id=room_id,
                category_id=getattr(filters, "category_id", None) if filters else None,
                filters=filters,
            )

            monthly_trends.append({
                "month": month_label,
                "month_name": month_name,
                "revenue": revenue,
                "bookings": bookings,
                "nights": occupied_nights,
                "occupancy_rate": round(float(occupancy_rate), 2),
            })

            current_month_start = month_end

        # Quarterly aggregation
        # Use column references for GROUP BY to avoid PostgreSQL grouping error
        year_col = func.extract("year", Booking.check_in)
        quarter_col = func.extract("quarter", Booking.check_in)

        # Reuse proportional calculation (already defined above)
        quarterly_query = select(
            year_col.label("year"),
            quarter_col.label("quarter"),
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("revenue"),
            func.count(Booking.id).label("bookings"),
            func.avg(Booking.total_amount * days_in_period / total_booking_days).label("avg_booking_value"),
        ).where(
            Booking.check_in < end_date,  # Overlap condition
            Booking.check_out > start_date,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        # Add room filters to quarterly query
        if room_id:
            quarterly_query = quarterly_query.where(Booking.room_id == room_id)
        if filters and getattr(filters, "category_id", None):
            quarterly_query = quarterly_query.join(Room, Room.id == Booking.room_id).where(Room.category_id == filters.category_id)

        # Add customer-based filters to quarterly query
        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            quarterly_query = quarterly_query.join(Customer, Customer.id == Booking.customer_id)
            if filters.country_code:
                quarterly_query = quarterly_query.where(Customer.country_code == filters.country_code)
            if filters.region:
                quarterly_query = quarterly_query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                quarterly_query = quarterly_query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    quarterly_query = quarterly_query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    quarterly_query = quarterly_query.where(Customer.first_booking_date >= start_date)
                elif filters.customer_type.value == "returning":
                    quarterly_query = quarterly_query.where(Customer.first_booking_date < start_date)

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

        # occupancy_rate уже посчитан помесячно выше

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
        room_id: str | None = None,
        filters: Optional["AnalyticsFilter"] = None,
    ) -> dict[str, Any]:
        """
        Get top customers by total revenue.

        Args:
            limit: Number of top customers to return
            date_from: Optional start date for filtering
            date_to: Optional end date for filtering
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            Dictionary with top customers list
        """
        if not date_to:
            date_to = datetime.now(timezone.utc)
        if not date_from:
            date_from = date_to - timedelta(days=365)

        # Proportional revenue for period using EPOCH for accurate day count
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        # Get all customers with stats in the period
        customer_query = select(
            Customer.id,
            Customer.first_name,
            Customer.last_name,
            Customer.phone,
            Customer.first_booking_date,
            Customer.last_booking_date,
            Customer.total_bookings,
            Customer.total_spent,  # Keep cumulative total_spent as-is
            func.count(Booking.id).label("period_bookings"),
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("period_revenue"),
        ).join(
            Booking, Customer.id == Booking.customer_id, isouter=True
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
        )

        # Add room filters
        if room_id:
            customer_query = customer_query.where(Booking.room_id == room_id)
        # Customer filters
        if filters and any([
            filters.country_code, filters.region, filters.district, filters.tags, filters.customer_type
        ]):
            customer_query = customer_query.where(True)  # no-op to chain conditions
            if filters.country_code:
                customer_query = customer_query.where(Customer.country_code == filters.country_code)
            if filters.region:
                customer_query = customer_query.where(Customer.region == filters.region)
            if filters.district and filters.district != "all":
                customer_query = customer_query.where(Customer.district == filters.district)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    customer_query = customer_query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    customer_query = customer_query.where(Customer.first_booking_date >= (date_from or datetime.min.replace(tzinfo=timezone.utc)))
                elif filters.customer_type.value == "returning":
                    customer_query = customer_query.where(Customer.first_booking_date < (date_from or datetime.max.replace(tzinfo=timezone.utc)))

        customer_query = customer_query.group_by(
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

        # Proportional revenue for period using EPOCH for accurate day count
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

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
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("period_revenue"),
            func.max(Booking.check_in).label("last_booking"),
        ).join(
            Booking, Customer.id == Booking.customer_id, isouter=True
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
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
        room_id: str | None = None,
        filters: Optional["AnalyticsFilter"] = None,
    ) -> dict[str, Any]:
        """
        Get revenue breakdown by customer district.

        Args:
            session: Database session
            date_from: Start date
            date_to: End date
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            Dictionary with district revenue data
        """
        date_from = _ensure_timezone_aware(date_from)
        date_to = _ensure_timezone_aware(date_to)

        # Proportional revenue calculation using EPOCH for accurate day count
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        # Query bookings with customer district
        query = select(
            Customer.district,
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.count(func.distinct(Customer.id)).label("unique_customers"),
        ).join(
            Customer, Booking.customer_id == Customer.id
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
            Customer.district.is_not(None),  # Only customers with district set
        )

        # Add room filters
        if room_id:
            query = query.where(Booking.room_id == room_id)

        # Customer filters
        if filters and any([
            filters.country_code, filters.region, filters.tags, filters.customer_type
        ]):
            if filters.country_code:
                query = query.where(Customer.country_code == filters.country_code)
            if filters.region:
                query = query.where(Customer.region == filters.region)
            if filters.tags:
                col = cast(Customer.tags, JSONB)
                tag_filters = [col.contains([tag]) for tag in filters.tags]
                if tag_filters:
                    query = query.where(or_(*tag_filters))
            if filters.customer_type:
                if filters.customer_type.value == "new":
                    query = query.where(Customer.first_booking_date >= date_from)
                elif filters.customer_type.value == "returning":
                    query = query.where(Customer.first_booking_date < date_from)

        query = query.group_by(
            Customer.district
        ).order_by(
            func.sum(Booking.total_amount * days_in_period / total_booking_days).desc()
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

    def get_revenue_by_country(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
    ) -> dict[str, Any]:
        date_from = _ensure_timezone_aware(date_from)
        date_to = _ensure_timezone_aware(date_to)

        # Proportional revenue calculation using EPOCH for accurate day count
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            Customer.country_code,
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.count(func.distinct(Customer.id)).label("unique_customers"),
        ).join(
            Customer, Booking.customer_id == Customer.id
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
            Customer.country_code.is_not(None),
        ).group_by(
            Customer.country_code
        ).order_by(
            func.sum(Booking.total_amount * days_in_period / total_booking_days).desc()
        )

        rows = session.exec(query).all()
        total_revenue = sum(float(r.total_revenue or 0) for r in rows)
        total_bookings = sum(r.booking_count for r in rows)

        countries = []
        for r in rows:
            revenue = float(r.total_revenue or 0)
            percentage = (revenue / total_revenue * 100) if total_revenue > 0 else 0
            countries.append({
                "country": r.country_code or "Unknown",
                "revenue": revenue,
                "percentage": round(percentage, 2),
                "bookings": r.booking_count,
                "unique_customers": r.unique_customers,
                "average_booking_value": round(revenue / r.booking_count, 2) if r.booking_count > 0 else 0,
            })

        return {
            "countries": countries,
            "summary": {
                "total_revenue": total_revenue,
                "total_bookings": total_bookings,
                "country_count": len(countries),
            },
            "analysis_period": {"start": date_from.isoformat(), "end": date_to.isoformat()},
        }

    def get_revenue_by_region(
        self,
        session: Session,
        date_from: datetime,
        date_to: datetime,
    ) -> dict[str, Any]:
        date_from = _ensure_timezone_aware(date_from)
        date_to = _ensure_timezone_aware(date_to)

        # Proportional revenue calculation using EPOCH for accurate day count
        days_in_period = func.greatest(1,
            func.extract("epoch", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from)) / 86400
        )
        total_booking_days = func.greatest(1,
            func.extract("epoch", Booking.check_out - Booking.check_in) / 86400
        )

        query = select(
            Customer.region,
            func.sum(Booking.total_amount * days_in_period / total_booking_days).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.count(func.distinct(Customer.id)).label("unique_customers"),
        ).join(
            Customer, Booking.customer_id == Customer.id
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKED_OUT
            ]),
            Customer.region.is_not(None),
        ).group_by(
            Customer.region
        ).order_by(
            func.sum(Booking.total_amount * days_in_period / total_booking_days).desc()
        )

        rows = session.exec(query).all()
        total_revenue = sum(float(r.total_revenue or 0) for r in rows)
        total_bookings = sum(r.booking_count for r in rows)

        regions = []
        for r in rows:
            revenue = float(r.total_revenue or 0)
            percentage = (revenue / total_revenue * 100) if total_revenue > 0 else 0
            regions.append({
                "region": r.region or "Unknown",
                "revenue": revenue,
                "percentage": round(percentage, 2),
                "bookings": r.booking_count,
                "unique_customers": r.unique_customers,
                "average_booking_value": round(revenue / r.booking_count, 2) if r.booking_count > 0 else 0,
            })

        return {
            "regions": regions,
            "summary": {
                "total_revenue": total_revenue,
                "total_bookings": total_bookings,
                "region_count": len(regions),
            },
            "analysis_period": {"start": date_from.isoformat(), "end": date_to.isoformat()},
        }

analytics = CRUDAnalytics()
