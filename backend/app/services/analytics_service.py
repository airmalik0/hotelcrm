from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlmodel import Session

from app.models import Booking, BookingStatus, Customer, Room, RoomType


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def _get_period_expression(self, group_by: str) -> Any:
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

    def _format_period_label(self, period: datetime, group_by: str) -> str:
        """Format period datetime to human-readable label."""
        if group_by == "hour":
            return period.strftime("%Y-%m-%d %H:00")
        elif group_by == "day":
            return period.strftime("%Y-%m-%d")
        elif group_by == "week":
            return f"Week {period.strftime('%Y-%W')}"
        elif group_by == "month":
            return period.strftime("%B %Y")
        elif group_by == "year":
            return period.strftime("%Y")
        else:
            return period.strftime("%Y-%m-%d")

    async def get_occupancy_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        room_id: str | None = None,
        group_by: str = "day",
    ) -> list[dict[str, Any]]:
        """Get occupancy report grouped by period."""
        period_expr = self._get_period_expression(group_by)

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

        results = self.db.exec(query).all()

        # Get total rooms for occupancy calculation
        room_count_query = select(func.count(Room.id)).select_from(Room)
        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            room_count_query = room_count_query.where(Room.room_type == room_type_enum)
        if room_id:
            room_count_query = room_count_query.where(Room.id == room_id)

        total_rooms = self.db.exec(room_count_query).first() or 1

        # Calculate occupancy and format results
        formatted_results = []
        for row in results:
            period_date = row[0]
            total_bookings = row[1]
            unique_rooms = row[2]

            # Calculate occupancy percentage
            occupancy_rate = (unique_rooms / total_rooms * 100) if total_rooms > 0 else 0

            formatted_results.append({
                "period": period_date.isoformat(),
                "period_label": self._format_period_label(period_date, group_by),
                "total_bookings": total_bookings,
                "unique_rooms": unique_rooms,
                "total_rooms": total_rooms,
                "occupancy_rate": round(occupancy_rate, 2),
            })

        return formatted_results

    async def get_daily_pattern_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get hourly occupancy pattern (0-23 hours)."""
        query = (
            select(
                func.extract("hour", Booking.check_in).label("hour"),
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

        query = query.group_by(func.extract("hour", Booking.check_in)).order_by(
            func.extract("hour", Booking.check_in)
        )

        results = self.db.exec(query).all()

        # Create full 24-hour pattern
        hourly_pattern = {hour: 0 for hour in range(24)}
        for row in results:
            hour = int(row[0])
            count = row[1]
            hourly_pattern[hour] = count

        formatted_results = [
            {
                "hour": hour,
                "hour_label": f"{hour:02d}:00",
                "booking_count": count,
            }
            for hour, count in hourly_pattern.items()
        ]

        return formatted_results

    async def get_weekly_pattern_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get occupancy by day of week."""
        query = (
            select(
                func.extract("dow", Booking.check_in).label("day_of_week"),
                func.count(Booking.id).label("booking_count"),
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

        query = query.group_by(func.extract("dow", Booking.check_in)).order_by(
            func.extract("dow", Booking.check_in)
        )

        results = self.db.exec(query).all()

        # Days of week names (0 = Sunday in PostgreSQL)
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        # Create full week pattern
        weekly_pattern = {day: {"bookings": 0, "rooms": 0} for day in range(7)}
        for row in results:
            day = int(row[0])
            weekly_pattern[day] = {"bookings": row[1], "rooms": row[2]}

        formatted_results = [
            {
                "day_of_week": day,
                "day_name": day_names[day],
                "booking_count": data["bookings"],
                "unique_rooms": data["rooms"],
            }
            for day, data in weekly_pattern.items()
        ]

        return formatted_results

    async def get_seasonal_trend_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get monthly occupancy trend."""
        query = (
            select(
                func.extract("month", Booking.check_in).label("month"),
                func.extract("year", Booking.check_in).label("year"),
                func.count(Booking.id).label("booking_count"),
                func.count(func.distinct(Room.id)).label("unique_rooms"),
                func.sum(Booking.total_amount).label("revenue"),
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

        query = query.group_by(
            func.extract("year", Booking.check_in),
            func.extract("month", Booking.check_in),
        ).order_by(
            func.extract("year", Booking.check_in),
            func.extract("month", Booking.check_in),
        )

        results = self.db.exec(query).all()

        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]

        formatted_results = []
        for row in results:
            month = int(row[0])
            year = int(row[1])
            formatted_results.append({
                "month": month,
                "year": year,
                "month_label": f"{month_names[month - 1]} {year}",
                "booking_count": row[2],
                "unique_rooms": row[3],
                "revenue": float(row[4]) if row[4] else 0.0,
            })

        return formatted_results

    async def get_revenue_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        room_id: str | None = None,
        group_by: str = "month",
    ) -> list[dict[str, Any]]:
        """Get revenue analysis grouped by period."""
        period_expr = self._get_period_expression(group_by)

        query = (
            select(
                period_expr.label("period"),
                func.sum(Booking.total_amount).label("total_revenue"),
                func.count(Booking.id).label("booking_count"),
                func.avg(Booking.total_amount).label("avg_booking_value"),
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

        results = self.db.exec(query).all()

        formatted_results = []
        for row in results:
            period_date = row[0]
            formatted_results.append({
                "period": period_date.isoformat(),
                "period_label": self._format_period_label(period_date, group_by),
                "total_revenue": float(row[1]) if row[1] else 0.0,
                "booking_count": row[2],
                "avg_booking_value": float(row[3]) if row[3] else 0.0,
            })

        return formatted_results

    async def get_top_customers(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10,
        sort_by: str = "revenue",  # "revenue" or "bookings"
    ) -> list[dict[str, Any]]:
        """Get top customers by revenue or booking count."""
        if sort_by == "revenue":
            order_column = func.sum(Booking.total_amount).desc()
        else:
            order_column = func.count(Booking.id).desc()

        query = (
            select(
                Customer.id,
                Customer.first_name,
                Customer.last_name,
                Customer.phone,
                Customer.district,
                func.sum(Booking.total_amount).label("total_revenue"),
                func.count(Booking.id).label("booking_count"),
                func.min(Booking.check_in).label("first_booking"),
                func.max(Booking.check_in).label("last_booking"),
            )
            .select_from(Customer)
            .join(Booking)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
            .group_by(
                Customer.id,
                Customer.first_name,
                Customer.last_name,
                Customer.phone,
                Customer.district,
            )
            .order_by(order_column)
            .limit(limit)
        )

        results = self.db.exec(query).all()

        formatted_results = []
        for row in results:
            formatted_results.append({
                "customer_id": str(row[0]),
                "full_name": f"{row[1]} {row[2]}",
                "phone": row[3],
                "district": row[4],
                "total_revenue": float(row[5]) if row[5] else 0.0,
                "booking_count": row[6],
                "first_booking": row[7].isoformat() if row[7] else None,
                "last_booking": row[8].isoformat() if row[8] else None,
            })

        return formatted_results

    async def get_repeat_guest_rate(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "month",
    ) -> list[dict[str, Any]]:
        """Calculate repeat guest rate by period."""
        period_expr = self._get_period_expression(group_by)

        # Subquery to count bookings per customer
        customer_bookings = (
            select(
                Customer.id.label("customer_id"),
                period_expr.label("period"),
                func.count(Booking.id).label("booking_count"),
            )
            .select_from(Customer)
            .join(Booking)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
            .group_by(Customer.id, period_expr)
            .subquery()
        )

        # Main query to calculate repeat rates
        query = (
            select(
                customer_bookings.c.period,
                func.count(customer_bookings.c.customer_id).label("total_customers"),
                func.sum(
                    func.case(
                        (customer_bookings.c.booking_count > 1, 1),
                        else_=0
                    )
                ).label("repeat_customers"),
            )
            .group_by(customer_bookings.c.period)
            .order_by(customer_bookings.c.period)
        )

        results = self.db.exec(query).all()

        formatted_results = []
        for row in results:
            period_date = row[0]
            total_customers = row[1]
            repeat_customers = row[2] or 0

            repeat_rate = (repeat_customers / total_customers * 100) if total_customers > 0 else 0

            formatted_results.append({
                "period": period_date.isoformat(),
                "period_label": self._format_period_label(period_date, group_by),
                "total_customers": total_customers,
                "repeat_customers": repeat_customers,
                "new_customers": total_customers - repeat_customers,
                "repeat_rate": round(repeat_rate, 2),
            })

        return formatted_results

    async def get_payment_methods_distribution(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "month",
    ) -> list[dict[str, Any]]:
        """Get payment methods distribution by period."""
        period_expr = self._get_period_expression(group_by)

        query = (
            select(
                period_expr.label("period"),
                Booking.payment_method,
                func.count(Booking.id).label("booking_count"),
                func.sum(Booking.total_amount).label("total_amount"),
            )
            .select_from(Booking)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
            .group_by(period_expr, Booking.payment_method)
            .order_by(period_expr, Booking.payment_method)
        )

        results = self.db.exec(query).all()

        # Group results by period
        period_data: dict[str, dict[str, Any]] = {}

        for row in results:
            period_date = row[0]
            period_key = period_date.isoformat()

            if period_key not in period_data:
                period_data[period_key] = {
                    "period": period_key,
                    "period_label": self._format_period_label(period_date, group_by),
                    "cash": {"count": 0, "amount": 0.0},
                    "terminal": {"count": 0, "amount": 0.0},
                    "transfer": {"count": 0, "amount": 0.0},
                    "total_bookings": 0,
                    "total_amount": 0.0,
                }

            payment_method = row[1].value
            count = row[2]
            amount = float(row[3]) if row[3] else 0.0

            period_data[period_key][payment_method] = {"count": count, "amount": amount}
            period_data[period_key]["total_bookings"] += count
            period_data[period_key]["total_amount"] += amount

        # Calculate percentages
        formatted_results = []
        for period_info in period_data.values():
            total = period_info["total_bookings"]
            if total > 0:
                for method in ["cash", "terminal", "transfer"]:
                    period_info[method]["percentage"] = round(
                        period_info[method]["count"] / total * 100, 2
                    )
            formatted_results.append(period_info)

        return formatted_results

    async def get_geographic_analysis(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict[str, Any]]:
        """Get customer distribution by districts."""
        query = (
            select(
                Customer.district,
                func.count(func.distinct(Customer.id)).label("customer_count"),
                func.count(Booking.id).label("booking_count"),
                func.sum(Booking.total_amount).label("total_revenue"),
                func.avg(Booking.total_amount).label("avg_booking_value"),
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
            .order_by(func.sum(Booking.total_amount).desc())
        )

        results = self.db.exec(query).all()

        formatted_results = []
        for row in results:
            formatted_results.append({
                "district": row[0] or "Unknown",
                "customer_count": row[1],
                "booking_count": row[2],
                "total_revenue": float(row[3]) if row[3] else 0.0,
                "avg_booking_value": float(row[4]) if row[4] else 0.0,
            })

        return formatted_results
