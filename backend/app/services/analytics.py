"""
Analytics service for business logic and data orchestration.
"""
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.core.exceptions import BusinessRuleViolation, ValidationError
from app.crud.analytics import analytics as crud_analytics
from app.models.analytics import (
    AnalyticsFilter,
    CustomerMetrics,
    DashboardMetrics,
    OccupancyMetrics,
    PaymentDistribution,
    RevenueMetrics,
    TimeSeriesDataPoint,
)


class AnalyticsService:
    """Service class for analytics operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.crud = crud_analytics

    def validate_date_range(self, date_from: datetime, date_to: datetime) -> None:
        """Validate date range for analytics queries."""
        if date_from >= date_to:
            raise ValidationError("Date from must be before date to")

        # Limit to maximum 2 years of data for performance
        max_days = 730
        if (date_to - date_from).days > max_days:
            raise BusinessRuleViolation(f"Date range cannot exceed {max_days} days")

    def get_dashboard_metrics(self, filters: AnalyticsFilter) -> DashboardMetrics:
        """
        Get comprehensive dashboard metrics for a period.

        Args:
            filters: Analytics filter parameters

        Returns:
            DashboardMetrics with all key metrics
        """
        self.validate_date_range(filters.date_from, filters.date_to)

        # Get revenue metrics
        revenue_data = self.crud.get_revenue_by_period(
            self.session,
            filters.date_from,
            filters.date_to,
            filters.room_id,
            filters.include_cancelled,
            filters,
        )

        # Calculate ADR and RevPAR
        avg_daily_rate = (
            revenue_data["total_revenue"] / revenue_data["total_nights"]
            if revenue_data["total_nights"] > 0
            else 0
        )

        # Get occupancy metrics
        occupancy_data = self.crud.get_occupancy_metrics(
            self.session,
            filters.date_from,
            filters.date_to,
            filters.room_id,
            filters,
        )

        # Calculate RevPAR
        rev_par = (
            revenue_data["total_revenue"] / occupancy_data["total_available_room_nights"]
            if occupancy_data["total_available_room_nights"] > 0
            else 0
        )

        revenue_metrics = RevenueMetrics(
            total_revenue=revenue_data["total_revenue"],
            average_daily_rate=round(avg_daily_rate, 2),
            revenue_per_available_room=round(rev_par, 2),
            total_bookings=revenue_data["booking_count"],
            total_nights=revenue_data["total_nights"],
            discount_amount=revenue_data["discount_amount"],
            refund_amount=revenue_data["refund_amount"],
        )

        occupancy_metrics = OccupancyMetrics(
            occupancy_rate=occupancy_data["occupancy_rate"],
            average_length_of_stay=occupancy_data["average_length_of_stay"],
            total_available_room_nights=occupancy_data["total_available_room_nights"],
            total_occupied_room_nights=occupancy_data["total_occupied_room_nights"],
            check_ins=occupancy_data["check_ins"],
            check_outs=occupancy_data["check_outs"],
            cancellations=occupancy_data["cancellations"],
        )

        # Get payment distribution
        payment_data = self.crud.get_payment_method_distribution(
            self.session,
            filters.date_from,
            filters.date_to,
            filters.include_cancelled,
            filters.room_id,
            filters,
        )

        payment_distribution = PaymentDistribution(**payment_data)

        # Get customer metrics
        customer_data = self.crud.get_customer_metrics(
            self.session,
            filters.date_from,
            filters.date_to,
            filters,
            filters.room_id,
        )

        customer_metrics = CustomerMetrics(
            total_customers=customer_data["total_customers"],
            new_customers=customer_data["new_customers"],
            returning_customers=customer_data["returning_customers"],
            average_age=customer_data["average_age"],
            district_distribution=customer_data["district_distribution"],
            age_distribution=customer_data["age_distribution"],
        )

        # Category breakdown
        category_breakdown_data = self.crud.get_category_breakdown(
            self.session,
            filters.date_from,
            filters.date_to,
            filters,
        )
        category_breakdown = category_breakdown_data

        # Get revenue trend (default to daily for periods <= 31 days, monthly otherwise)
        days_in_period = (filters.date_to - filters.date_from).days
        group_by = "day" if days_in_period <= 31 else "month"

        revenue_trend_data = self.crud.get_revenue_trend(
            self.session,
            filters.date_from,
            filters.date_to,
            group_by,
            filters,
        )

        revenue_trend = [
            TimeSeriesDataPoint(**point) for point in revenue_trend_data
        ]

        # Format period label
        period_label = f"{filters.date_from.strftime('%b %Y')} - {filters.date_to.strftime('%b %Y')}"

        return DashboardMetrics(
            period=period_label,
            revenue=revenue_metrics,
            occupancy=occupancy_metrics,
            payment_distribution=payment_distribution,
            customer_metrics=customer_metrics,
            category_breakdown=category_breakdown,
            revenue_trend=revenue_trend,
        )

    def get_hourly_distribution(
        self,
        date_from: datetime,
        date_to: datetime,
        metric: str = "check_ins",
        room_id: str | None = None,
        room_type: str | None = None,
        filters: AnalyticsFilter | None = None,
    ) -> list[dict[str, Any]]:
        """
        Get hourly distribution of events (check-ins, check-outs).

        Args:
            date_from: Start date
            date_to: End date
            metric: 'check_ins' or 'check_outs'
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            List of hourly counts
        """
        self.validate_date_range(date_from, date_to)

        return self.crud.get_hourly_distribution(
            self.session,
            date_from,
            date_to,
            metric,
            room_id,
            filters,
        )

    def get_seasonal_trends(
        self,
        years: int = 2,
        room_id: str | None = None,
        room_type: str | None = None,
        filters: AnalyticsFilter | None = None,
    ) -> dict[str, Any]:
        """
        Get seasonal trends analysis over multiple years.

        Args:
            years: Number of years to analyze (default: 2)
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            Seasonal trends data including monthly, quarterly, and YoY comparisons
        """
        if years < 1 or years > 5:
            raise ValidationError("Years must be between 1 and 5")

        return self.crud.get_seasonal_trends(self.session, years, room_id)

    def get_top_customers(
        self,
        limit: int = 20,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        room_id: str | None = None,
        room_type: str | None = None,
        filters: AnalyticsFilter | None = None,
    ) -> dict[str, Any]:
        """
        Get top customers by total revenue.

        Args:
            limit: Number of top customers to return
            date_from: Optional start date for filtering bookings
            date_to: Optional end date for filtering bookings
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            List of top customers with revenue, bookings, and dates
        """
        if date_from and date_to:
            self.validate_date_range(date_from, date_to)

        return self.crud.get_top_customers(self.session, limit, date_from, date_to, room_id, filters)

    def get_revenue_details(self, filters: AnalyticsFilter, group_by: str = "day") -> dict[str, Any]:
        """Get detailed revenue analytics with time series data."""
        self.validate_date_range(filters.date_from, filters.date_to)

        # Get revenue trend
        revenue_trend = self.crud.get_revenue_trend(
            self.session,
            filters.date_from,
            filters.date_to,
            group_by,
            filters,
        )

        # Get revenue metrics
        revenue_data = self.crud.get_revenue_by_period(
            self.session,
            filters.date_from,
            filters.date_to,
            filters.room_id,
            filters.include_cancelled,
            filters,
        )

        return {
            "metrics": revenue_data,
            "trend": revenue_trend,
            "group_by": group_by,
        }

    def get_occupancy_details(self, filters: AnalyticsFilter) -> dict[str, Any]:
        """Get detailed occupancy analytics."""
        self.validate_date_range(filters.date_from, filters.date_to)

        occupancy_data = self.crud.get_occupancy_metrics(
            self.session,
            filters.date_from,
            filters.date_to,
            filters.room_id,
            filters,
        )

        return occupancy_data

    def get_customer_details(self, filters: AnalyticsFilter) -> dict[str, Any]:
        """Get customer analytics including demographics and behavior."""
        self.validate_date_range(filters.date_from, filters.date_to)

        customer_data = self.crud.get_customer_metrics(
            self.session,
            filters.date_from,
            filters.date_to,
            filters,
            filters.room_id,
        )

        return customer_data

    def get_geo_revenue(self, date_from: datetime, date_to: datetime, level: str = "district") -> dict[str, Any]:
        """Get revenue breakdown by geographic level (country/region/district)."""
        if level == "country":
            return self.crud.get_revenue_by_country(self.session, date_from, date_to)
        if level == "region":
            return self.crud.get_revenue_by_region(self.session, date_from, date_to)
        return self.crud.get_revenue_by_district(self.session, date_from, date_to)

    def get_room_performance(self, filters: AnalyticsFilter, top_n: int = 3) -> dict[str, Any]:
        """
        Get best and worst performing rooms by ADR.

        Args:
            filters: Analytics filter parameters
            top_n: Number of top/bottom rooms to show

        Returns:
            Dictionary with top_performers and bottom_performers
        """
        self.validate_date_range(filters.date_from, filters.date_to)

        return self.crud.get_room_performance(
            self.session,
            filters.date_from,
            filters.date_to,
            top_n,
            filters,
        )

    def get_quick_stats(self) -> dict[str, Any]:
        """Get quick statistics for today, this week, and this month."""
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get metrics for different periods
        today_revenue = self.crud.get_revenue_by_period(
            self.session, today_start, now
        )
        week_revenue = self.crud.get_revenue_by_period(
            self.session, week_start, now
        )
        month_revenue = self.crud.get_revenue_by_period(
            self.session, month_start, now
        )

        today_occupancy = self.crud.get_occupancy_metrics(
            self.session, today_start, now
        )
        week_occupancy = self.crud.get_occupancy_metrics(
            self.session, week_start, now
        )
        month_occupancy = self.crud.get_occupancy_metrics(
            self.session, month_start, now
        )

        return {
            "today": {
                "revenue": today_revenue["total_revenue"],
                "bookings": today_revenue["booking_count"],
                "occupancy": today_occupancy["occupancy_rate"],
            },
            "week": {
                "revenue": week_revenue["total_revenue"],
                "bookings": week_revenue["booking_count"],
                "occupancy": week_occupancy["occupancy_rate"],
            },
            "month": {
                "revenue": month_revenue["total_revenue"],
                "bookings": month_revenue["booking_count"],
                "occupancy": month_occupancy["occupancy_rate"],
            },
        }

    def get_district_revenue(
        self,
        date_from: datetime,
        date_to: datetime,
        room_id: str | None = None,
        filters: AnalyticsFilter | None = None,
    ) -> dict[str, Any]:
        """
        Get revenue breakdown by customer district.

        Args:
            date_from: Start date
            date_to: End date
            room_id: Optional filter by specific room
            room_type: Optional filter by room type

        Returns:
            Dictionary with district revenue data
        """
        self.validate_date_range(date_from, date_to)
        return self.crud.get_revenue_by_district(self.session, date_from, date_to, room_id, filters)
