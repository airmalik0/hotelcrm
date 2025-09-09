from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlmodel import Session

from app.models import Booking, BookingStatus, Customer, Room, RoomType


class CRUDAnalytics:
    def __init__(self, session: Session):
        self.session = session

    def get_period_expression(self, group_by: str) -> Any:
        """Return SQL expression for grouping by time period."""
        if group_by == "hour":
            return func.date_trunc("hour", Booking.check_in)
        elif group_by == "day":
            return func.date_trunc("day", Booking.check_in)
        elif group_by == "week":
            return func.date_trunc("week", Booking.check_in)
        elif group_by == "month":
            return func.date_trunc("month", Booking.check_in)
        elif group_by == "year":
            return func.date_trunc("year", Booking.check_in)
        else:
            return func.date_trunc("day", Booking.check_in)

    def get_occupancy_data(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        room_id: str | None = None,
        group_by: str = "day"
    ) -> list[Any]:
        """Get raw occupancy data from database."""
        period_expr = self.get_period_expression(group_by)

        query = (
            select(
                period_expr.label("period"),
                func.count(func.distinct(Booking.id)).label("total_bookings"),
                func.count(func.distinct(Room.id)).label("unique_rooms"),
            )
            .select_from(Booking)
            .join(Room)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
        )

        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)

        if room_id:
            query = query.where(Room.id == room_id)

        query = query.group_by(period_expr).order_by(period_expr)
        return self.session.exec(query).all()

    def get_total_rooms(self, room_type: str | None = None, room_id: str | None = None) -> int:
        """Get total room count with filters."""
        query = select(func.count(Room.id)).select_from(Room)

        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)

        if room_id:
            query = query.where(Room.id == room_id)

        result = self.session.exec(query).first()
        return result[0] if result else 1

    def get_daily_pattern_data(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[Any]:
        """Get daily booking pattern data."""
        # Extract hour from check-in time
        hour_expr = func.extract("hour", Booking.check_in)

        query = (
            select(
                hour_expr.label("hour"),
                func.count(Booking.id).label("booking_count"),
                func.avg(Booking.total_amount).label("avg_amount"),
            )
            .select_from(Booking)
            .join(Room)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
        )

        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)

        query = query.group_by(hour_expr).order_by(hour_expr)
        return self.session.exec(query).all()

    def get_weekly_pattern_data(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[Any]:
        """Get weekly booking pattern data."""
        # Extract day of week and hour
        dow_expr = func.extract("dow", Booking.check_in)  # 0 = Sunday, 6 = Saturday
        hour_expr = func.extract("hour", Booking.check_in)

        query = (
            select(
                dow_expr.label("day_of_week"),
                hour_expr.label("hour"),
                func.count(Booking.id).label("booking_count"),
            )
            .select_from(Booking)
            .join(Room)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
        )

        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)

        query = query.group_by(dow_expr, hour_expr).order_by(dow_expr, hour_expr)
        return self.session.exec(query).all()

    def get_seasonal_trend_data(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[Any]:
        """Get seasonal booking trend data."""
        month_expr = func.date_trunc("month", Booking.check_in)

        query = (
            select(
                month_expr.label("month"),
                func.count(Booking.id).label("booking_count"),
                func.sum(Booking.total_amount).label("total_revenue"),
                func.avg(Booking.total_amount).label("avg_amount"),
                func.count(func.distinct(Booking.customer_id)).label("unique_customers"),
            )
            .select_from(Booking)
            .join(Room)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
        )

        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)

        query = query.group_by(month_expr).order_by(month_expr)
        return self.session.exec(query).all()

    def get_revenue_data(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day",
    ) -> list[Any]:
        """Get revenue data grouped by period."""
        period_expr = self.get_period_expression(group_by)

        query = (
            select(
                period_expr.label("period"),
                func.sum(Booking.total_amount).label("total_revenue"),
                func.count(Booking.id).label("booking_count"),
                func.avg(Booking.total_amount).label("avg_booking_value"),
            )
            .select_from(Booking)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
            .group_by(period_expr)
            .order_by(period_expr)
        )

        return self.session.exec(query).all()

    def get_top_customers_data(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int = 10,
    ) -> list[Any]:
        """Get top customers by revenue."""
        query = (
            select(
                Customer.id,
                Customer.first_name,
                Customer.last_name,
                Customer.phone,
                func.count(Booking.id).label("booking_count"),
                func.sum(Booking.total_amount).label("total_spent"),
                func.avg(Booking.total_amount).label("avg_booking_value"),
                func.max(Booking.check_in).label("last_booking_date"),
            )
            .select_from(Customer)
            .join(Booking)
            .where(Booking.status != BookingStatus.CANCELLED)
        )

        if start_date:
            query = query.where(Booking.check_in >= start_date)
        if end_date:
            query = query.where(Booking.check_out <= end_date)

        query = (
            query.group_by(Customer.id, Customer.first_name, Customer.last_name, Customer.phone)
            .order_by(func.sum(Booking.total_amount).desc())
            .limit(limit)
        )

        return self.session.exec(query).all()

    def get_repeat_guest_data(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> tuple[int, int]:
        """Get repeat guest statistics."""
        # Subquery to get customer booking counts
        customer_bookings = (
            select(
                Booking.customer_id,
                func.count(Booking.id).label("booking_count")
            )
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
            .group_by(Booking.customer_id)
            .alias()
        )

        # Count total unique customers
        total_query = select(func.count(func.distinct(customer_bookings.c.customer_id)))
        total_customers = self.session.exec(total_query).first() or 0

        # Count repeat customers (more than 1 booking)
        repeat_query = select(func.count()).where(customer_bookings.c.booking_count > 1)
        repeat_customers = self.session.exec(repeat_query).first() or 0

        return repeat_customers, total_customers

    def get_payment_methods_data(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> list[Any]:
        """Get payment methods distribution."""
        query = (
            select(
                Booking.payment_method,
                func.count(Booking.id).label("count"),
                func.sum(Booking.total_amount).label("total_amount"),
            )
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
            .group_by(Booking.payment_method)
            .order_by(func.count(Booking.id).desc())
        )

        return self.session.exec(query).all()

    def get_geographic_data(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10,
    ) -> list[Any]:
        """Get geographic distribution of customers."""
        query = (
            select(
                Customer.district,
                func.count(func.distinct(Customer.id)).label("customer_count"),
                func.count(Booking.id).label("booking_count"),
                func.sum(Booking.total_amount).label("total_revenue"),
            )
            .select_from(Customer)
            .join(Booking)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
                Customer.district.isnot(None),
            )
            .group_by(Customer.district)
            .order_by(func.count(func.distinct(Customer.id)).desc())
            .limit(limit)
        )

        return self.session.exec(query).all()


# Create singleton instance
analytics = CRUDAnalytics
