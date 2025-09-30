"""
Analytics API routes.
"""
from datetime import datetime, timezone
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
    GroupBy,
)
from app.services.analytics import AnalyticsService
from app.services.excel_report import ExcelReportService
from app.services.pdf_report import PDFReportService
from app.utils import parse_isoformat_date

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
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
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
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
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
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
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
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
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


@router.post("/export/pdf")
@limiter.limit(RateLimits.CREATE)
def export_to_pdf(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    export_request: AnalyticsExportRequest,
    current_user: User = Depends(require_admin),
    hotel_name: str = Query("Hotel Analytics", description="Hotel name for report header"),
    include_charts: bool = Query(True, description="Include visualization charts"),
    comprehensive: bool = Query(True, description="Generate comprehensive report with all analytics data"),
) -> Any:
    """
    Export analytics data to PDF.

    Options:
    - comprehensive=True: Uses all 10 analytics endpoints with charts and detailed analysis
    - comprehensive=False: Basic dashboard report (legacy format)
    - include_charts: Add visualization charts to the report
    - hotel_name: Custom hotel name for report header

    Requires admin access.
    """
    # Generate PDF
    pdf_service = PDFReportService()

    if comprehensive:
        # Use comprehensive report with all analytics endpoints
        pdf_buffer = pdf_service.generate_comprehensive_report(
            session=session,
            filters=export_request.filters,
            hotel_name=hotel_name,
            include_charts=include_charts,
        )
    else:
        # Use legacy dashboard report
        service = AnalyticsService(session)
        metrics = service.get_dashboard_metrics(export_request.filters)
        pdf_buffer = pdf_service.generate_dashboard_report(metrics)

    # Log audit
    report_type = "comprehensive" if comprehensive else "basic"
    log_audit(
        session=session,
        user=current_user,
        action="exported",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="analytics_pdf_report",
        description=f"Exported {report_type} analytics PDF report for period {export_request.filters.date_from} to {export_request.filters.date_to} (charts: {include_charts})",
    )
    session.commit()

    # Return PDF as stream
    filename = f"analytics_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
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
    include_charts: bool = Query(True, description="Include charts in Excel sheets"),
    comprehensive: bool = Query(True, description="Generate comprehensive report with all analytics data"),
) -> Any:
    """
    Export analytics data to Excel with multiple sheets.

    Options:
    - comprehensive=True: Uses all 10 analytics endpoints with 10+ detailed sheets:
      * Executive Summary
      * Revenue Analysis (detailed trends)
      * Occupancy Analysis (detailed patterns)
      * Customer Analytics (demographics & acquisition)
      * Payment Analysis
      * Room Performance
      * Hourly Patterns (check-in/out distributions)
      * Seasonal Trends (multi-year analysis)
      * Customer Segments (VIP, Loyal, Regular, etc.)
      * Customer LTV (lifetime value analysis)
      * Behavior Patterns (booking preferences)
    - comprehensive=False: Basic dashboard report with 6 sheets (legacy format)
    - include_charts: Add charts to relevant sheets

    Requires admin access.
    """
    # Generate Excel
    excel_service = ExcelReportService()

    if comprehensive:
        # Use comprehensive report with all analytics endpoints
        excel_buffer = excel_service.generate_comprehensive_report(
            session=session,
            filters=export_request.filters,
            include_charts=include_charts,
        )
    else:
        # Use legacy dashboard report
        service = AnalyticsService(session)
        metrics = service.get_dashboard_metrics(export_request.filters)
        excel_buffer = excel_service.generate_dashboard_report(metrics)

    # Log audit
    report_type = "comprehensive" if comprehensive else "basic"
    log_audit(
        session=session,
        user=current_user,
        action="exported",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="analytics_excel_report",
        description=f"Exported {report_type} analytics Excel report for period {export_request.filters.date_from} to {export_request.filters.date_to} (charts: {include_charts})",
    )
    session.commit()

    # Return Excel as stream
    filename = f"analytics_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
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
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
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


@router.get("/top-customers", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_top_customers(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    limit: int = Query(20, ge=1, le=100, description="Number of top customers to return (1-100)"),
    date_from: str | None = Query(None, description="Start date in ISO format"),
    date_to: str | None = Query(None, description="End date in ISO format"),
) -> Any:
    """
    Get top customers by total revenue and booking count.

    Returns the top N customers sorted by total spent, with their:
    - Total revenue
    - Total bookings
    - Average booking value
    - First and last booking dates

    Requires admin access.
    """
    # Parse dates if provided
    parsed_date_from = None
    parsed_date_to = None
    if date_from:
        try:
            parsed_date_from = parse_isoformat_date(date_from)
        except ValueError as e:
            raise ValidationError(f"Invalid date_from format: {str(e)}")
    if date_to:
        try:
            parsed_date_to = parse_isoformat_date(date_to)
        except ValueError as e:
            raise ValidationError(f"Invalid date_to format: {str(e)}")

    service = AnalyticsService(session)
    top_customers_data = service.get_top_customers(limit, parsed_date_from, parsed_date_to)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="top_customers",
        description=f"Viewed top {limit} customers",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=top_customers_data,
    )


@router.get("/room-performance", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_room_performance(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(..., description="Start date in ISO format"),
    date_to: str = Query(..., description="End date in ISO format"),
    top_n: int = Query(3, ge=1, le=10, description="Number of top/bottom rooms to show"),
) -> Any:
    """
    Get best and worst performing rooms by ADR (Average Daily Rate).

    Returns:
    - Top N rooms with highest ADR
    - Bottom N rooms with lowest ADR
    - Each room includes: room number, ADR, total revenue, bookings, occupancy rate

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    service = AnalyticsService(session)
    filters = AnalyticsFilter(
        date_from=parsed_date_from,
        date_to=parsed_date_to,
    )
    performance_data = service.get_room_performance(filters, top_n)

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="room_performance",
        description=f"Viewed room performance analysis (top {top_n})",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=performance_data,
        filters_applied=filters,
    )


@router.get("/district-revenue", response_model=AnalyticsResponse)
@limiter.limit(RateLimits.READ_SINGLE)
def get_district_revenue(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: User = Depends(require_admin),
    date_from: str = Query(description="Start date in ISO format"),
    date_to: str = Query(description="End date in ISO format"),
) -> Any:
    """
    Get revenue breakdown by customer district.

    Shows how much revenue each district (area) generated.
    Useful for understanding geographic revenue distribution.

    Requires admin access.
    """
    # Parse dates
    try:
        parsed_date_from = parse_isoformat_date(date_from)
        parsed_date_to = parse_isoformat_date(date_to)
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {str(e)}")

    service = AnalyticsService(session)
    district_data = service.get_district_revenue(
        parsed_date_from,
        parsed_date_to,
    )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="viewed",
        entity_type="analytics",
        entity_id=current_user.id,
        entity_name="district_revenue",
        description=f"Viewed district revenue analysis ({district_data['summary']['district_count']} districts)",
    )
    session.commit()

    return AnalyticsResponse(
        success=True,
        data=district_data,
    )
