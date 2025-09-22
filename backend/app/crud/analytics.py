"""
CRUD operations for analytics.
All SQL queries for analytics data retrieval.
"""
from datetime import datetime
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
            Dictionary with total_revenue, booking_count, total_nights, discount_amount
        """
        query = select(
            func.sum(Booking.total_amount).label("total_revenue"),
            func.count(Booking.id).label("booking_count"),
            func.sum(
                func.extract("day", Booking.check_out - Booking.check_in)
            ).label("total_nights"),
            func.sum(
                Booking.total_amount * Booking.discount / 100
            ).label("discount_amount"),
        ).where(
            Booking.check_in >= date_from,
            Booking.check_out <= date_to,
        )

        # Status filter
        if not include_cancelled:
            query = query.where(Booking.status != BookingStatus.CANCELLED)

        # Room filter
        if room_id and room_id != "all":
            query = query.where(Booking.room_id == room_id)

        # Room type filter
        if room_type and room_type != "all":
            query = query.join(Room).where(Room.room_type == room_type)

        result = session.exec(query).first()

        return {
            "total_revenue": float(result.total_revenue or 0),
            "booking_count": int(result.booking_count or 0),
            "total_nights": int(result.total_nights or 0),
            "discount_amount": float(result.discount_amount or 0),
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
        total_available_nights = total_rooms * days_in_period

        # Get occupied nights (excluding cancelled)
        occupied_query = select(
            func.sum(
                func.greatest(0,
                    func.least(
                        func.extract("day", func.least(Booking.check_out, date_to) - func.greatest(Booking.check_in, date_from))
                    )
                )
            ).label("occupied_nights"),
            func.avg(
                func.extract("day", Booking.check_out - Booking.check_in)
            ).label("avg_stay"),
        ).where(
            Booking.check_in < date_to,
            Booking.check_out > date_from,
            Booking.status != BookingStatus.CANCELLED,
        )

        if room_id and room_id != "all":
            occupied_query = occupied_query.where(Booking.room_id == room_id)
        if room_type and room_type != "all":
            occupied_query = occupied_query.join(Room).where(Room.room_type == room_type)

        occupied_result = session.exec(occupied_query).first()
        occupied_nights = int(occupied_result.occupied_nights or 0)
        avg_stay = float(occupied_result.avg_stay or 0)

        # Count check-ins, check-outs, cancellations
        status_query = select(
            Booking.status,
            func.count(Booking.id).label("count"),
        ).where(
            Booking.booking_date >= date_from,
            Booking.booking_date <= date_to,
        )

        if room_id and room_id != "all":
            status_query = status_query.where(Booking.room_id == room_id)
        if room_type and room_type != "all":
            status_query = status_query.join(Room).where(Room.room_type == room_type)

        status_query = status_query.group_by(Booking.status)
        status_results = session.exec(status_query).all()

        status_counts = {str(status): count for status, count in status_results}

        occupancy_rate = (occupied_nights / total_available_nights * 100) if total_available_nights > 0 else 0

        return {
            "occupancy_rate": round(occupancy_rate, 2),
            "average_length_of_stay": round(avg_stay, 1),
            "total_available_room_nights": total_available_nights,
            "total_occupied_room_nights": occupied_nights,
            "check_ins": status_counts.get(BookingStatus.CHECKED_IN.value, 0),
            "check_outs": status_counts.get(BookingStatus.CHECKED_OUT.value, 0),
            "cancellations": status_counts.get(BookingStatus.CANCELLED.value, 0),
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
            Booking.check_in >= date_from,
            Booking.check_out <= date_to,
        )

        if not include_cancelled:
            query = query.where(Booking.status != BookingStatus.CANCELLED)

        query = query.group_by(Booking.payment_method)
        results = session.exec(query).all()

        total_bookings = sum(r.count for r in results) or 1

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
                Booking.status != BookingStatus.CANCELLED,
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
            if customer.first_booking_date and customer.first_booking_date >= date_from:
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
        query = select(
            Room.room_type,
            func.count(Booking.id).label("bookings"),
            func.sum(Booking.total_amount).label("revenue"),
            func.avg(Booking.total_amount / func.extract("day", Booking.check_out - Booking.check_in)).label("avg_rate"),
        ).join(
            Booking, Room.id == Booking.room_id
        ).where(
            Booking.check_in >= date_from,
            Booking.check_out <= date_to,
            Booking.status != BookingStatus.CANCELLED,
        ).group_by(Room.room_type)

        results = session.exec(query).all()

        breakdown = []
        for result in results:
            # Calculate occupancy for this room type
            room_count = session.exec(
                select(func.count(Room.id)).where(Room.room_type == result.room_type)
            ).first()

            days_in_period = (date_to - date_from).days
            available_nights = room_count * days_in_period if room_count else 1

            # Get occupied nights for this room type
            occupied_nights = session.exec(
                select(
                    func.sum(func.extract("day", Booking.check_out - Booking.check_in))
                ).join(
                    Room, Room.id == Booking.room_id
                ).where(
                    Booking.check_in < date_to,
                    Booking.check_out > date_from,
                    Booking.status != BookingStatus.CANCELLED,
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
        if group_by == "month":
            date_trunc = func.date_trunc("month", Booking.booking_date)
        elif group_by == "week":
            date_trunc = func.date_trunc("week", Booking.booking_date)
        else:  # day
            date_trunc = func.date_trunc("day", Booking.booking_date)

        query = select(
            date_trunc.label("period"),
            func.sum(Booking.total_amount).label("revenue"),
        ).where(
            Booking.booking_date >= date_from,
            Booking.booking_date <= date_to,
            Booking.status != BookingStatus.CANCELLED,
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


analytics = CRUDAnalytics()
