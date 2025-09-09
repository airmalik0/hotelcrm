import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep, get_current_admin_user
from app.core.audit import log_audit
from app.crud_reports import (
    count_report_jobs,
    create_report_history,
    create_report_job,
    delete_expired_reports,
    get_report_job_by_user,
    list_report_jobs,
    update_report_job,
)
from app.models import (
    ReportFormat,
    ReportJob,
    ReportJobCreate,
    ReportJobPublic,
    ReportJobsPublic,
    ReportJobStatus,
    ReportJobType,
    ReportJobUpdate,
    User,
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
    db: Session,
    user_id: uuid.UUID,
    params: dict[str, Any],
    report_variant: str = "standard"
) -> None:
    """Background task to generate occupancy report."""
    try:
        # Update job status to processing
        job = db.get(ReportJob, job_id)
        if not job:
            return

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.PROCESSING,
                started_at=datetime.utcnow(),
                progress=10
            )
        )
        db.commit()

        analytics = AnalyticsService(db)

        # Get data based on variant
        if report_variant == "daily_pattern":
            data = await analytics.get_daily_pattern_report(
                params["start_date"],
                params["end_date"],
                params.get("room_type")
            )
        elif report_variant == "weekly_pattern":
            data = await analytics.get_weekly_pattern_report(
                params["start_date"],
                params["end_date"],
                params.get("room_type")
            )
        elif report_variant == "seasonal_trend":
            data = await analytics.get_seasonal_trend_report(
                params["start_date"],
                params["end_date"],
                params.get("room_type")
            )
        else:
            data = await analytics.get_occupancy_report(
                params["start_date"],
                params["end_date"],
                params.get("room_type"),
                params.get("room_id"),
                params.get("group_by", "day")
            )

        # Update progress
        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=40)
        )
        db.commit()

        # Generate chart if requested
        chart_image = None
        if params.get("include_charts"):
            chart_service = ChartService()
            if report_variant == "weekly_pattern":
                chart_image = await chart_service.create_weekly_pattern_heatmap(data)
            elif report_variant == "seasonal_trend":
                chart_image = await chart_service.create_seasonal_trend_chart(data)
            else:
                chart_image = await chart_service.create_occupancy_chart(data)

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=60)
        )
        db.commit()

        # Export to requested format
        format = params.get("format", ReportFormat.JSON)
        if format == ReportFormat.JSON:
            content = json.dumps(data, indent=2).encode()
            filename = f"occupancy_report_{job_id}.json"
        elif format == ReportFormat.CSV:
            export_service = ExportService()
            content = await export_service.export_to_csv(data)
            filename = f"occupancy_report_{job_id}.csv"
        elif format == ReportFormat.EXCEL:
            export_service = ExportService()
            content = await export_service.export_occupancy_report(data, "excel")
            filename = f"occupancy_report_{job_id}.xlsx"
        else:  # PDF
            pdf_service = PDFService()
            content = await pdf_service.create_occupancy_report_pdf(
                data, chart_image, f"Occupancy Report - {report_variant.replace('_', ' ').title()}"
            )
            filename = f"occupancy_report_{job_id}.pdf"

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=80)
        )
        db.commit()

        # Save file
        file_path = await storage_service.save_file(content, filename, "occupancy")
        file_size = len(content)

        # Update job status to completed
        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.COMPLETED,
                progress=100,
                result_path=file_path,
                result_size=file_size,
                completed_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
        )

        # Log audit
        user = db.get(User, user_id)
        if user:
            log_audit(
                session=db,
                user=user,
                action="generated",
                entity_type="report",
                entity_id=job_id,
                entity_name=f"Occupancy Report ({report_variant})",
                description=f"Generated {report_variant} occupancy report in {format} format"
            )

        db.commit()

    except Exception as e:
        # Update job status to failed
        if job := db.get(ReportJob, job_id):
            update_report_job(
                session=db,
                report_job=job,
                report_update=ReportJobUpdate(
                    status=ReportJobStatus.FAILED,
                    error_message=str(e),
                    completed_at=datetime.utcnow()
                )
            )
            db.commit()


