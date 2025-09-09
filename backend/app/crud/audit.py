from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, or_

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
        statement = select(AuditLog).options(selectinload(AuditLog.user))  # type: ignore

        # Apply filters
        if user_id:
            statement = statement.where(AuditLog.user_id == user_id)

        if user_name:
            statement = statement.join(User).where(col(User.username).ilike(f"%{user_name}%"))

        if action:
            statement = statement.where(AuditLog.action == action)

        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)

        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)

        if search:
            search_filter = or_(
                col(AuditLog.entity_name).ilike(f"%{search}%"),
                col(AuditLog.description).ilike(f"%{search}%"),
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

        return session.exec(statement).all()

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
            statement = statement.join(User).where(col(User.username).ilike(f"%{user_name}%"))

        if action:
            statement = statement.where(AuditLog.action == action)

        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)

        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)

        if search:
            search_filter = or_(
                col(AuditLog.entity_name).ilike(f"%{search}%"),
                col(AuditLog.description).ilike(f"%{search}%"),
            )
            statement = statement.where(search_filter)

        if start_date:
            statement = statement.where(AuditLog.timestamp >= start_date)

        if end_date:
            statement = statement.where(AuditLog.timestamp <= end_date)

        return session.exec(statement).one()

    def get_with_user(self, session: Session, *, audit_id: UUID) -> AuditLog | None:
        """Get audit log with user relationship loaded."""
        statement = (
            select(AuditLog)
            .where(AuditLog.id == audit_id)
            .options(selectinload(AuditLog.user))  # type: ignore
        )
        return session.exec(statement).first()

    def get_stats(
        self,
        session: Session,
        *,
        days: int = 30
    ) -> dict[str, Any]:
        """Get audit statistics for the last N days."""
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)

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
            .join(User)
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
            "actions_by_type": {action: count for action, count in action_counts},
            "actions_by_entity": {entity: count for entity, count in entity_counts},
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
            timestamp=datetime.utcnow(),
        )
        session.add(audit_log)
        session.flush()
        return audit_log


audit = CRUDAudit(AuditLog)
