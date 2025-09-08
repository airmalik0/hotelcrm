import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import col, func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.core.rbac import check_admin_only
from app.models import AuditLog, AuditLogPublic, AuditLogsPublic, User

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

    # Always eager load the user relationship for displaying username
    statement = select(AuditLog).options(selectinload(AuditLog.user))  # type: ignore

    # Join with User table if we need to filter or search by username
    if user_name or search:
        statement = statement.join(User)
    # Apply filters
    if user_name:
        statement = statement.where(col(User.username).ilike(f"%{user_name}%"))
    if action:
        statement = statement.where(AuditLog.action == action)
    if entity_type:
        statement = statement.where(AuditLog.entity_type == entity_type)
    if search:
        # Include username in search if User table is joined
        search_filter = or_(
            col(User.username).ilike(f"%{search}%"),
            col(AuditLog.description).ilike(f"%{search}%"),
            col(AuditLog.entity_name).ilike(f"%{search}%"),
        )
        statement = statement.where(search_filter)

    # Order by timestamp descending (newest first)
    statement = statement.order_by(col(AuditLog.timestamp).desc())
    statement = statement.offset(skip).limit(limit)
    audit_logs = session.exec(statement).all()

    # Convert to public model with username from relationship
    audit_logs_public = []
    for log in audit_logs:
        log_dict = log.model_dump()
        log_dict['username'] = log.user.username if log.user else 'Unknown'
        audit_logs_public.append(AuditLogPublic(**log_dict))

    # Count total records with same filters
    count_statement = select(func.count()).select_from(AuditLog)

    # Join with User table if we need to filter or search by username
    if user_name or search:
        count_statement = count_statement.join(User)

    if user_name:
        count_statement = count_statement.where(col(User.username).ilike(f"%{user_name}%"))
    if action:
        count_statement = count_statement.where(AuditLog.action == action)
    if entity_type:
        count_statement = count_statement.where(AuditLog.entity_type == entity_type)
    if search:
        # Include username in search if User table is joined
        search_filter_count = or_(
            col(User.username).ilike(f"%{search}%"),
            col(AuditLog.description).ilike(f"%{search}%"),
            col(AuditLog.entity_name).ilike(f"%{search}%"),
        )
        count_statement = count_statement.where(search_filter_count)

    count = session.exec(count_statement).one()

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

    statement = select(AuditLog).where(AuditLog.id == audit_log_id).options(selectinload(AuditLog.user))  # type: ignore
    audit_log = session.exec(statement).first()
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

    # Get counts by action
    action_stats = session.exec(
        select(AuditLog.action, func.count().label("count"))
        .group_by(AuditLog.action)
        .order_by(func.count().desc())
    ).all()

    # Get counts by entity type
    entity_stats = session.exec(
        select(AuditLog.entity_type, func.count().label("count"))
        .group_by(AuditLog.entity_type)
        .order_by(func.count().desc())
    ).all()

    # Get counts by user (join with User table to get username)
    user_stats = session.exec(
        select(User.username, func.count().label("count"))
        .select_from(AuditLog)
        .join(User)
        .group_by(User.username)
        .order_by(func.count().desc())
        .limit(10)  # Top 10 most active users
    ).all()

    return {
        "total_logs": session.exec(select(func.count()).select_from(AuditLog)).first(),
        "by_action": [{"action": row[0], "count": row[1]} for row in action_stats],
        "by_entity_type": [{"entity_type": row[0], "count": row[1]} for row in entity_stats],
        "top_users": [{"username": row[0], "count": row[1]} for row in user_stats],
    }
