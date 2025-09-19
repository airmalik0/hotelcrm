"""
Audit service for centralizing audit logging.
"""
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlmodel import Session, func, select

from app.core.audit import get_change_values, get_entity_name, log_audit
from app.models import AuditLog, AuditLogPublic, User


class AuditService:
    """Service for handling audit logging operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session

    def log_create(
        self,
        user: User,
        entity_type: str,
        entity_id: UUID,
        entity_name: str | None = None,
        entity: Any | None = None
    ) -> None:
        """
        Log creation of an entity.

        Args:
            user: User performing the action
            entity_type: Type of entity (e.g., 'customer', 'booking')
            entity_id: UUID of the entity
            entity_name: Optional name for the audit log
            entity: Optional entity object for automatic name extraction
        """
        if not entity_name and entity:
            entity_name = get_entity_name(entity_type, entity)

        log_audit(
            session=self.session,
            user=user,
            action="created",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name or f"{entity_type}#{entity_id}",
        )

    def log_update(
        self,
        user: User,
        entity_type: str,
        entity_id: UUID,
        old_entity: Any,
        update_dict: dict[str, Any],
        entity_name: str | None = None
    ) -> None:
        """
        Log update of an entity.

        Args:
            user: User performing the action
            entity_type: Type of entity
            entity_id: UUID of the entity
            old_entity: Entity before update
            update_dict: Dictionary of updates
            entity_name: Optional name for the audit log
        """
        old_values, new_values = get_change_values(old_entity, update_dict)

        # Only log if there were actual changes
        if old_values:
            if not entity_name:
                entity_name = get_entity_name(entity_type, old_entity)

            log_audit(
                session=self.session,
                user=user,
                action="updated",
                entity_type=entity_type,
                entity_id=entity_id,
                entity_name=entity_name,
                old_values=old_values,
                new_values=new_values,
            )

    def log_delete(
        self,
        user: User,
        entity_type: str,
        entity_id: UUID,
        entity_name: str | None = None,
        entity: Any | None = None
    ) -> None:
        """
        Log deletion of an entity.

        Args:
            user: User performing the action
            entity_type: Type of entity
            entity_id: UUID of the entity
            entity_name: Optional name for the audit log
            entity: Optional entity object for automatic name extraction
        """
        if not entity_name and entity:
            entity_name = get_entity_name(entity_type, entity)

        log_audit(
            session=self.session,
            user=user,
            action="deleted",
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name or f"{entity_type}#{entity_id}",
        )

    def log_custom_action(
        self,
        user: User,
        action: str,
        entity_type: str,
        entity_id: UUID,
        entity_name: str | None = None,
        entity: Any | None = None,
        old_values: dict[str, Any] | None = None,
        new_values: dict[str, Any] | None = None
    ) -> None:
        """
        Log a custom action on an entity.

        Args:
            user: User performing the action
            action: Action name (e.g., 'checked_in', 'cancelled')
            entity_type: Type of entity
            entity_id: UUID of the entity
            entity_name: Optional name for the audit log
            entity: Optional entity object for automatic name extraction
            old_values: Optional old values dict
            new_values: Optional new values dict
        """
        if not entity_name and entity:
            entity_name = get_entity_name(entity_type, entity)

        log_audit(
            session=self.session,
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name or f"{entity_type}#{entity_id}",
            old_values=old_values,
            new_values=new_values,
        )

    def get_audit_logs_with_users(
        self,
        skip: int = 0,
        limit: int = 100,
        user_name: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        search: str | None = None,
    ) -> tuple[list[AuditLogPublic], int]:
        """
        Get audit logs with user information.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            user_name: Filter by username
            action: Filter by action type
            entity_type: Filter by entity type
            search: Search in entity_name

        Returns:
            Tuple of (list of audit logs, total count)
        """
        # Build base query with user join
        statement = (
            select(AuditLog, User)
            .where(AuditLog.user_id == User.id)
            .order_by(AuditLog.timestamp.desc())
        )

        # Apply filters
        if user_name:
            statement = statement.where(User.username.contains(user_name))
        if action:
            statement = statement.where(AuditLog.action == action)
        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)
        if search:
            statement = statement.where(AuditLog.entity_name.contains(search))

        # Get count
        count_statement = select(func.count()).select_from(statement.subquery())
        count = self.session.exec(count_statement).one()

        # Apply pagination
        statement = statement.offset(skip).limit(limit)

        # Execute and format results
        results = self.session.exec(statement).all()
        audit_logs_public = []
        for audit_log, user in results:
            audit_log_public = AuditLogPublic(
                id=audit_log.id,
                user_id=audit_log.user_id,
                user_name=user.username,
                action=audit_log.action,
                entity_type=audit_log.entity_type,
                entity_id=audit_log.entity_id,
                entity_name=audit_log.entity_name,
                description=audit_log.description,
                old_values=audit_log.old_values,
                new_values=audit_log.new_values,
                timestamp=audit_log.timestamp
            )
            audit_logs_public.append(audit_log_public)

        return audit_logs_public, count

    def get_audit_log_with_user(self, audit_log_id: UUID) -> AuditLogPublic | None:
        """
        Get a single audit log with user information.

        Args:
            audit_log_id: UUID of the audit log

        Returns:
            AuditLogPublic or None if not found
        """
        statement = (
            select(AuditLog, User)
            .join(User, AuditLog.user_id == User.id)
            .where(AuditLog.id == audit_log_id)
        )

        result = self.session.exec(statement).first()
        if not result:
            return None

        audit_log, user = result
        return AuditLogPublic(
            id=audit_log.id,
            user_id=audit_log.user_id,
            user_name=user.username,
            action=audit_log.action,
            entity_type=audit_log.entity_type,
            entity_id=audit_log.entity_id,
            entity_name=audit_log.entity_name,
            description=audit_log.description,
            old_values=audit_log.old_values,
            new_values=audit_log.new_values,
            timestamp=audit_log.timestamp
        )

    def get_audit_stats(self, days: int = 30) -> dict[str, Any]:
        """
        Get audit statistics for the specified period.

        Args:
            days: Number of days to look back

        Returns:
            Dictionary with statistics
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        # Get action counts
        action_stats = self.session.exec(
            select(AuditLog.action, func.count(AuditLog.id))
            .where(AuditLog.timestamp >= cutoff_date)
            .group_by(AuditLog.action)
        ).all()

        # Get entity type counts
        entity_stats = self.session.exec(
            select(AuditLog.entity_type, func.count(AuditLog.id))
            .where(AuditLog.timestamp >= cutoff_date)
            .group_by(AuditLog.entity_type)
        ).all()

        # Get top users
        user_stats = self.session.exec(
            select(User.username, func.count(AuditLog.id))
            .join(User, AuditLog.user_id == User.id)
            .where(AuditLog.timestamp >= cutoff_date)
            .group_by(User.username)
            .order_by(func.count(AuditLog.id).desc())
            .limit(10)
        ).all()

        # Get total count
        total_count = self.session.exec(
            select(func.count(AuditLog.id))
            .where(AuditLog.timestamp >= cutoff_date)
        ).one()

        return {
            "period_days": days,
            "total_actions": total_count,
            "actions_by_type": dict(action_stats),
            "actions_by_entity": dict(entity_stats),
            "top_users": dict(user_stats),
        }