async def generate_revenue_report_task(
    job_id: uuid.UUID,
    db: Session,
    user_id: uuid.UUID,
    params: dict[str, Any]
) -> None:
    """Background task to generate revenue report."""
    try:
        # Update job status to processing
        job = db.get(ReportJob, job_id)
        if not job:
            return

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.PROCESSING,
                started_at=datetime.utcnow(),
                progress=10
            )
        )
        db.commit()

        analytics = AnalyticsService(db)
        data = await analytics.get_revenue_report(
            params["start_date"],
            params["end_date"],
            params.get("room_type"),
            params.get("room_id"),
            params.get("group_by", "month")
        )

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=40)
        )
        db.commit()

        # Generate chart if requested
        chart_image = None
        if params.get("include_charts"):
            chart_service = ChartService()
            chart_image = await chart_service.create_revenue_chart(data)

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=60)
        )
        db.commit()

        # Export to requested format
        format = params.get("format", ReportFormat.JSON)
        if format == ReportFormat.JSON:
            content = json.dumps(data, indent=2).encode()
            filename = f"revenue_report_{job_id}.json"
        elif format == ReportFormat.CSV:
            export_service = ExportService()
            content = await export_service.export_to_csv(data)
            filename = f"revenue_report_{job_id}.csv"
        elif format == ReportFormat.EXCEL:
            export_service = ExportService()
            content = await export_service.export_revenue_report(data, "excel")
            filename = f"revenue_report_{job_id}.xlsx"
        else:  # PDF
            pdf_service = PDFService()
            content = await pdf_service.create_revenue_report_pdf(data, chart_image)
            filename = f"revenue_report_{job_id}.pdf"

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=80)
        )
        db.commit()

        # Save file
        file_path = await storage_service.save_file(content, filename, "revenue")
        file_size = len(content)

        # Update job status to completed
        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.COMPLETED,
                progress=100,
                result_path=file_path,
                result_size=file_size,
                completed_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
        )

        # Log audit
        user = db.get(User, user_id)
        if user:
            log_audit(
                session=db,
                user=user,
                action="generated",
                entity_type="report",
                entity_id=job_id,
                entity_name="Revenue Report",
                description=f"Generated revenue report in {format} format"
            )

        db.commit()

    except Exception as e:
        # Update job status to failed
        if job := db.get(ReportJob, job_id):
            update_report_job(
                session=db,
                report_job=job,
                report_update=ReportJobUpdate(
                    status=ReportJobStatus.FAILED,
                    error_message=str(e),
                    completed_at=datetime.utcnow()
                )
            )
            db.commit()


async def generate_top_customers_task(
    job_id: uuid.UUID,
    db: Session,
    user_id: uuid.UUID,
    params: dict[str, Any]
) -> None:
    """Background task to generate top customers report."""
    try:
        # Update job status to processing
        job = db.get(ReportJob, job_id)
        if not job:
            return

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.PROCESSING,
                started_at=datetime.utcnow(),
                progress=10
            )
        )
        db.commit()

        analytics = AnalyticsService(db)
        data = await analytics.get_top_customers(
            params["start_date"],
            params["end_date"],
            params.get("limit", 10),
            params.get("sort_by", "total_spent")
        )

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=60)
        )
        db.commit()

        # Export to requested format
        format = params.get("format", ReportFormat.JSON)
        if format == ReportFormat.JSON:
            content = json.dumps(data, indent=2).encode()
            filename = f"top_customers_{job_id}.json"
        elif format == ReportFormat.CSV:
            export_service = ExportService()
            content = await export_service.export_to_csv(data)
            filename = f"top_customers_{job_id}.csv"
        elif format == ReportFormat.EXCEL:
            export_service = ExportService()
            content = await export_service.export_customer_report(data, "excel")
            filename = f"top_customers_{job_id}.xlsx"
        else:  # PDF
            pdf_service = PDFService()
            content = await pdf_service.create_customer_report_pdf(data)
            filename = f"top_customers_{job_id}.pdf"

        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(progress=80)
        )
        db.commit()

        # Save file
        file_path = await storage_service.save_file(content, filename, "customers")
        file_size = len(content)

        # Update job status to completed
        update_report_job(
            session=db,
            report_job=job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.COMPLETED,
                progress=100,
                result_path=file_path,
                result_size=file_size,
                completed_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
        )

        # Log audit
        user = db.get(User, user_id)
        if user:
            log_audit(
                session=db,
                user=user,
                action="generated",
                entity_type="report",
                entity_id=job_id,
                entity_name="Top Customers Report",
                description=f"Generated top customers report in {format} format"
            )

        db.commit()

    except Exception as e:
        # Update job status to failed
        if job := db.get(ReportJob, job_id):
            update_report_job(
                session=db,
                report_job=job,
                report_update=ReportJobUpdate(
                    status=ReportJobStatus.FAILED,
                    error_message=str(e),
                    completed_at=datetime.utcnow()
                )
            )
            db.commit()


