"""
Analytics API routes.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query, Body
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, SessionDep
from app.models.analytics import AnalyticsFilter, AnalyticsResponse, CustomerType, AnalyticsExportRequest
from app.services.analytics import AnalyticsService
from app.services.pdf_report import PDFReportService
from app.services.excel_report import ExcelReportService

router = APIRouter()


@router.get("/dashboard", response_model=AnalyticsResponse)
async def get_dashboard_metrics(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    date_from: datetime = Query(..., description="Start date for the analysis period"),
    date_to: datetime = Query(..., description="End date for the analysis period"),
    room_id: str | None = Query(None, description="Filter by specific room id or 'all'"),
    include_cancelled: bool = Query(False, description="Include cancelled bookings"),
    category_id: str | None = Query(None, description="Filter by room category id"),
    country_code: str | None = Query(None, description="ISO-2 country code"),
    region: str | None = Query(None, description="Region/oblast code"),
    district: str | None = Query(None, description="District code (Tashkent only)"),
    customer_type: CustomerType | None = Query(None, description="Customer type: new/returning"),
    tags: list[str] | None = Query(None, description="Customer tags (any-of)"),
) -> Any:
    filters = AnalyticsFilter(
        date_from=date_from,
        date_to=date_to,
        room_id=room_id,
        category_id=category_id,
        include_cancelled=include_cancelled,
        country_code=country_code,
        region=region,
        district=district,
        customer_type=customer_type,
        tags=tags,
    )
    service = AnalyticsService(session)
    data = service.get_dashboard_metrics(filters)
    return AnalyticsResponse(success=True, data=data, filters_applied=filters)


@router.get("/hourly_distribution", response_model=AnalyticsResponse)
async def get_hourly_distribution(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    date_from: datetime,
    date_to: datetime,
    metric: str = Query("check_ins", pattern="^(check_ins|check_outs)$"),
    room_id: str | None = None,
    category_id: str | None = Query(None, description="Filter by room category id"),
    country_code: str | None = None,
    region: str | None = None,
    district: str | None = None,
    customer_type: CustomerType | None = None,
    tags: list[str] | None = Query(None),
) -> Any:
    service = AnalyticsService(session)
    filters = AnalyticsFilter(
        date_from=date_from,
        date_to=date_to,
        room_id=room_id,
        category_id=category_id,
        country_code=country_code,
        region=region,
        district=district,
        customer_type=customer_type,
        tags=tags,
    )
    data = service.get_hourly_distribution(date_from, date_to, metric, room_id, None, filters)
    return AnalyticsResponse(success=True, data=data, filters_applied=filters)


@router.get("/seasonal_trends", response_model=AnalyticsResponse)
async def get_seasonal_trends(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    years: int = Query(2, ge=1, le=5),
    room_id: str | None = None,
) -> Any:
    service = AnalyticsService(session)
    data = service.get_seasonal_trends(years, room_id, None)
    return AnalyticsResponse(success=True, data=data)


@router.get("/top_customers")
async def get_top_customers(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    limit: int = Query(20, ge=1, le=100),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    room_id: str | None = None,
) -> Any:
    service = AnalyticsService(session)
    return service.get_top_customers(limit, date_from, date_to, room_id, None)


@router.get("/revenue_details", response_model=AnalyticsResponse)
async def get_revenue_details(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    date_from: datetime,
    date_to: datetime,
    group_by: str = Query("day", pattern="^(day|week|month)$"),
    room_id: str | None = None,
    include_cancelled: bool = False,
    category_id: str | None = Query(None, description="Filter by room category id"),
) -> Any:
    filters = AnalyticsFilter(
        date_from=date_from,
        date_to=date_to,
        room_id=room_id,
        category_id=category_id,
        include_cancelled=include_cancelled,
    )
    service = AnalyticsService(session)
    data = service.get_revenue_details(filters, group_by)
    return AnalyticsResponse(success=True, data=data, filters_applied=filters)


@router.get("/occupancy_details", response_model=AnalyticsResponse)
async def get_occupancy_details(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    date_from: datetime,
    date_to: datetime,
    room_id: str | None = None,
    category_id: str | None = Query(None, description="Filter by room category id"),
) -> Any:
    filters = AnalyticsFilter(
        date_from=date_from,
        date_to=date_to,
        room_id=room_id,
        category_id=category_id,
    )
    service = AnalyticsService(session)
    data = service.get_occupancy_details(filters)
    return AnalyticsResponse(success=True, data=data, filters_applied=filters)


@router.get("/customer_details", response_model=AnalyticsResponse)
async def get_customer_details(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    date_from: datetime,
    date_to: datetime,
    room_id: str | None = None,
    category_id: str | None = Query(None, description="Filter by room category id"),
    country_code: str | None = None,
    region: str | None = None,
    district: str | None = None,
    customer_type: CustomerType | None = None,
    tags: list[str] | None = Query(None),
) -> Any:
    filters = AnalyticsFilter(
        date_from=date_from,
        date_to=date_to,
        room_id=room_id,
        category_id=category_id,
        country_code=country_code,
        region=region,
        district=district,
        customer_type=customer_type,
        tags=tags,
    )
    service = AnalyticsService(session)
    data = service.get_customer_details(filters)
    return AnalyticsResponse(success=True, data=data, filters_applied=filters)


@router.get("/quick_stats", response_model=AnalyticsResponse)
async def get_quick_stats(session: SessionDep, current_user: CurrentUser) -> Any:  # noqa: ARG001
    service = AnalyticsService(session)
    data = service.get_quick_stats()
    return AnalyticsResponse(success=True, data=data)


@router.get("/geo_revenue")
async def get_geo_revenue(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    date_from: datetime,
    date_to: datetime,
    level: str = Query("district", pattern="^(country|region|district)$"),
) -> Any:
    service = AnalyticsService(session)
    return service.get_geo_revenue(date_from, date_to, level)


@router.post("/export/pdf")
def export_pdf(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    payload: AnalyticsExportRequest = Body(...),
) -> Any:
    """Export analytics report to PDF using provided filters."""
    filters = payload.filters
    include_charts = payload.include_charts

    analytics_service = AnalyticsService(session)
    metrics = analytics_service.get_dashboard_metrics(filters)

    pdf_service = PDFReportService()
    # Prefer comprehensive report if charts requested; fallback to dashboard-only
    try:
        if include_charts:
            buffer = pdf_service.generate_comprehensive_report(session, filters, include_charts=True)
        else:
            buffer = pdf_service.generate_dashboard_report(metrics, filters=filters)
    except Exception:
        # Fallback to basic dashboard report in case of any error
        buffer = pdf_service.generate_dashboard_report(metrics, filters=filters)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=analytics_report.pdf",
        },
    )


@router.post("/export/excel")
def export_excel(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    payload: AnalyticsExportRequest = Body(...),
) -> Any:
    """Export analytics report to Excel using provided filters."""
    filters = payload.filters
    include_charts = payload.include_charts

    excel_service = ExcelReportService()
    try:
        buffer = excel_service.generate_comprehensive_report(session, filters, include_charts=include_charts)
    except Exception:
        # Fallback to dashboard-only if comprehensive fails
        analytics_service = AnalyticsService(session)
        dashboard = analytics_service.get_dashboard_metrics(filters)
        buffer = excel_service.generate_dashboard_report(dashboard, filters=filters)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=analytics_report.xlsx",
        },
    )
