from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.crud.analytics import CRUDAnalytics


class AnalyticsService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = CRUDAnalytics(session)

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

    def get_occupancy_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        room_id: str | None = None,
        group_by: str = "day",
    ) -> list[dict[str, Any]]:
        """Get occupancy report - business logic only, no SQL."""
        # Get data from CRUD
        results = self.crud.get_occupancy_data(
            start_date, end_date, room_type, room_id, group_by
        )
        total_rooms = self.crud.get_total_rooms(room_type, room_id)

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

    def get_daily_pattern_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get hourly occupancy pattern (0-23 hours)."""
        # Get data from CRUD
        results = self.crud.get_daily_pattern_data(
            start_date, end_date, room_type
        )

        # Create full 24-hour pattern
        hourly_pattern = {hour: {"count": 0, "amount": 0} for hour in range(24)}
        for row in results:
            hour = int(row[0])
            count = row[1]
            avg_amount = row[2] or 0
            hourly_pattern[hour] = {"count": count, "amount": float(avg_amount)}

        formatted_results = [
            {
                "hour": hour,
                "hour_label": f"{hour:02d}:00",
                "booking_count": data["count"],
                "avg_amount": round(data["amount"], 2),
            }
            for hour, data in hourly_pattern.items()
        ]

        return formatted_results

    def get_weekly_pattern_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get occupancy by day of week."""
        # Get data from CRUD
        results = self.crud.get_weekly_pattern_data(
            start_date, end_date, room_type
        )

        # Days of week names (0 = Sunday in PostgreSQL)
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        # Create full week pattern
        weekly_pattern = {day: {"bookings": 0, "avg_amount": 0} for day in range(7)}
        for row in results:
            day = int(row[0])
            hour = int(row[1]) if row[1] else 0
            count = row[2]
            # Aggregate by day (ignoring hour for weekly pattern)
            if day not in weekly_pattern:
                weekly_pattern[day] = {"bookings": 0, "avg_amount": 0}
            weekly_pattern[day]["bookings"] += count

        formatted_results = [
            {
                "day_of_week": day,
                "day_name": day_names[day],
                "booking_count": data["bookings"],
            }
            for day, data in weekly_pattern.items()
        ]

        return formatted_results

    def get_seasonal_trend_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
    ) -> list[dict[str, Any]]:
        """Get monthly occupancy trend."""
        # Get data from CRUD
        results = self.crud.get_seasonal_trend_data(
            start_date, end_date, room_type
        )

        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]

        formatted_results = []
        for row in results:
            month = int(row[0])
            year = int(row[1])
            booking_count = row[2]
            unique_rooms = row[3]
            revenue = float(row[4]) if row[4] else 0

            formatted_results.append({
                "month": month,
                "year": year,
                "month_name": month_names[month - 1],
                "period_label": f"{month_names[month - 1]} {year}",
                "booking_count": booking_count,
                "unique_rooms": unique_rooms,
                "revenue": round(revenue, 2),
            })

        return formatted_results

    def get_revenue_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        payment_method: str | None = None,
        group_by: str = "day",
    ) -> list[dict[str, Any]]:
        """Get revenue analytics."""
        # Get data from CRUD
        results = self.crud.get_revenue_data(
            start_date, end_date, room_type, payment_method, group_by
        )

        formatted_results = []
        for row in results:
            period_date = row[0]
            total_revenue = float(row[1]) if row[1] else 0
            booking_count = row[2]
            avg_booking_value = float(row[3]) if row[3] else 0

            formatted_results.append({
                "period": period_date.isoformat(),
                "period_label": self._format_period_label(period_date, group_by),
                "total_revenue": round(total_revenue, 2),
                "booking_count": booking_count,
                "avg_booking_value": round(avg_booking_value, 2),
            })

        return formatted_results

    def get_top_customers(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 10,
        order_by: str = "revenue",
    ) -> list[dict[str, Any]]:
        """Get top customers by revenue or booking count."""
        # Get data from CRUD
        results = self.crud.get_top_customers_data(
            start_date, end_date, limit, order_by
        )

        formatted_results = []
        for row in results:
            customer_id = str(row[0])
            full_name = row[1]
            phone = row[2]
            district = row[3]
            total_revenue = float(row[4]) if row[4] else 0
            booking_count = row[5]
            avg_booking_value = float(row[6]) if row[6] else 0

            formatted_results.append({
                "customer_id": customer_id,
                "full_name": full_name,
                "phone": phone,
                "district": district or "N/A",
                "total_revenue": round(total_revenue, 2),
                "booking_count": booking_count,
                "avg_booking_value": round(avg_booking_value, 2),
            })

        return formatted_results

    def get_repeat_guest_rate(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> dict[str, Any]:
        """Calculate repeat guest rate."""
        # Get data from CRUD
        repeat_data = self.crud.get_repeat_guest_data(start_date, end_date)

        # Process results
        total_customers = 0
        repeat_customers = 0
        booking_distribution = {}

        for row in repeat_data:
            booking_count = row[0]
            customer_count = row[1]
            total_customers += customer_count

            if booking_count > 1:
                repeat_customers += customer_count

            booking_distribution[f"{booking_count}_bookings"] = customer_count

        repeat_rate = (repeat_customers / total_customers * 100) if total_customers > 0 else 0

        return {
            "total_customers": total_customers,
            "repeat_customers": repeat_customers,
            "repeat_rate": round(repeat_rate, 2),
            "booking_distribution": booking_distribution,
        }

    def get_payment_methods_distribution(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict[str, Any]]:
        """Get distribution of payment methods."""
        # Get data from CRUD
        results = self.crud.get_payment_methods_data(start_date, end_date)

        formatted_results = []
        total_bookings = sum(row[1] for row in results)

        for row in results:
            payment_method = row[0]
            count = row[1]
            total_amount = float(row[2]) if row[2] else 0

            percentage = (count / total_bookings * 100) if total_bookings > 0 else 0

            formatted_results.append({
                "payment_method": payment_method,
                "booking_count": count,
                "total_amount": round(total_amount, 2),
                "percentage": round(percentage, 2),
            })

        return formatted_results

    def get_geographic_analysis(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict[str, Any]]:
        """Analyze bookings by customer district."""
        # Get data from CRUD
        results = self.crud.get_geographic_data(start_date, end_date)

        formatted_results = []
        for row in results:
            district = row[0] or "Unknown"
            customer_count = row[1]
            booking_count = row[2]
            total_revenue = float(row[3]) if row[3] else 0

            formatted_results.append({
                "district": district,
                "customer_count": customer_count,
                "booking_count": booking_count,
                "total_revenue": round(total_revenue, 2),
                "avg_revenue_per_customer": round(total_revenue / customer_count, 2) if customer_count > 0 else 0,
            })

        return formatted_results
