from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, text
from sqlmodel import Session, or_, select

from app.crud.base import CRUDBase
from app.models import AuditLog, User


class CRUDAudit(CRUDBase[AuditLog, dict[str, Any], dict[str, Any]]):
    """CRUD operations for audit logs."""

    def get_multi_with_filters(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        user_id: UUID | None = None,
        user_name: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        search: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[AuditLog]:
        """Get audit logs with filters and user relationship."""
        # Build statement without join first
        statement = select(AuditLog)

        # Apply filters
        if user_id:
            statement = statement.where(AuditLog.user_id == user_id)

        if user_name:
            # Join with User table for username filter
            subquery = select(User.id).where(User.username.ilike(f"%{user_name}%"))
            statement = statement.where(AuditLog.user_id.in_(subquery))

        if action:
            statement = statement.where(AuditLog.action == action)

        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)

        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)

        if search:
            # Use parameterized queries to prevent SQL injection
            search_pattern = f"%{search}%"
            search_filter = or_(
                AuditLog.entity_name.ilike(search_pattern),
                AuditLog.description.ilike(search_pattern),
                # Cast JSON to text for searching in PostgreSQL with parameterized query
                text("CAST(new_values AS TEXT) ILIKE :search_param").params(search_param=search_pattern),
                text("CAST(old_values AS TEXT) ILIKE :search_param").params(search_param=search_pattern),
            )
            statement = statement.where(search_filter)

        if start_date:
            statement = statement.where(AuditLog.timestamp >= start_date)

        if end_date:
            statement = statement.where(AuditLog.timestamp <= end_date)

        # Order by timestamp (newest first)
        statement = statement.order_by(desc(AuditLog.timestamp))

        # Apply pagination
        statement = statement.offset(skip).limit(limit)

        # Execute the query and get audit logs as proper models
        # SQLModel's exec returns proper model instances when using sqlmodel.select
        audit_logs = session.exec(statement).all()
        return audit_logs

    def count_with_filters(
        self,
        session: Session,
        *,
        user_id: UUID | None = None,
        user_name: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        search: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> int:
        """Count audit logs with filters."""
        statement = select(func.count()).select_from(AuditLog)

        if user_id:
            statement = statement.where(AuditLog.user_id == user_id)

        if user_name:
            # Use subquery for username filter
            subquery = select(User.id).where(User.username.ilike(f"%{user_name}%"))
            statement = statement.where(AuditLog.user_id.in_(subquery))

        if action:
            statement = statement.where(AuditLog.action == action)

        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)

        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)

        if search:
            # Use parameterized queries to prevent SQL injection
            search_pattern = f"%{search}%"
            search_filter = or_(
                AuditLog.entity_name.ilike(search_pattern),
                AuditLog.description.ilike(search_pattern),
                # Cast JSON to text for searching in PostgreSQL with parameterized query
                text("CAST(new_values AS TEXT) ILIKE :search_param").params(search_param=search_pattern),
                text("CAST(old_values AS TEXT) ILIKE :search_param").params(search_param=search_pattern),
            )
            statement = statement.where(search_filter)

        if start_date:
            statement = statement.where(AuditLog.timestamp >= start_date)

        if end_date:
            statement = statement.where(AuditLog.timestamp <= end_date)

        return session.exec(statement).one()

    def get_with_user(self, session: Session, *, audit_id: UUID) -> AuditLog | None:
        """Get audit log with user relationship loaded."""
        statement = select(AuditLog).where(AuditLog.id == audit_id)
        audit_log = session.exec(statement).first()

        # Trigger lazy loading of user relationship if audit log exists
        if audit_log and audit_log.user_id:
            _ = audit_log.user  # This will load the user relationship

        return audit_log

    def get_stats(
        self,
        session: Session,
        *,
        days: int = 30
    ) -> dict[str, Any]:
        """Get audit statistics for the last N days."""
        from datetime import timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Count by action
        action_counts = session.exec(
            select(AuditLog.action, func.count(AuditLog.id))
            .where(AuditLog.timestamp >= cutoff_date)
            .group_by(AuditLog.action)
        ).all()

        # Count by entity type
        entity_counts = session.exec(
            select(AuditLog.entity_type, func.count(AuditLog.id))
            .where(AuditLog.timestamp >= cutoff_date)
            .group_by(AuditLog.entity_type)
        ).all()

        # Most active users
        user_counts = session.exec(
            select(User.username, func.count(AuditLog.id))
            .select_from(AuditLog)
            .join(User, AuditLog.user_id == User.id)
            .where(AuditLog.timestamp >= cutoff_date)
            .group_by(User.username)
            .order_by(desc(func.count(AuditLog.id)))
            .limit(10)
        ).all()

        # Total count
        total_count = session.exec(
            select(func.count(AuditLog.id))
            .where(AuditLog.timestamp >= cutoff_date)
        ).one()

        return {
            "total_actions": total_count,
            "actions_by_type": dict(action_counts),
            "actions_by_entity": dict(entity_counts),
            "most_active_users": [
                {"username": username, "action_count": count}
                for username, count in user_counts
            ],
            "period_days": days,
        }

    def create_audit_log(
        self,
        session: Session,
        *,
        user_id: UUID | None,
        action: str,
        entity_type: str,
        entity_id: UUID | None = None,
        entity_name: str | None = None,
        description: str | None = None,
        old_values: dict[str, Any] | None = None,
        new_values: dict[str, Any] | None = None,
    ) -> AuditLog:
        """Create an audit log entry."""
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            description=description,
            old_values=old_values,
            new_values=new_values,
            timestamp=datetime.now(timezone.utc),
        )
        session.add(audit_log)
        session.flush()
        return audit_log


audit = CRUDAudit(AuditLog)
