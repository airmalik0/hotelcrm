import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.core.rbac import check_admin_only
from app.crud.audit import audit as crud_audit
from app.models import AuditLogPublic, AuditLogsPublic

router = APIRouter()


@router.get("/", response_model=AuditLogsPublic)
def read_audit_logs(
    session: SessionDep,
    current_user: CurrentUser,
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
    check_admin_only(current_user)

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
    for log in audit_logs:
        log_dict = log.model_dump()
        log_dict['username'] = log.user.username if log.user else 'Unknown'
        audit_logs_public.append(AuditLogPublic(**log_dict))

    # Count total records with same filters using CRUD
    count = crud_audit.count_with_filters(
        session,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        search=search
    )

    return AuditLogsPublic(data=audit_logs_public, count=count)


@router.get("/{audit_log_id}", response_model=AuditLogPublic)
def read_audit_log(
    session: SessionDep,
    current_user: CurrentUser,
    audit_log_id: uuid.UUID,
) -> Any:
    """
    Get audit log by ID. Only admin can access.
    """
    check_admin_only(current_user)

    audit_log = crud_audit.get_with_user(session, audit_id=audit_log_id)
    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    # Convert to public model with username
    log_dict = audit_log.model_dump()
    log_dict['username'] = audit_log.user.username if audit_log.user else 'Unknown'
    return AuditLogPublic(**log_dict)


@router.get("/stats/summary")
def get_audit_stats(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get audit statistics summary. Only admin can access.
    """
    check_admin_only(current_user)

    # Get audit statistics using CRUD
    stats = crud_audit.get_stats(session, days=30)

    return {
        "total_logs": stats["total_actions"],
        "by_action": [{"action": action, "count": count} for action, count in stats["actions_by_type"].items()],
        "by_entity_type": [{"entity_type": entity, "count": count} for entity, count in stats["actions_by_entity"].items()],
        "top_users": stats["most_active_users"],
    }
