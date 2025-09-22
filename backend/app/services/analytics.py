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
    ComparisonMetrics,
    CustomerMetrics,
    DashboardMetrics,
    OccupancyMetrics,
    PaymentDistribution,
    RevenueMetrics,
    RoomTypeMetrics,
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
            filters.room_type,
            filters.include_cancelled,
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
            filters.room_type,
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
            refund_amount=0.0,  # TODO: Calculate from payment adjustments
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
        )

        payment_distribution = PaymentDistribution(**payment_data)

        # Get customer metrics
        customer_data = self.crud.get_customer_metrics(
            self.session,
            filters.date_from,
            filters.date_to,
            filters.district,
        )

        customer_metrics = CustomerMetrics(
            total_customers=customer_data["total_customers"],
            new_customers=customer_data["new_customers"],
            returning_customers=customer_data["returning_customers"],
            average_age=customer_data["average_age"],
            district_distribution=customer_data["district_distribution"],
            age_distribution=customer_data["age_distribution"],
        )

        # Get room type breakdown
        room_type_data = self.crud.get_room_type_breakdown(
            self.session,
            filters.date_from,
            filters.date_to,
        )

        room_type_breakdown = [
            RoomTypeMetrics(**room_data) for room_data in room_type_data
        ]

        # Get revenue trend (default to daily for periods <= 31 days, monthly otherwise)
        days_in_period = (filters.date_to - filters.date_from).days
        group_by = "day" if days_in_period <= 31 else "month"

        revenue_trend_data = self.crud.get_revenue_trend(
            self.session,
            filters.date_from,
            filters.date_to,
            group_by,
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
            room_type_breakdown=room_type_breakdown,
            revenue_trend=revenue_trend,
        )

    def compare_periods(
        self,
        period1_from: datetime,
        period1_to: datetime,
        period2_from: datetime,
        period2_to: datetime,
        room_id: str | None = None,
        room_type: str | None = None,
    ) -> ComparisonMetrics:
        """
        Compare metrics between two periods.

        Args:
            period1_from: Start of first period
            period1_to: End of first period
            period2_from: Start of second period
            period2_to: End of second period
            room_id: Optional room filter
            room_type: Optional room type filter

        Returns:
            ComparisonMetrics with both periods and change percentages
        """
        # Validate both date ranges
        self.validate_date_range(period1_from, period1_to)
        self.validate_date_range(period2_from, period2_to)

        # Create filters for both periods
        filters1 = AnalyticsFilter(
            date_from=period1_from,
            date_to=period1_to,
            room_id=room_id,
            room_type=room_type,
        )

        filters2 = AnalyticsFilter(
            date_from=period2_from,
            date_to=period2_to,
            room_id=room_id,
            room_type=room_type,
        )

        # Get metrics for both periods
        metrics1 = self.get_dashboard_metrics(filters1)
        metrics2 = self.get_dashboard_metrics(filters2)

        # Calculate percentage changes
        def calculate_change(old_value: float, new_value: float) -> float:
            if old_value == 0:
                return 100.0 if new_value > 0 else 0.0
            return round(((new_value - old_value) / old_value) * 100, 2)

        revenue_change = calculate_change(
            metrics1.revenue.total_revenue,
            metrics2.revenue.total_revenue,
        )

        occupancy_change = calculate_change(
            metrics1.occupancy.occupancy_rate,
            metrics2.occupancy.occupancy_rate,
        )

        bookings_change = calculate_change(
            metrics1.revenue.total_bookings,
            metrics2.revenue.total_bookings,
        )

        return ComparisonMetrics(
            period1_label=metrics1.period,
            period2_label=metrics2.period,
            period1_metrics=metrics1,
            period2_metrics=metrics2,
            revenue_change_percentage=revenue_change,
            occupancy_change_percentage=occupancy_change,
            bookings_change_percentage=bookings_change,
        )

    def get_hourly_distribution(
        self,
        date_from: datetime,
        date_to: datetime,
        metric: str = "check_ins",
    ) -> list[dict[str, Any]]:
        """
        Get hourly distribution of events (check-ins, check-outs).

        Args:
            date_from: Start date
            date_to: End date
            metric: 'check_ins' or 'check_outs'

        Returns:
            List of hourly counts
        """
        # This is a simplified implementation
        # In a full implementation, you would track actual check-in/out times
        hourly_data = []
        for hour in range(24):
            # Mock data for now - replace with actual query
            hourly_data.append({
                "hour": hour,
                "count": 0,  # Would be populated from actual data
                "label": f"{hour:02d}:00",
            })

        return hourly_data

    def get_forecast(
        self,
        forecast_days: int = 30,
        base_on_days: int = 365,
    ) -> dict[str, Any]:
        """
        Generate forecast based on historical data.

        Args:
            forecast_days: Number of days to forecast
            base_on_days: Number of historical days to base forecast on

        Returns:
            Forecast data (simplified for MVP)
        """
        # This is a placeholder for future implementation
        # Would use statistical methods or ML for actual forecasting
        return {
            "forecast_period": forecast_days,
            "based_on_days": base_on_days,
            "predicted_revenue": 0.0,
            "predicted_occupancy": 0.0,
            "confidence_level": 0.0,
        }
