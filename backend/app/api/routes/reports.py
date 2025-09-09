import json
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response

from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_admin_user,
    require_admin_or_manager,
)
from app.core.audit import log_audit
from app.crud.report import report as crud_report
from app.crud.user import user as crud_user
from app.models import (
    ReportFormat,
    ReportJobCreate,
    ReportJobPublic,
    ReportJobsPublic,
    ReportJobStatus,
    ReportJobType,
    UserRole,
)
from app.services.analytics_service import AnalyticsService
from app.services.chart_service import ChartService
from app.services.export_service import ExportService
from app.services.pdf_service import PDFService
from app.services.storage_service import storage_service

router = APIRouter()


async def generate_occupancy_report_task(
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    params: dict[str, Any],
    report_variant: str = "standard"
) -> None:
    """Background task to generate occupancy report."""
    from sqlmodel import Session

    from app.core.db import engine

    # Create new session for background task
    with Session(engine) as session:
        try:
            # Update job status to processing
            job = crud_report.get(session, id=job_id)
            if not job:
                return

            crud_report.update_status(
                session,
                db_obj=job,
                status=ReportJobStatus.PROCESSING,
                progress=10
            )
            session.commit()

            analytics = AnalyticsService(session)

            # Get data based on variant
            if report_variant == "daily_pattern":
                data = analytics.get_daily_pattern_report(
                    params["start_date"],
                    params["end_date"],
                    params.get("room_type")
                )
            elif report_variant == "weekly_pattern":
                data = analytics.get_weekly_pattern_report(
                    params["start_date"],
                    params["end_date"],
                    params.get("room_type")
                )
            elif report_variant == "seasonal_trend":
                data = analytics.get_seasonal_trend_report(
                    params["start_date"],
                    params["end_date"],
                    params.get("room_type")
                )
            else:
                data = analytics.get_occupancy_report(
                    params["start_date"],
                    params["end_date"],
                    params.get("room_type"),
                    params.get("room_id"),
                    params.get("group_by", "day")
                )

            # Update progress
            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=40
            )
            session.commit()

            # Generate chart if requested
            chart_image = None
            if params.get("include_charts"):
                chart_service = ChartService()
                if report_variant == "weekly_pattern":
                    chart_image = chart_service.create_weekly_pattern_heatmap(data)
                elif report_variant == "seasonal_trend":
                    chart_image = chart_service.create_seasonal_trend_chart(data)
                else:
                    chart_image = chart_service.create_occupancy_chart(data)

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=60
            )
            session.commit()

            # Export to requested format
            format = params.get("format", ReportFormat.JSON)
            if format == ReportFormat.JSON:
                content = json.dumps(data, indent=2).encode()
                filename = f"occupancy_report_{job_id}.json"
            elif format == ReportFormat.CSV:
                export_service = ExportService()
                content = export_service.export_to_csv(data)
                filename = f"occupancy_report_{job_id}.csv"
            elif format == ReportFormat.EXCEL:
                export_service = ExportService()
                content = export_service.export_occupancy_report(data, "excel")
                filename = f"occupancy_report_{job_id}.xlsx"
            else:  # PDF
                pdf_service = PDFService()
                content = pdf_service.create_occupancy_report_pdf(
                    data, chart_image, f"Occupancy Report - {report_variant.replace('_', ' ').title()}"
                )
                filename = f"occupancy_report_{job_id}.pdf"

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=80
            )
            session.commit()

            # Save file
            file_path = storage_service.save_file(content, filename, "occupancy")
            file_size = len(content)

            # Update job status to completed
            crud_report.update_status(
                session,
                db_obj=job,
                status=ReportJobStatus.COMPLETED,
                progress=100,
                result_path=file_path,
                result_size=file_size
            )

            # Log audit
            user = crud_user.get(session, id=user_id)
            if user:
                log_audit(
                    session=session,
                    user=user,
                    action="generated",
                    entity_type="report",
                    entity_id=job_id,
                    entity_name=f"Occupancy Report ({report_variant})",
                    description=f"Generated {report_variant} occupancy report in {format} format"
                )

            session.commit()

        except Exception as e:
            # Update job status to failed
            if job := crud_report.get(session, id=job_id):
                crud_report.update_status(
                    session,
                    db_obj=job,
                    status=ReportJobStatus.FAILED,
                    error_message=str(e)
                )
                session.commit()


