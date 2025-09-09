from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlmodel import Session

from app.crud.base import CRUDBase
from app.models import (
    ReportHistory,
    ReportJob,
    ReportJobCreate,
    ReportJobStatus,
    ReportJobUpdate,
)


class CRUDReport(CRUDBase[ReportJob, ReportJobCreate, ReportJobUpdate]):
    """CRUD operations for report jobs."""

    def create_with_user(
        self, session: Session, *, obj_in: ReportJobCreate, user_id: UUID
    ) -> ReportJob:
        """Create a report job for a specific user."""
        report_job = ReportJob.model_validate(
            obj_in,
            update={
                "user_id": user_id,
                "created_at": datetime.utcnow(),
            }
        )
        session.add(report_job)
        session.flush()
        return report_job

    def update_status(
        self,
        session: Session,
        *,
        db_obj: ReportJob,
        status: ReportJobStatus,
        error_message: str | None = None,
        progress: int | None = None,
        result_path: str | None = None,
        result_size: int | None = None,
    ) -> ReportJob:
        """Update report job status with validation."""
        # Check if status transition is valid
        if not db_obj.can_transition_to(status):
            raise ValueError(
                f"Invalid status transition from {db_obj.status} to {status}"
            )

        update_data: dict[str, Any] = {"status": status}

        # Set timestamps based on status changes
        if status == ReportJobStatus.PROCESSING:
            update_data["started_at"] = datetime.utcnow()
        elif status in [ReportJobStatus.COMPLETED, ReportJobStatus.FAILED]:
            update_data["completed_at"] = datetime.utcnow()

        if error_message is not None:
            update_data["error_message"] = error_message
        if progress is not None:
            update_data["progress"] = progress
        if result_path is not None:
            update_data["result_path"] = result_path
        if result_size is not None:
            update_data["result_size"] = result_size

        db_obj.sqlmodel_update(update_data)
        session.add(db_obj)
        session.flush()
        return db_obj

    def get_by_user(
        self, session: Session, *, job_id: UUID, user_id: UUID
    ) -> ReportJob | None:
        """Get a report job by ID and user ID."""
        statement = select(ReportJob).where(
            ReportJob.id == job_id,
            ReportJob.user_id == user_id
        )
        return session.exec(statement).first()

    def list_by_user(
        self,
        session: Session,
        *,
        user_id: UUID | None = None,
        status: ReportJobStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ReportJob]:
        """List report jobs with optional filtering."""
        statement = select(ReportJob)

        if user_id:
            statement = statement.where(ReportJob.user_id == user_id)
        if status:
            statement = statement.where(ReportJob.status == status)

        statement = statement.order_by(desc(ReportJob.created_at))
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()

    def count_by_user(
        self,
        session: Session,
        *,
        user_id: UUID | None = None,
        status: ReportJobStatus | None = None,
    ) -> int:
        """Count report jobs with optional filtering."""
        statement = select(func.count()).select_from(ReportJob)

        if user_id:
            statement = statement.where(ReportJob.user_id == user_id)
        if status:
            statement = statement.where(ReportJob.status == status)

        return session.exec(statement).one()

    def create_history_entry(
        self,
        session: Session,
        *,
        report_job: ReportJob,
        file_path: str,
        file_size: int
    ) -> ReportHistory:
        """Create a report history entry after successful generation."""
        history = ReportHistory(
            user_id=report_job.user_id,
            type=report_job.type,
            format=report_job.format,
            file_path=file_path,
            file_size=file_size,
            params=report_job.params,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
        )
        session.add(history)
        session.flush()
        return history

    def list_history(
        self,
        session: Session,
        *,
        user_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ReportHistory]:
        """List report history entries."""
        statement = select(ReportHistory)

        if user_id:
            statement = statement.where(ReportHistory.user_id == user_id)

        statement = statement.order_by(desc(ReportHistory.created_at))
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()

    def count_history(
        self,
        session: Session,
        *,
        user_id: UUID | None = None,
    ) -> int:
        """Count report history entries."""
        statement = select(func.count()).select_from(ReportHistory)

        if user_id:
            statement = statement.where(ReportHistory.user_id == user_id)

        return session.exec(statement).one()

    def cancel_pending_jobs(
        self,
        session: Session,
        *,
        user_id: UUID | None = None
    ) -> int:
        """Cancel all pending jobs, optionally for a specific user."""
        statement = select(ReportJob).where(
            ReportJob.status == ReportJobStatus.PENDING
        )

        if user_id:
            statement = statement.where(ReportJob.user_id == user_id)

        jobs = session.exec(statement).all()
        count = 0

        for job in jobs:
            if job.can_transition_to(ReportJobStatus.CANCELLED):
                job.status = ReportJobStatus.CANCELLED
                job.completed_at = datetime.utcnow()
                session.add(job)
                count += 1

        session.flush()
        return count

    def cleanup_old_jobs(
        self,
        session: Session,
        *,
        days: int = 30
    ) -> int:
        """Delete completed/failed jobs older than specified days."""
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        statement = select(ReportJob).where(
            ReportJob.status.in_([
                ReportJobStatus.COMPLETED,
                ReportJobStatus.FAILED,
                ReportJobStatus.CANCELLED
            ]),
            ReportJob.completed_at < cutoff_date
        )

        jobs = session.exec(statement).all()
        count = len(jobs)

        for job in jobs:
            session.delete(job)

        session.flush()
        return count


report = CRUDReport(ReportJob)
