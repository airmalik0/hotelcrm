import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from sqlmodel import Session

from app.api.deps import SessionDep, get_current_admin_user
from app.schemas.report_schemas import (
    JobStatus,
    ReportFormat,
    ReportGenerationRequest,
    ReportJobResponse,
    ReportJobStatus,
    ReportListResponse,
    ReportMetadata,
    ReportType,
    TopCustomersRequest,
)
from app.services.analytics_service import AnalyticsService
from app.services.chart_service import ChartService
from app.services.export_service import ExportService
from app.services.pdf_service import PDFService
from app.services.storage_service import storage_service

router = APIRouter()

# In-memory job storage (in production, use Redis or database)
job_storage: dict[str, dict[str, Any]] = {}


async def generate_occupancy_report_task(
    job_id: str,
    db: Session,
    params: dict[str, Any],
    report_variant: str = "standard"
) -> None:
    """Background task to generate occupancy report."""
    try:
        job_storage[job_id]["status"] = JobStatus.PROCESSING
        job_storage[job_id]["progress"] = 10

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

        job_storage[job_id]["progress"] = 40

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

        job_storage[job_id]["progress"] = 60

        # Export to requested format
        format = params.get("format", "json")
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

        job_storage[job_id]["progress"] = 80

        # Save file
        file_path = await storage_service.save_file(content, filename, "occupancy")

        # Update job status
        job_storage[job_id]["status"] = JobStatus.COMPLETED
        job_storage[job_id]["progress"] = 100
        job_storage[job_id]["result_path"] = file_path
        job_storage[job_id]["completed_at"] = datetime.utcnow()

    except Exception as e:
        job_storage[job_id]["status"] = JobStatus.FAILED
        job_storage[job_id]["error"] = str(e)
        job_storage[job_id]["completed_at"] = datetime.utcnow()


async def generate_revenue_report_task(
    job_id: str,
    db: Session,
    params: dict[str, Any]
) -> None:
    """Background task to generate revenue report."""
    try:
        job_storage[job_id]["status"] = JobStatus.PROCESSING
        job_storage[job_id]["progress"] = 10

        analytics = AnalyticsService(db)
        data = await analytics.get_revenue_report(
            params["start_date"],
            params["end_date"],
            params.get("room_type"),
            params.get("room_id"),
            params.get("group_by", "month")
        )

        job_storage[job_id]["progress"] = 40

        # Generate chart if requested
        chart_image = None
        if params.get("include_charts"):
            chart_service = ChartService()
            chart_image = await chart_service.create_revenue_chart(data)

        job_storage[job_id]["progress"] = 60

        # Export to requested format
        format = params.get("format", "json")
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

        job_storage[job_id]["progress"] = 80

        # Save file
        file_path = await storage_service.save_file(content, filename, "revenue")

        # Update job status
        job_storage[job_id]["status"] = JobStatus.COMPLETED
        job_storage[job_id]["progress"] = 100
        job_storage[job_id]["result_path"] = file_path
        job_storage[job_id]["completed_at"] = datetime.utcnow()

    except Exception as e:
        job_storage[job_id]["status"] = JobStatus.FAILED
        job_storage[job_id]["error"] = str(e)
        job_storage[job_id]["completed_at"] = datetime.utcnow()


@router.post(
    "/occupancy_standard/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_occupancy_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate standard occupancy report (admin only)."""
    job_id = str(uuid.uuid4())

    # Initialize job
    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.OCCUPANCY_STANDARD,
        "parameters": request.model_dump(),
    }

    # Start background task
    background_tasks.add_task(
        generate_occupancy_report_task,
        job_id,
        db,
        request.model_dump(),
        "standard"
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Report generation started"
    )


@router.post(
    "/occupancy_daily_pattern/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_daily_pattern_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate daily occupancy pattern report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.OCCUPANCY_DAILY_PATTERN,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_occupancy_report_task,
        job_id,
        db,
        request.model_dump(),
        "daily_pattern"
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Daily pattern report generation started"
    )


@router.post(
    "/occupancy_weekly_pattern/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_weekly_pattern_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate weekly occupancy pattern report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.OCCUPANCY_WEEKLY_PATTERN,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_occupancy_report_task,
        job_id,
        db,
        request.model_dump(),
        "weekly_pattern"
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Weekly pattern report generation started"
    )


