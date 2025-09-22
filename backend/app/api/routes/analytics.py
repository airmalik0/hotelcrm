"""
Analytics API routes.
"""
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.api.deps import SessionDep, require_admin
from app.core.audit import log_audit
from app.core.exceptions import ValidationError
from app.core.rate_limit import RateLimits, limiter
from app.models import User
from app.models.analytics import (
    AnalyticsExportRequest,
    AnalyticsFilter,
    AnalyticsResponse,
    ComparisonMetrics,
    GroupBy,
)
from app.services.analytics import AnalyticsService
from app.services.pdf_report import PDFReportService

router = APIRouter()


@router.get("/dashboard", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_dashboard_metrics(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(description="Start date in ISO format"),
    date_to: str = Query(description="End date in ISO format"),
    room_id: str | None = Query(None, description="Filter by room ID or 'all'"),
    room_type: str | None = Query(None, description="Filter by room type (standard/vip/all)"),
    district: str | None = Query(None, description="Filter by customer district"),
    include_cancelled: bool = Query(False, description="Include cancelled bookings"),
) -> Any:
    """
    Get comprehensive dashboard metrics for a period.

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError(f"Invalid date format. Use ISO format: {str(e)}")

    # Create filter
    filters = AnalyticsFilter(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        room_id=room_id,
        room_type=room_type,
        district=district,
        include_cancelled=include_cancelled,
    )

    # Get metrics
    service = AnalyticsService(session)
    metrics = service.get_dashboard_metrics(filters)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,  # Use user ID as entity ID for analytics
        entity_name="dashboard_metrics",
        description=f"Viewed analytics dashboard for period {date_from} to {date_to}",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=metrics,
        filters_applied=filters,
    )


@router.get("/revenue", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_revenue_details(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(description="Start date in ISO format"),
    date_to: str = Query(description="End date in ISO format"),
    group_by: GroupBy = Query(GroupBy.DAY, description="Group results by"),
    room_id: str | None = Query(None, description="Filter by room ID"),
    room_type: str | None = Query(None, description="Filter by room type"),
) -> Any:
    """
    Get detailed revenue analytics with time series data.

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    # Get revenue trend
    from app.crud.analytics import analytics as crud_analytics
    revenue_trend = crud_analytics.get_revenue_trend(
        session,
        parsed_date_from,
        parsed_date_to,
        group_by.value,
    )

    # Get revenue metrics
    revenue_data = crud_analytics.get_revenue_by_period(
        session,
        parsed_date_from,
        parsed_date_to,
        room_id,
        room_type,
    )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="revenue_details",
        description=f"Viewed revenue analytics for period {date_from} to {date_to}",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data={
            "metrics": revenue_data,
            "trend": revenue_trend,
            "group_by": group_by.value,
        },
    )


@router.get("/occupancy", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_occupancy_details(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(description="Start date in ISO format"),
    date_to: str = Query(description="End date in ISO format"),
    room_id: str | None = Query(None, description="Filter by room ID"),
    room_type: str | None = Query(None, description="Filter by room type"),
) -> Any:
    """
    Get detailed occupancy analytics.

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    # Get occupancy metrics
    from app.crud.analytics import analytics as crud_analytics
    occupancy_data = crud_analytics.get_occupancy_metrics(
        session,
        parsed_date_from,
        parsed_date_to,
        room_id,
        room_type,
    )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="occupancy_details",
        description=f"Viewed occupancy analytics for period {date_from} to {date_to}",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=occupancy_data,
    )


@router.get("/customers", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_customer_analytics(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(description="Start date in ISO format"),
    date_to: str = Query(description="End date in ISO format"),
    district: str | None = Query(None, description="Filter by district"),
) -> Any:
    """
    Get customer analytics including demographics and behavior.

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    # Get customer metrics
    from app.crud.analytics import analytics as crud_analytics
    customer_data = crud_analytics.get_customer_metrics(
        session,
        parsed_date_from,
        parsed_date_to,
        district,
    )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="customer_analytics",
        description=f"Viewed customer analytics for period {date_from} to {date_to}",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=customer_data,
    )


@router.get("/compare", response_model=ComparisonMetrics)
@limiter.limit(RateLimits.READ_SINGLE)
def compare_periods(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    period1_from: str = Query(description="Start of first period"),
    period1_to: str = Query(description="End of first period"),
    period2_from: str = Query(description="Start of second period"),
    period2_to: str = Query(description="End of second period"),
    room_id: str | None = Query(None, description="Filter by room ID"),
    room_type: str | None = Query(None, description="Filter by room type"),
) -> Any:
    """
    Compare metrics between two periods.

    Requires admin access.
    """
    # Parse dates
    try:
        p1_from = datetime.fromisoformat(period1_from.replace("Z", "+00:00"))
        p1_to = datetime.fromisoformat(period1_to.replace("Z", "+00:00"))
        p2_from = datetime.fromisoformat(period2_from.replace("Z", "+00:00"))
        p2_to = datetime.fromisoformat(period2_to.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    service = AnalyticsService(session)
    comparison = service.compare_periods(
        p1_from, p1_to,
        p2_from, p2_to,
        room_id, room_type,
    )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="period_comparison",
        description=f"Compared periods: {period1_from} to {period1_to} vs {period2_from} to {period2_to}",
    )
    session.commit()

    return comparison


@router.post("/export/pdf")
@limiter.limit(RateLimits.CREATE)
def export_to_pdf(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    export_request: AnalyticsExportRequest,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Export analytics data to PDF.

    Requires admin access.
    """
    # Get analytics data
    service = AnalyticsService(session)
    metrics = service.get_dashboard_metrics(export_request.filters)

    # Generate PDF
    pdf_service = PDFReportService()
    pdf_buffer = pdf_service.generate_dashboard_report(metrics)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="exported",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="analytics_report",
        description=f"Exported analytics report for period {export_request.filters.date_from} to {export_request.filters.date_to}",
    )
    session.commit()

    # Return PDF as stream
    filename = f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/quick-stats", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_LIST)
def get_quick_stats(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),  # noqa: ARG001
) -> Any:
    """
    Get quick statistics for today, this week, and this month.

    Requires admin access.
    """
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    from app.crud.analytics import analytics as crud_analytics

    # Get metrics for different periods
    today_revenue = crud_analytics.get_revenue_by_period(
        session, today_start, now
    )
    week_revenue = crud_analytics.get_revenue_by_period(
        session, week_start, now
    )
    month_revenue = crud_analytics.get_revenue_by_period(
        session, month_start, now
    )

    today_occupancy = crud_analytics.get_occupancy_metrics(
        session, today_start, now
    )

    return AnalyticsResponse(
        success=True,
        data={
            "today": {
                "revenue": today_revenue["total_revenue"],
                "bookings": today_revenue["booking_count"],
                "occupancy": today_occupancy["occupancy_rate"],
            },
            "week": {
                "revenue": week_revenue["total_revenue"],
                "bookings": week_revenue["booking_count"],
            },
            "month": {
                "revenue": month_revenue["total_revenue"],
                "bookings": month_revenue["booking_count"],
            },
        },
    )
