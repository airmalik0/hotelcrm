"""
System settings service layer for managing global application settings.
"""
from sqlmodel import Session

from app.crud.system_settings import system_settings as crud_settings
from app.models import SystemSettings, SystemSettingsUpdate


class SystemSettingsService:
    """Service class for handling system settings operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.crud = crud_settings

    def get_settings(self) -> SystemSettings:
        """
        Get system settings (always returns settings, creates default if needed).

        Returns:
            System settings
        """
        return self.crud.get_settings(self.session)

    def update_settings(self, settings_in: SystemSettingsUpdate) -> SystemSettings:
        """
        Update system settings.

        Args:
            settings_in: Settings update data

        Returns:
            Updated system settings
        """
        return self.crud.update_settings(self.session, obj_in=settings_in)

