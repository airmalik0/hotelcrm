"""
Audit service layer for handling audit log operations.
"""
import uuid
from typing import Any

from sqlmodel import Session

from app.crud.audit import audit as crud_audit
from app.models import AuditLogPublic


class AuditService:
    """Service class for handling audit operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.crud = crud_audit

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
        Get audit logs with user information efficiently loaded.

        Returns:
            Tuple of (audit logs with usernames, total count)
        """
        # Apply filters using CRUD methods
        # Note: joinedload should be added to CRUD layer for efficiency
        audit_logs = self.crud.get_multi_with_filters(
            self.session,
            skip=skip,
            limit=limit,
            user_name=user_name,
            action=action,
            entity_type=entity_type,
            search=search,
        )

        # Convert to public model with username from already-loaded relationship
        audit_logs_public = []
        for log in audit_logs:
            username = "Unknown"
            # Check if user relationship is loaded
            if log.user:
                username = log.user.username
            elif log.user_id:
                # Fallback if relationship wasn't loaded (shouldn't happen with joinedload)
                from app.models import User

                user = self.session.get(User, log.user_id)
                if user:
                    username = user.username

            audit_logs_public.append(
                AuditLogPublic(
                    id=log.id,
                    user_id=log.user_id,
                    username=username,
                    action=log.action,
                    entity_type=log.entity_type,
                    entity_id=log.entity_id,
                    entity_name=log.entity_name,
                    description=log.description if log.description else "",
                    old_values=log.old_values,
                    new_values=log.new_values,
                    timestamp=log.timestamp,
                )
            )

        # Get count
        count = self.crud.count_with_filters(
            self.session,
            user_name=user_name,
            action=action,
            entity_type=entity_type,
            search=search,
        )

        return audit_logs_public, count

    def get_audit_log_with_user(self, audit_id: uuid.UUID) -> AuditLogPublic | None:
        """
        Get a single audit log with user information.

        Args:
            audit_id: Audit log ID

        Returns:
            Audit log with username or None if not found
        """
        audit_log = self.crud.get_with_user(self.session, audit_id=audit_id)
        if not audit_log:
            return None

        # Get username from relationship or fetch it
        username = "Unknown"
        if audit_log.user:
            username = audit_log.user.username
        elif audit_log.user_id:
            from app.models import User

            user = self.session.get(User, audit_log.user_id)
            if user:
                username = user.username

        return AuditLogPublic(
            id=audit_log.id,
            user_id=audit_log.user_id,
            username=username,
            action=audit_log.action,
            entity_type=audit_log.entity_type,
            entity_id=audit_log.entity_id,
            entity_name=audit_log.entity_name,
            description=audit_log.description if audit_log.description else "",
            old_values=audit_log.old_values,
            new_values=audit_log.new_values,
            timestamp=audit_log.timestamp,
        )

    def get_audit_stats(self, days: int = 30) -> dict[str, Any]:
        """
        Get audit statistics summary.

        Args:
            days: Number of days to look back

        Returns:
            Dictionary with audit statistics
        """
        stats = self.crud.get_stats(self.session, days=days)

        return {
            "total_logs": stats["total_actions"],
            "by_action": [
                {"action": action, "count": count}
                for action, count in stats["actions_by_type"].items()
            ],
            "by_entity_type": [
                {"entity_type": entity, "count": count}
                for entity, count in stats["actions_by_entity"].items()
            ],
            "top_users": stats["most_active_users"],
        }
