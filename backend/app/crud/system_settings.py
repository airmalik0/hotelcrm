from datetime import datetime, timezone

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models import SystemSettings, SystemSettingsUpdate


class CRUDSystemSettings(CRUDBase[SystemSettings, SystemSettingsUpdate, SystemSettingsUpdate]):
    """CRUD operations for system settings (singleton pattern)."""

    def get_or_create_default(self, session: Session) -> SystemSettings:
        """Get system settings or create default if none exists."""
        statement = select(SystemSettings)
        settings = session.exec(statement).first()

        if not settings:
            # Create default settings
            settings = SystemSettings(
                language="en",
                currency="UZS",
            )
            session.add(settings)
            session.flush()
            session.refresh(settings)

        return settings

    def get_settings(self, session: Session) -> SystemSettings:
        """Get system settings (always returns a settings record)."""
        return self.get_or_create_default(session)

    def update_settings(
        self, session: Session, *, obj_in: SystemSettingsUpdate
    ) -> SystemSettings:
        """Update system settings."""
        settings = self.get_or_create_default(session)

        # Update fields
        update_data = obj_in.model_dump(exclude_unset=True)
        if update_data:
            settings.sqlmodel_update(update_data)
            settings.updated_at = datetime.now(timezone.utc)
            session.add(settings)
            session.flush()
            session.refresh(settings)

        return settings


system_settings = CRUDSystemSettings(SystemSettings)

