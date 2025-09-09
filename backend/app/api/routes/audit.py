import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, require_admin
from app.crud.audit import audit as crud_audit
from app.models import AuditLogPublic, AuditLogsPublic

router = APIRouter()


@router.get("/", response_model=AuditLogsPublic, dependencies=[Depends(require_admin)])
def read_audit_logs(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    user_name: str | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    search: str | None = None,
) -> Any:
    """
    Retrieve audit logs. Only admin can access.
    """

    # Get audit logs with filters using CRUD
    audit_logs = crud_audit.get_multi_with_filters(
        session,
        skip=skip,
        limit=limit,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        search=search
    )

    # Convert to public model with username from relationship
    audit_logs_public = []
    from app.models import User

    for log in audit_logs:
        # Get username - relationship might not be loaded
        username = 'Unknown'
        if log.user_id:
            user = session.get(User, log.user_id)
            if user:
                username = user.username

        audit_logs_public.append(AuditLogPublic(
            id=log.id,
            user_id=log.user_id,
            username=username,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            entity_name=log.entity_name,
            description=log.description if log.description else '',
            old_values=log.old_values,
            new_values=log.new_values,
            timestamp=log.timestamp
        ))

    # Count total records with same filters using CRUD
    count = crud_audit.count_with_filters(
        session,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        search=search
    )

    return AuditLogsPublic(data=audit_logs_public, count=count)


@router.get("/{audit_log_id}", response_model=AuditLogPublic, dependencies=[Depends(require_admin)])
def read_audit_log(
    session: SessionDep,
    audit_log_id: uuid.UUID,
) -> Any:
    """
    Get audit log by ID. Only admin can access.
    """

    audit_log = crud_audit.get_with_user(session, audit_id=audit_log_id)
    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    # Convert to public model with username
    username = 'Unknown'
    if audit_log.user_id:
        from app.models import User
        user = session.get(User, audit_log.user_id)
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
        description=audit_log.description if audit_log.description else '',
        old_values=audit_log.old_values,
        new_values=audit_log.new_values,
        timestamp=audit_log.timestamp
    )


@router.get("/stats/summary", dependencies=[Depends(require_admin)])
def get_audit_stats(
    session: SessionDep,
) -> Any:
    """
    Get audit statistics summary. Only admin can access.
    """

    # Get audit statistics using CRUD
    stats = crud_audit.get_stats(session, days=30)

    return {
        "total_logs": stats["total_actions"],
        "by_action": [{"action": action, "count": count} for action, count in stats["actions_by_type"].items()],
        "by_entity_type": [{"entity_type": entity, "count": count} for entity, count in stats["actions_by_entity"].items()],
        "top_users": stats["most_active_users"],
    }
