import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import SessionDep, require_admin
from app.models import AuditLogPublic, AuditLogsPublic
from app.services.audit import AuditService

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
    service = AuditService(session)

    # Get audit logs with user info efficiently loaded
    audit_logs_public, count = service.get_audit_logs_with_users(
        skip=skip,
        limit=limit,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        search=search,
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
    service = AuditService(session)

    audit_log = service.get_audit_log_with_user(audit_log_id)
    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    return audit_log


@router.get("/stats/summary", dependencies=[Depends(require_admin)])
def get_audit_stats(
    session: SessionDep,
) -> Any:
    """
    Get audit statistics summary. Only admin can access.
    """
    service = AuditService(session)
    return service.get_audit_stats(days=30)