@router.post(
    "/generate",
    response_model=ReportJobPublic,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_report(
    report_type: ReportJobType,
    format: ReportFormat = ReportFormat.JSON,
    params: dict[str, Any] | None = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: SessionDep = None,
    current_user: CurrentUser = None
) -> ReportJobPublic:
    """Generate a report (admin only)."""
    # Check user permissions
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=403,
            detail="Only admins and managers can generate reports"
        )

    # Create report job in database
    report_job = create_report_job(
        session=db,
        user=current_user,
        report_create=ReportJobCreate(
            type=report_type,
            format=format,
            params=params or {}
        )
    )
    db.commit()

    # Start appropriate background task based on report type
    if report_type == ReportJobType.ROOM_OCCUPANCY:
        background_tasks.add_task(
            generate_occupancy_report_task,
            report_job.id,
            db,
            current_user.id,
            params or {},
            "standard"
        )
    elif report_type == ReportJobType.REVENUE_REPORT:
        background_tasks.add_task(
            generate_revenue_report_task,
            report_job.id,
            db,
            current_user.id,
            params or {}
        )
    elif report_type == ReportJobType.CUSTOMER_REPORT:
        background_tasks.add_task(
            generate_top_customers_task,
            report_job.id,
            db,
            current_user.id,
            params or {}
        )
    else:
        # For other report types, mark as failed immediately
        update_report_job(
            session=db,
            report_job=report_job,
            report_update=ReportJobUpdate(
                status=ReportJobStatus.FAILED,
                error_message=f"Report type {report_type} not implemented yet",
                completed_at=datetime.utcnow()
            )
        )
        db.commit()

    return ReportJobPublic.model_validate(report_job)


@router.get(
    "/jobs/{job_id}",
    response_model=ReportJobPublic
)
async def get_report_status(
    job_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> ReportJobPublic:
    """Get report job status."""
    # Get job from database
    job = get_report_job_by_user(
        session=db,
        job_id=job_id,
        user_id=current_user.id if current_user.role == UserRole.HOST else None
    )

    if not job:
        raise HTTPException(status_code=404, detail="Report job not found")

    return ReportJobPublic.model_validate(job)


@router.get(
    "/jobs/{job_id}/download"
)
async def download_report(
    job_id: uuid.UUID,
    db: SessionDep,
    current_user: CurrentUser
) -> Response:
    """Download completed report."""
    # Get job from database
    job = get_report_job_by_user(
        session=db,
        job_id=job_id,
        user_id=current_user.id if current_user.role == UserRole.HOST else None
    )

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
    content = await storage_service.get_file(job.result_path)
    if not content:
        raise HTTPException(status_code=404, detail="Report file not found")

    # Log download in history
    create_report_history(
        session=db,
        job_id=job_id,
        user_id=current_user.id,
        action="downloaded"
    )

    # Log audit
    log_audit(
        session=db,
        user=current_user,
        action="downloaded",
        entity_type="report",
        entity_id=job_id,
        entity_name=f"Report {job.type}",
        description=f"Downloaded {job.type} report"
    )

    db.commit()

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
    db: SessionDep = None,
    current_user: CurrentUser = None
) -> ReportJobsPublic:
    """List report jobs."""
    # For regular hosts, only show their own jobs
    user_id = current_user.id if current_user.role == UserRole.HOST else None

    jobs = list_report_jobs(
        session=db,
        user_id=user_id,
        status=status,
        skip=skip,
        limit=limit
    )

    total = count_report_jobs(
        session=db,
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
    db: SessionDep,
    current_user: CurrentUser
) -> dict[str, int]:
    """Clean up expired reports (admin only)."""
    deleted_count = delete_expired_reports(session=db)

    # Log audit
    if deleted_count > 0:
        log_audit(
            session=db,
            user=current_user,
            action="cleanup",
            entity_type="reports",
            entity_id=uuid.uuid4(),  # Dummy ID for cleanup action
            entity_name="Expired Reports",
            description=f"Cleaned up {deleted_count} expired reports"
        )

    db.commit()

    # Also clean up files from storage
    files_deleted = await storage_service.cleanup_old_files(7)  # 7 days

    return {
        "reports_deleted": deleted_count,
        "files_deleted": files_deleted
    }