@router.post(
    "/occupancy_seasonal_trend/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_seasonal_trend_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate seasonal trend report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.OCCUPANCY_SEASONAL_TREND,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_occupancy_report_task,
        job_id,
        db,
        request.model_dump(),
        "seasonal_trend"
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Seasonal trend report generation started"
    )


@router.post(
    "/revenue/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_revenue_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate revenue report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.REVENUE,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_revenue_report_task,
        job_id,
        db,
        request.model_dump()
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Revenue report generation started"
    )


async def generate_top_customers_task(
    job_id: str,
    db: Session,
    params: dict[str, Any]
) -> None:
    """Background task to generate top customers report."""
    try:
        job_storage[job_id]["status"] = JobStatus.PROCESSING
        job_storage[job_id]["progress"] = 10

        analytics = AnalyticsService(db)
        data = await analytics.get_top_customers(
            params["start_date"],
            params["end_date"],
            params["limit"],
            params["sort_by"]
        )

        job_storage[job_id]["progress"] = 60

        # Export to requested format
        format = params.get("format", "json")
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

        job_storage[job_id]["progress"] = 80

        # Save file
        file_path = await storage_service.save_file(content, filename, "customers")

        # Update job status
        job_storage[job_id]["status"] = JobStatus.COMPLETED
        job_storage[job_id]["progress"] = 100
        job_storage[job_id]["result_path"] = file_path
        job_storage[job_id]["completed_at"] = datetime.utcnow()

    except Exception as e:
        job_storage[job_id]["status"] = JobStatus.FAILED
        job_storage[job_id]["error"] = str(e)
        job_storage[job_id]["completed_at"] = datetime.utcnow()


@router.post(
    "/top_customers/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_top_customers_report(
    request: TopCustomersRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate top customers report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.TOP_CUSTOMERS,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_top_customers_task,
        job_id,
        db,
        request.model_dump()
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Top customers report generation started"
    )


async def generate_repeat_guest_rate_task(
    job_id: str,
    db: Session,
    params: dict[str, Any]
) -> None:
    """Background task to generate repeat guest rate report."""
    try:
        job_storage[job_id]["status"] = JobStatus.PROCESSING
        job_storage[job_id]["progress"] = 10

        analytics = AnalyticsService(db)
        data = await analytics.get_repeat_guest_rate(
            params["start_date"],
            params["end_date"],
            params.get("group_by", "month")
        )

        job_storage[job_id]["progress"] = 60

        # Export to requested format
        format = params.get("format", "json")
        if format == ReportFormat.JSON:
            content = json.dumps(data, indent=2).encode()
            filename = f"repeat_guest_rate_{job_id}.json"
        elif format == ReportFormat.CSV:
            export_service = ExportService()
            content = await export_service.export_to_csv(data)
            filename = f"repeat_guest_rate_{job_id}.csv"
        elif format == ReportFormat.EXCEL:
            export_service = ExportService()
            content = await export_service.export_analytics_report(data, "excel")
            filename = f"repeat_guest_rate_{job_id}.xlsx"
        else:  # PDF
            pdf_service = PDFService()
            content = await pdf_service.create_analytics_report_pdf(data, "Repeat Guest Rate Report")
            filename = f"repeat_guest_rate_{job_id}.pdf"

        job_storage[job_id]["progress"] = 80

        # Save file
        file_path = await storage_service.save_file(content, filename, "analytics")

        # Update job status
        job_storage[job_id]["status"] = JobStatus.COMPLETED
        job_storage[job_id]["progress"] = 100
        job_storage[job_id]["result_path"] = file_path
        job_storage[job_id]["completed_at"] = datetime.utcnow()

    except Exception as e:
        job_storage[job_id]["status"] = JobStatus.FAILED
        job_storage[job_id]["error"] = str(e)
        job_storage[job_id]["completed_at"] = datetime.utcnow()


@router.post(
    "/repeat_guest_rate/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_repeat_guest_rate_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate repeat guest rate report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.REPEAT_GUEST_RATE,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_repeat_guest_rate_task,
        job_id,
        db,
        request.model_dump()
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Repeat guest rate report generation started"
    )


