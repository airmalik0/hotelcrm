import uuid
from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.models import (
    ReportHistory,
    ReportJob,
    ReportJobCreate,
    ReportJobStatus,
    ReportJobUpdate,
    User,
)


def create_report_job(
    *, session: Session, user: User, report_create: ReportJobCreate
) -> ReportJob:
    """Create a new report job."""
    report_job = ReportJob.model_validate(
        report_create,
        update={
            "user_id": user.id,
            "created_at": datetime.utcnow(),
        }
    )
    session.add(report_job)
    session.flush()  # Get ID without committing
    return report_job


def update_report_job(
    *, session: Session, report_job: ReportJob, report_update: ReportJobUpdate
) -> ReportJob:
    """Update a report job."""
    report_data = report_update.model_dump(exclude_unset=True)
    
    # Check if status transition is valid
    if "status" in report_data:
        new_status = report_data["status"]
        if not report_job.can_transition_to(new_status):
            raise ValueError(
                f"Invalid status transition from {report_job.status} to {new_status}"
            )
        
        # Set timestamps based on status changes
        if new_status == ReportJobStatus.PROCESSING:
            report_data["started_at"] = datetime.utcnow()
        elif new_status in [ReportJobStatus.COMPLETED, ReportJobStatus.FAILED]:
            report_data["completed_at"] = datetime.utcnow()
            # Set expiration for completed reports (7 days by default)
            if new_status == ReportJobStatus.COMPLETED and "expires_at" not in report_data:
                report_data["expires_at"] = datetime.utcnow() + timedelta(days=7)
    
    report_job.sqlmodel_update(report_data)
    session.add(report_job)
    session.flush()
    return report_job


def get_report_job(*, session: Session, job_id: uuid.UUID) -> ReportJob | None:
    """Get a report job by ID."""
    statement = select(ReportJob).where(ReportJob.id == job_id)
    return session.exec(statement).first()


def get_report_job_by_user(
    *, session: Session, job_id: uuid.UUID, user_id: uuid.UUID
) -> ReportJob | None:
    """Get a report job by ID for a specific user."""
    statement = select(ReportJob).where(
        ReportJob.id == job_id,
        ReportJob.user_id == user_id
    )
    return session.exec(statement).first()


def list_report_jobs(
    *,
    session: Session,
    user_id: uuid.UUID | None = None,
    status: ReportJobStatus | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[ReportJob]:
    """List report jobs with optional filters."""
    statement = select(ReportJob)
    
    if user_id:
        statement = statement.where(ReportJob.user_id == user_id)
    
    if status:
        statement = statement.where(ReportJob.status == status)
    
    statement = statement.order_by(ReportJob.created_at.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def count_report_jobs(
    *,
    session: Session,
    user_id: uuid.UUID | None = None,
    status: ReportJobStatus | None = None,
) -> int:
    """Count report jobs with optional filters."""
    statement = select(ReportJob)
    
    if user_id:
        statement = statement.where(ReportJob.user_id == user_id)
    
    if status:
        statement = statement.where(ReportJob.status == status)
    
    return len(session.exec(statement).all())


def delete_report_job(*, session: Session, report_job: ReportJob) -> None:
    """Delete a report job and its associated history."""
    session.delete(report_job)
    session.flush()


def delete_expired_reports(*, session: Session) -> int:
    """Delete expired report jobs."""
    statement = select(ReportJob).where(
        ReportJob.expires_at.is_not(None),
        ReportJob.expires_at < datetime.utcnow()
    )
    expired_jobs = session.exec(statement).all()
    
    count = 0
    for job in expired_jobs:
        session.delete(job)
        count += 1
    
    if count > 0:
        session.flush()
    
    return count


def cleanup_old_reports(
    *, session: Session, days_to_keep: int = 30
) -> int:
    """Clean up old report jobs older than specified days."""
    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    
    statement = select(ReportJob).where(
        ReportJob.created_at < cutoff_date
    )
    old_jobs = session.exec(statement).all()
    
    count = 0
    for job in old_jobs:
        session.delete(job)
        count += 1
    
    if count > 0:
        session.flush()
    
    return count


def create_report_history(
    *,
    session: Session,
    job_id: uuid.UUID,
    user_id: uuid.UUID,
    action: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> ReportHistory:
    """Create a report history entry."""
    history = ReportHistory(
        job_id=job_id,
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.utcnow(),
    )
    session.add(history)
    session.flush()
    return history


def list_report_history(
    *,
    session: Session,
    job_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[ReportHistory]:
    """List report history entries with optional filters."""
    statement = select(ReportHistory)
    
    if job_id:
        statement = statement.where(ReportHistory.job_id == job_id)
    
    if user_id:
        statement = statement.where(ReportHistory.user_id == user_id)
    
    statement = statement.order_by(ReportHistory.timestamp.desc())
    statement = statement.offset(skip).limit(limit)
    
    return list(session.exec(statement).all())


def get_user_active_jobs_count(
    *, session: Session, user_id: uuid.UUID
) -> int:
    """Get count of active (pending/processing) jobs for a user."""
    statement = select(ReportJob).where(
        ReportJob.user_id == user_id,
        ReportJob.status.in_([ReportJobStatus.PENDING, ReportJobStatus.PROCESSING])
    )
    return len(session.exec(statement).all())


def cancel_pending_jobs(
    *, session: Session, user_id: uuid.UUID | None = None
) -> int:
    """Cancel all pending jobs, optionally for a specific user."""
    statement = select(ReportJob).where(
        ReportJob.status == ReportJobStatus.PENDING
    )
    
    if user_id:
        statement = statement.where(ReportJob.user_id == user_id)
    
    pending_jobs = session.exec(statement).all()
    
    count = 0
    for job in pending_jobs:
        job.status = ReportJobStatus.CANCELLED
        job.completed_at = datetime.utcnow()
        session.add(job)
        count += 1
    
    if count > 0:
        session.flush()
    
    return count