async def generate_revenue_report_task(
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    params: dict[str, Any]
) -> None:
    """Background task to generate revenue report."""
    from sqlmodel import Session

    from app.core.db import engine

    # Create new session for background task
    with Session(engine) as session:
        try:
            # Update job status to processing
            job = crud_report.get(session, id=job_id)
            if not job:
                return

            crud_report.update_status(
                session,
                db_obj=job,
                status=ReportJobStatus.PROCESSING,
                progress=10
            )
            session.commit()

            analytics = AnalyticsService(session)
            data = analytics.get_revenue_report(
            params["start_date"],
            params["end_date"],
            params.get("room_type"),
            params.get("room_id"),
                params.get("group_by", "month")
            )

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=40
            )
            session.commit()

            # Generate chart if requested
            chart_image = None
            if params.get("include_charts"):
                chart_service = ChartService()
                chart_image = chart_service.create_revenue_chart(data)

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=60
            )
            session.commit()

            # Export to requested format
            format = params.get("format", ReportFormat.JSON)
            if format == ReportFormat.JSON:
                content = json.dumps(data, indent=2).encode()
                filename = f"revenue_report_{job_id}.json"
            elif format == ReportFormat.CSV:
                export_service = ExportService()
                content = export_service.export_to_csv(data)
                filename = f"revenue_report_{job_id}.csv"
            elif format == ReportFormat.EXCEL:
                export_service = ExportService()
                content = export_service.export_revenue_report(data, "excel")
                filename = f"revenue_report_{job_id}.xlsx"
            else:  # PDF
                pdf_service = PDFService()
                content = pdf_service.create_revenue_report_pdf(data, chart_image)
                filename = f"revenue_report_{job_id}.pdf"

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=80
            )
            session.commit()

            # Save file
            file_path = storage_service.save_file(content, filename, "revenue")
            file_size = len(content)

            # Update job status to completed
            crud_report.update_status(
                session,
                db_obj=job,
                status=ReportJobStatus.COMPLETED,
                progress=100,
                result_path=file_path,
                result_size=file_size
            )

            # Log audit
            user = crud_user.get(session, id=user_id)
            if user:
                log_audit(
                    session=session,
                    user=user,
                    action="generated",
                    entity_type="report",
                    entity_id=job_id,
                    entity_name="Revenue Report",
                    description=f"Generated revenue report in {format} format"
                )

            session.commit()

        except Exception as e:
            # Update job status to failed
            if job := crud_report.get(session, id=job_id):
                crud_report.update_status(
                    session,
                    db_obj=job,
                    status=ReportJobStatus.FAILED,
                    error_message=str(e)
                )
                session.commit()


async def generate_top_customers_task(
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    params: dict[str, Any]
) -> None:
    """Background task to generate top customers report."""
    from sqlmodel import Session

    from app.core.db import engine

    # Create new session for background task
    with Session(engine) as session:
        try:
            # Update job status to processing
            job = crud_report.get(session, id=job_id)
            if not job:
                return

            crud_report.update_status(
                session,
                db_obj=job,
                status=ReportJobStatus.PROCESSING,
                progress=10
            )
            session.commit()

            analytics = AnalyticsService(session)
            data = analytics.get_top_customers(
            params["start_date"],
            params["end_date"],
            params.get("limit", 10),
                params.get("sort_by", "total_spent")
            )

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=60
            )
            session.commit()

            # Export to requested format
            format = params.get("format", ReportFormat.JSON)
            if format == ReportFormat.JSON:
                content = json.dumps(data, indent=2).encode()
                filename = f"top_customers_{job_id}.json"
            elif format == ReportFormat.CSV:
                export_service = ExportService()
                content = export_service.export_to_csv(data)
                filename = f"top_customers_{job_id}.csv"
            elif format == ReportFormat.EXCEL:
                export_service = ExportService()
                content = export_service.export_customer_report(data, "excel")
                filename = f"top_customers_{job_id}.xlsx"
            else:  # PDF
                pdf_service = PDFService()
                content = pdf_service.create_customer_report_pdf(data)
                filename = f"top_customers_{job_id}.pdf"

            crud_report.update_status(
                session,
                db_obj=job,
                status=job.status,  # Keep current status
                progress=80
            )
            session.commit()

            # Save file
            file_path = storage_service.save_file(content, filename, "customers")
            file_size = len(content)

            # Update job status to completed
            crud_report.update_status(
                session,
                db_obj=job,
                status=ReportJobStatus.COMPLETED,
                progress=100,
                result_path=file_path,
                result_size=file_size
            )

            # Log audit
            user = crud_user.get(session, id=user_id)
            if user:
                log_audit(
                    session=session,
                    user=user,
                    action="generated",
                    entity_type="report",
                    entity_id=job_id,
                    entity_name="Top Customers Report",
                    description=f"Generated top customers report in {format} format"
                )

            session.commit()

        except Exception as e:
            # Update job status to failed
            if job := crud_report.get(session, id=job_id):
                crud_report.update_status(
                    session,
                    db_obj=job,
                    status=ReportJobStatus.FAILED,
                    error_message=str(e)
                )
                session.commit()