async def generate_payment_methods_task(
    job_id: str,
    db: Session,
    params: dict[str, Any]
) -> None:
    """Background task to generate payment methods report."""
    try:
        job_storage[job_id]["status"] = JobStatus.PROCESSING
        job_storage[job_id]["progress"] = 10

        analytics = AnalyticsService(db)
        data = await analytics.get_payment_methods_distribution(
            params["start_date"],
            params["end_date"],
            params.get("group_by", "month")
        )

        job_storage[job_id]["progress"] = 40

        # Generate chart if requested
        chart_image = None
        if params.get("include_charts"):
            chart_service = ChartService()
            chart_image = await chart_service.create_payment_methods_pie_chart(data)

        job_storage[job_id]["progress"] = 60

        # Export to requested format
        format = params.get("format", "json")
        if format == ReportFormat.JSON:
            content = json.dumps(data, indent=2).encode()
            filename = f"payment_methods_{job_id}.json"
        elif format == ReportFormat.CSV:
            export_service = ExportService()
            content = await export_service.export_to_csv(data)
            filename = f"payment_methods_{job_id}.csv"
        elif format == ReportFormat.EXCEL:
            export_service = ExportService()
            content = await export_service.export_analytics_report(data, "excel")
            filename = f"payment_methods_{job_id}.xlsx"
        else:  # PDF
            pdf_service = PDFService()
            content = await pdf_service.create_analytics_report_pdf(data, "Payment Methods Distribution", chart_image)
            filename = f"payment_methods_{job_id}.pdf"

        job_storage[job_id]["progress"] = 80

        # Save file
        file_path = await storage_service.save_file(content, filename, "analytics")

        # Update job status
        job_storage[job_id]["status"] = JobStatus.COMPLETED
        job_storage[job_id]["progress"] = 100
        job_storage[job_id]["result_path"] = file_path
        job_storage[job_id]["completed_at"] = datetime.utcnow()

    except Exception as e:
        job_storage[job_id]["status"] = JobStatus.FAILED
        job_storage[job_id]["error"] = str(e)
        job_storage[job_id]["completed_at"] = datetime.utcnow()


@router.post(
    "/payment_methods/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_payment_methods_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate payment methods distribution report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.PAYMENT_METHODS,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_payment_methods_task,
        job_id,
        db,
        request.model_dump()
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Payment methods report generation started"
    )


async def generate_geographic_analysis_task(
    job_id: str,
    db: Session,
    params: dict[str, Any]
) -> None:
    """Background task to generate geographic analysis report."""
    try:
        job_storage[job_id]["status"] = JobStatus.PROCESSING
        job_storage[job_id]["progress"] = 10

        analytics = AnalyticsService(db)
        data = await analytics.get_geographic_analysis(
            params["start_date"],
            params["end_date"]
        )

        job_storage[job_id]["progress"] = 40

        # Generate chart if requested
        if params.get("include_charts"):
            chart_service = ChartService()
            await chart_service.create_geographic_heatmap(data)

        job_storage[job_id]["progress"] = 60

        # Export to requested format
        format = params.get("format", "json")
        if format == ReportFormat.JSON:
            content = json.dumps(data, indent=2).encode()
            filename = f"geographic_analysis_{job_id}.json"
        elif format == ReportFormat.CSV:
            export_service = ExportService()
            content = await export_service.export_to_csv(data)
            filename = f"geographic_analysis_{job_id}.csv"
        elif format == ReportFormat.EXCEL:
            export_service = ExportService()
            content = await export_service.export_geographic_report(data, "excel")
            filename = f"geographic_analysis_{job_id}.xlsx"
        else:  # PDF
            pdf_service = PDFService()
            content = await pdf_service.create_geographic_report_pdf(data)
            filename = f"geographic_analysis_{job_id}.pdf"

        job_storage[job_id]["progress"] = 80

        # Save file
        file_path = await storage_service.save_file(content, filename, "analytics")

        # Update job status
        job_storage[job_id]["status"] = JobStatus.COMPLETED
        job_storage[job_id]["progress"] = 100
        job_storage[job_id]["result_path"] = file_path
        job_storage[job_id]["completed_at"] = datetime.utcnow()

    except Exception as e:
        job_storage[job_id]["status"] = JobStatus.FAILED
        job_storage[job_id]["error"] = str(e)
        job_storage[job_id]["completed_at"] = datetime.utcnow()


