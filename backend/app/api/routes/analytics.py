"""
Analytics API routes.
"""
from datetime import datetime
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
from app.services.excel_report import ExcelReportService
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

    # Create filters and get revenue details through service
    filters = AnalyticsFilter(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        room_id=room_id,
        room_type=room_type,
    )

    service = AnalyticsService(session)
    revenue_details = service.get_revenue_details(filters, group_by.value)

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
        data=revenue_details,
        filters_applied=filters,
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

    # Create filters and get occupancy details through service
    filters = AnalyticsFilter(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        room_id=room_id,
        room_type=room_type,
    )

    service = AnalyticsService(session)
    occupancy_data = service.get_occupancy_details(filters)

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
        filters_applied=filters,
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

    # Create filters and get customer details through service
    filters = AnalyticsFilter(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        district=district,
    )

    service = AnalyticsService(session)
    customer_data = service.get_customer_details(filters)

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
        filters_applied=filters,
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


@router.post("/export/excel")
@limiter.limit(RateLimits.CREATE)
def export_to_excel(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    export_request: AnalyticsExportRequest,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Export analytics data to Excel with multiple sheets.

    Creates a comprehensive Excel workbook with:
    - Summary sheet with key metrics
    - Revenue analysis
    - Occupancy analysis
    - Customer demographics
    - Payment method distribution
    - Room type performance

    Requires admin access.
    """
    # Get analytics data
    service = AnalyticsService(session)
    metrics = service.get_dashboard_metrics(export_request.filters)

    # Generate Excel
    excel_service = ExcelReportService()
    excel_buffer = excel_service.generate_dashboard_report(metrics)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="exported",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="analytics_excel_report",
        description=f"Exported analytics Excel report for period {export_request.filters.date_from} to {export_request.filters.date_to}",
    )
    session.commit()

    # Return Excel as stream
    filename = f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
    service = AnalyticsService(session)
    quick_stats = service.get_quick_stats()

    return AnalyticsResponse(
        success=True,
        data=quick_stats,
    )


@router.get("/hourly-distribution", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_hourly_distribution(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(description="Start date in ISO format"),
    date_to: str = Query(description="End date in ISO format"),
    metric: str = Query("check_ins", description="Metric to analyze (check_ins or check_outs)"),
) -> Any:
    """
    Get hourly distribution of check-ins or check-outs.

    Shows patterns of when guests arrive or depart throughout the day.
    Useful for staffing optimization and understanding peak times.

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    # Validate metric
    if metric not in ["check_ins", "check_outs"]:
        raise ValidationError("Metric must be 'check_ins' or 'check_outs'")

    service = AnalyticsService(session)
    hourly_data = service.get_hourly_distribution(
        parsed_date_from,
        parsed_date_to,
        metric,
    )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="hourly_distribution",
        description=f"Viewed hourly {metric} distribution for period {date_from} to {date_to}",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data={
            "metric": metric,
            "hourly_data": hourly_data,
            "period": f"{date_from} to {date_to}",
        },
    )


@router.get("/seasonal-trends", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_seasonal_trends(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    years: int = Query(2, ge=1, le=5, description="Number of years to analyze (1-5)"),
) -> Any:
    """
    Get seasonal trends analysis over multiple years.

    Analyzes monthly and quarterly patterns, identifies peak/low seasons,
    and provides year-over-year comparison for revenue and bookings.

    Requires admin access.
    """
    service = AnalyticsService(session)
    trends_data = service.get_seasonal_trends(years)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="seasonal_trends",
        description=f"Viewed seasonal trends analysis for {years} years",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=trends_data,
    )


@router.get("/customer-segments", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_customer_segments(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str | None = Query(None, description="Start date in ISO format"),
    date_to: str | None = Query(None, description="End date in ISO format"),
) -> Any:
    """
    Segment customers into categories based on booking behavior.

    Categories:
    - VIP: Top 10% by revenue
    - Loyal: 5+ bookings
    - Regular: 2-4 bookings
    - New: First booking within last 30 days
    - At Risk: No bookings in last 90 days

    Requires admin access.
    """
    # Parse dates if provided
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValidationError(f"Invalid date_from format: {str(e)}")
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValidationError(f"Invalid date_to format: {str(e)}")

    service = AnalyticsService(session)
    segments_data = service.get_customer_segments(parsed_date_from, parsed_date_to)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="customer_segments",
        description="Viewed customer segmentation analysis",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=segments_data,
    )


@router.get("/customer-lifetime", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_customer_lifetime_value(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    months_back: int = Query(12, ge=1, le=60, description="Number of months to analyze (1-60)"),
) -> Any:
    """
    Calculate customer lifetime value (LTV) metrics.

    Analyzes:
    - Average LTV across all customers
    - LTV by customer tenure
    - Top customers by LTV
    - Average booking value and frequency

    Requires admin access.
    """
    service = AnalyticsService(session)
    ltv_data = service.get_customer_lifetime_value(months_back)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="customer_lifetime_value",
        description=f"Viewed customer LTV analysis for {months_back} months",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=ltv_data,
    )


@router.get("/customer-behavior", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_customer_behavior_patterns(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str | None = Query(None, description="Start date in ISO format"),
    date_to: str | None = Query(None, description="End date in ISO format"),
) -> Any:
    """
    Analyze customer booking behavior patterns.

    Includes:
    - Booking frequency distribution
    - Room type preferences
    - Booking lead time analysis
    - Day of week preferences
    - Repeat customer rate

    Requires admin access.
    """
    # Parse dates if provided
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValidationError(f"Invalid date_from format: {str(e)}")
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValidationError(f"Invalid date_to format: {str(e)}")

    service = AnalyticsService(session)
    behavior_data = service.get_customer_behavior_patterns(parsed_date_from, parsed_date_to)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="customer_behavior",
        description="Viewed customer behavior analysis",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=behavior_data,
    )