@router.post(
    "/generate",
    response_model=ReportJobPublic,
    dependencies=[Depends(require_admin_or_manager)]
)
async def generate_report(
    report_type: ReportJobType,
    format: ReportFormat = ReportFormat.JSON,
    params: dict[str, Any] | None = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: SessionDep = None,
    current_user: CurrentUser = None
) -> ReportJobPublic:
    """Generate a report (admin and manager only)."""

    # Create report job in database
    report_job = crud_report.create_with_user(
        session,
        obj_in=ReportJobCreate(
            type=report_type,
            format=format,
            params=params or {}
        ),
        user_id=current_user.id
    )
    session.commit()

    # Start appropriate background task based on report type
    if report_type == ReportJobType.ROOM_OCCUPANCY:
        background_tasks.add_task(
            generate_occupancy_report_task,
            report_job.id,
            current_user.id,
            params or {},
            "standard"
        )
    elif report_type == ReportJobType.REVENUE_REPORT:
        background_tasks.add_task(
            generate_revenue_report_task,
            report_job.id,
            current_user.id,
            params or {}
        )
    elif report_type == ReportJobType.CUSTOMER_REPORT:
        background_tasks.add_task(
            generate_top_customers_task,
            report_job.id,
            current_user.id,
            params or {}
        )
    else:
        # For other report types, mark as failed immediately
        crud_report.update_status(
            session,
            db_obj=report_job,
            status=ReportJobStatus.FAILED,
            error_message=f"Report type {report_type} not implemented yet"
        )
        session.commit()

    return ReportJobPublic.model_validate(report_job)


@router.get(
    "/jobs/{job_id}",
    response_model=ReportJobPublic
)
async def get_report_status(
    job_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser
) -> ReportJobPublic:
    """Get report job status."""
    # Get job from database
    if current_user.role == UserRole.HOST:
        job = crud_report.get_by_user(
            session, job_id=job_id, user_id=current_user.id
        )
    else:
        job = crud_report.get(session, id=job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Report job not found")

    return ReportJobPublic.model_validate(job)


@router.get(
    "/jobs/{job_id}/download"
)
async def download_report(
    job_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser
) -> Response:
    """Download completed report."""
    # Get job from database
    if current_user.role == UserRole.HOST:
        job = crud_report.get_by_user(
            session, job_id=job_id, user_id=current_user.id
        )
    else:
        job = crud_report.get(session, id=job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Report job not found")

    if job.status != ReportJobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Report not ready")

    if not job.result_path:
        raise HTTPException(status_code=404, detail="Report file not found")

    # Check if report has expired
    if job.is_expired():
        raise HTTPException(status_code=410, detail="Report has expired")

    # Get file content
    content = storage_service.get_file(job.result_path)
    if not content:
        raise HTTPException(status_code=404, detail="Report file not found")

    # Log download in history
    if job.result_path and job.result_size:
        crud_report.create_history_entry(
            session,
            report_job=job,
            file_path=job.result_path,
            file_size=job.result_size
        )

    # Log audit
    log_audit(
        session=session,
        user=current_user,
        action="downloaded",
        entity_type="report",
        entity_id=job_id,
        entity_name=f"Report {job.type}",
        description=f"Downloaded {job.type} report"
    )

    session.commit()

    # Determine content type
    file_ext = job.result_path.split(".")[-1].lower()
    content_types = {
        "json": "application/json",
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pdf": "application/pdf",
    }
    content_type = content_types.get(file_ext, "application/octet-stream")

    # Create response
    filename = job.result_path.split("/")[-1]
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get(
    "/jobs",
    response_model=ReportJobsPublic
)
async def list_jobs(
    skip: int = 0,
    limit: int = 100,
    status: ReportJobStatus | None = None,
    session: SessionDep = None,
    current_user: CurrentUser = None
) -> ReportJobsPublic:
    """List report jobs."""
    # For regular hosts, only show their own jobs
    user_id = current_user.id if current_user.role == UserRole.HOST else None

    jobs = crud_report.list_by_user(
        session,
        user_id=user_id,
        status=status,
        skip=skip,
        limit=limit
    )

    total = crud_report.count_by_user(
        session,
        user_id=user_id,
        status=status
    )

    return ReportJobsPublic(
        data=[ReportJobPublic.model_validate(job) for job in jobs],
        count=total
    )


@router.delete(
    "/cleanup",
    dependencies=[Depends(get_current_admin_user)]
)
async def cleanup_expired_reports(
    session: SessionDep,
    current_user: CurrentUser
) -> dict[str, int]:
    """Clean up expired reports (admin only)."""
    deleted_count = crud_report.cleanup_old_jobs(session, days=30)

    # Log audit
    if deleted_count > 0:
        log_audit(
            session=session,
            user=current_user,
            action="cleanup",
            entity_type="reports",
            entity_id=uuid.uuid4(),  # Dummy ID for cleanup action
            entity_name="Expired Reports",
            description=f"Cleaned up {deleted_count} expired reports"
        )

    session.commit()

    # Also clean up files from storage
    files_deleted = storage_service.cleanup_old_files(7)  # 7 days

    return {
        "reports_deleted": deleted_count,
        "files_deleted": files_deleted
    }