@router.post(
    "/geographic_analysis/generate",
    response_model=ReportJobResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def generate_geographic_analysis_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    db: SessionDep
) -> ReportJobResponse:
    """Generate geographic analysis report (admin only)."""
    job_id = str(uuid.uuid4())

    job_storage[job_id] = {
        "job_id": job_id,
        "status": JobStatus.QUEUED,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "report_type": ReportType.GEOGRAPHIC_ANALYSIS,
        "parameters": request.model_dump(),
    }

    background_tasks.add_task(
        generate_geographic_analysis_task,
        job_id,
        db,
        request.model_dump()
    )

    return ReportJobResponse(
        job_id=uuid.UUID(job_id),
        status=JobStatus.QUEUED,
        message="Geographic analysis report generation started"
    )


@router.get(
    "/jobs/{job_id}/status",
    response_model=ReportJobStatus,
    dependencies=[Depends(get_current_admin_user)]
)
async def get_job_status(
    job_id: uuid.UUID
) -> ReportJobStatus:
    """Get report generation job status (admin only)."""
    job_id_str = str(job_id)

    if job_id_str not in job_storage:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_storage[job_id_str]

    return ReportJobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress", 0),
        message=job.get("message"),
        result_path=job.get("result_path"),
        error=job.get("error"),
        created_at=job["created_at"],
        completed_at=job.get("completed_at")
    )


@router.get(
    "/jobs/{job_id}/download",
    dependencies=[Depends(get_current_admin_user)]
)
async def download_report(
    job_id: uuid.UUID
) -> Response:
    """Download completed report (admin only)."""
    job_id_str = str(job_id)

    if job_id_str not in job_storage:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_storage[job_id_str]

    if job["status"] != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Report not ready")

    if not job.get("result_path"):
        raise HTTPException(status_code=404, detail="Report file not found")

    # Get file content
    content = await storage_service.get_file(job["result_path"])
    if not content:
        raise HTTPException(status_code=404, detail="Report file not found")

    # Determine content type
    file_ext = job["result_path"].split(".")[-1].lower()
    content_types = {
        "json": "application/json",
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pdf": "application/pdf",
    }
    content_type = content_types.get(file_ext, "application/octet-stream")

    # Create response
    filename = job["result_path"].split("/")[-1]
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get(
    "/list",
    response_model=ReportListResponse,
    dependencies=[Depends(get_current_admin_user)]
)
async def list_reports(
    skip: int = 0,
    limit: int = 100
) -> ReportListResponse:
    """List all generated reports (admin only)."""
    # Get all completed jobs
    reports = []
    for job_id, job in job_storage.items():
        if job["status"] == JobStatus.COMPLETED:
            reports.append(
                ReportMetadata(
                    job_id=uuid.UUID(job_id),
                    report_type=job["report_type"],
                    format=job["parameters"].get("format", ReportFormat.JSON),
                    parameters=job["parameters"],
                    created_at=job["created_at"],
                    file_path=job.get("result_path"),
                    file_size=None  # Would need to implement file size tracking
                )
            )

    # Sort by created_at descending
    reports.sort(key=lambda x: x.created_at, reverse=True)

    # Apply pagination
    paginated_reports = reports[skip : skip + limit]

    return ReportListResponse(
        reports=paginated_reports,
        total=len(reports)
    )


@router.delete(
    "/cleanup",
    dependencies=[Depends(get_current_admin_user)]
)
async def cleanup_old_reports(
    days: int = 30
) -> dict[str, Any]:
    """Clean up reports older than specified days (admin only)."""
    deleted_count = await storage_service.cleanup_old_files(days)

    # Also clean up old jobs from memory
    cutoff_date = datetime.utcnow().timestamp() - (days * 24 * 60 * 60)
    jobs_to_delete = []
    for job_id, job in job_storage.items():
        if job["created_at"].timestamp() < cutoff_date:
            jobs_to_delete.append(job_id)

    for job_id in jobs_to_delete:
        del job_storage[job_id]

    return {
        "files_deleted": deleted_count,
        "jobs_deleted": len(jobs_to_delete)
    }
