from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, require_admin
from app.core.audit import get_entity_name, log_audit
from app.models import Message, SystemSettingsPublic, SystemSettingsUpdate
from app.services.system_settings import SystemSettingsService

router = APIRouter(prefix="/system-settings", tags=["system-settings"])


@router.get("/", response_model=SystemSettingsPublic)
def get_system_settings(session: SessionDep) -> Any:
    """
    Get current system settings.
    Public endpoint - anyone can view system settings.
    """
    service = SystemSettingsService(session)
    settings = service.get_settings()
    return settings


@router.patch("/", response_model=SystemSettingsPublic, dependencies=[Depends(require_admin)])
def update_system_settings(
    session: SessionDep,
    current_user: CurrentUser,
    settings_in: SystemSettingsUpdate,
) -> Any:
    """
    Update system settings.
    Only admin can update system settings.
    """
    service = SystemSettingsService(session)
    
    # Get current settings for audit log
    old_settings = service.get_settings()
    
    # Update settings
    updated_settings = service.update_settings(settings_in)
    
    # Log audit
    entity_name = get_entity_name("system_settings", updated_settings)
    changes = []
    if settings_in.language is not None and old_settings.language != updated_settings.language:
        changes.append(f"language: {old_settings.language} -> {updated_settings.language}")
    if settings_in.currency is not None and old_settings.currency != updated_settings.currency:
        changes.append(f"currency: {old_settings.currency} -> {updated_settings.currency}")
    
    if changes:
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="system_settings",
            entity_id=str(updated_settings.id),
            entity_name=entity_name,
            changes="; ".join(changes),
        )
    
    session.commit()
    session.refresh(updated_settings)
    return updated_settings

