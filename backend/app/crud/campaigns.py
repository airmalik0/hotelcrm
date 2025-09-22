from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import joinedload
from sqlmodel import Session, and_, func, select

from app.crud.base import CRUDBase
from app.models import (
    Campaign,
    CampaignCreate,
    CampaignStatus,
    CampaignType,
    CampaignUpdate,
    SMSHistory,
    SMSStatus,
)


class CRUDCampaign(CRUDBase[Campaign, CampaignCreate, CampaignUpdate]):
    def get_with_stats(self, session: Session, *, campaign_id: UUID) -> Campaign | None:
        """Get campaign with SMS statistics calculated."""
        statement = select(Campaign).where(Campaign.id == campaign_id)
        campaign = session.exec(statement).first()

        if campaign:
            # Update statistics from SMS history
            campaign.update_stats()

        return campaign

    def get_multi_filtered(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: CampaignStatus | None = None,
        campaign_type: CampaignType | None = None,
        search: str | None = None
    ) -> list[Campaign]:
        """Get campaigns with filtering and search capabilities."""
        statement = select(Campaign)

        # Apply filters
        if status:
            statement = statement.where(Campaign.status == status)

        if campaign_type:
            statement = statement.where(Campaign.type == campaign_type)

        if search:
            # Search in campaign name and message template
            search_term = f"%{search.lower()}%"
            statement = statement.where(
                Campaign.name.ilike(search_term) |  # type: ignore
                Campaign.message_template.ilike(search_term)  # type: ignore
            )

        # Order by most recently updated first
        statement = statement.order_by(Campaign.updated_at.desc())
        statement = statement.offset(skip).limit(limit)

        return list(session.exec(statement).all())

    def count_filtered(
        self,
        session: Session,
        *,
        status: CampaignStatus | None = None,
        campaign_type: CampaignType | None = None,
        search: str | None = None
    ) -> int:
        """Count campaigns with filters applied."""
        statement = select(func.count()).select_from(Campaign)

        # Apply same filters as get_multi_filtered
        if status:
            statement = statement.where(Campaign.status == status)

        if campaign_type:
            statement = statement.where(Campaign.type == campaign_type)

        if search:
            search_term = f"%{search.lower()}%"
            statement = statement.where(
                Campaign.name.ilike(search_term) |  # type: ignore
                Campaign.message_template.ilike(search_term)  # type: ignore
            )

        return session.exec(statement).one()

    def get_active_triggers(self, session: Session) -> list[Campaign]:
        """Get all active trigger campaigns for cron processing."""
        statement = select(Campaign).where(
            and_(
                Campaign.type == CampaignType.TRIGGER,
                Campaign.status == CampaignStatus.ACTIVE
            )
        ).order_by(Campaign.last_executed_at.asc().nulls_first())

        return list(session.exec(statement).all())

    def get_campaigns_with_stats(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> list[Campaign]:
        """Get campaigns with their SMS statistics loaded."""
        statement = (
            select(Campaign)
            .options(joinedload(Campaign.sms_history))  # type: ignore[arg-type]
            .order_by(Campaign.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )

        campaigns = list(session.exec(statement).all())

        # Update statistics for each campaign
        for campaign in campaigns:
            campaign.update_stats()

        return campaigns

    def get_by_name(self, session: Session, *, name: str) -> Campaign | None:
        """Get campaign by name for duplicate checking."""
        statement = select(Campaign).where(Campaign.name == name)
        return session.exec(statement).first()

    def update_execution_stats(
        self,
        session: Session,
        *,
        campaign: Campaign,
        sms_sent: int = 0,
        sms_failed: int = 0
    ) -> Campaign:
        """Update campaign execution statistics."""
        campaign.last_executed_at = datetime.now(timezone.utc)
        campaign.total_sent += sms_sent
        campaign.total_failed += sms_failed

        session.add(campaign)
        session.flush()
        return campaign

    def get_campaigns_by_status(
        self,
        session: Session,
        *,
        status: CampaignStatus,
        limit: int = 100
    ) -> list[Campaign]:
        """Get campaigns by status, useful for batch operations."""
        statement = (
            select(Campaign)
            .where(Campaign.status == status)
            .order_by(Campaign.created_at.desc())
            .limit(limit)
        )

        return list(session.exec(statement).all())


class CRUDSMSHistory(CRUDBase[SMSHistory, dict, dict]):  # Using dict for Create/Update as we create via service
    def get_by_campaign(
        self,
        session: Session,
        *,
        campaign_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: SMSStatus | None = None
    ) -> list[SMSHistory]:
        """Get SMS history for a specific campaign."""
        statement = select(SMSHistory).where(SMSHistory.campaign_id == campaign_id)

        if status:
            statement = statement.where(SMSHistory.status == status)

        statement = statement.order_by(SMSHistory.sent_at.desc())
        statement = statement.offset(skip).limit(limit)

        return list(session.exec(statement).all())

    def count_by_campaign(
        self,
        session: Session,
        *,
        campaign_id: UUID,
        status: SMSStatus | None = None
    ) -> int:
        """Count SMS history records for a campaign."""
        statement = select(func.count()).select_from(SMSHistory).where(
            SMSHistory.campaign_id == campaign_id
        )

        if status:
            statement = statement.where(SMSHistory.status == status)

        return session.exec(statement).one()

    def get_by_customer(
        self,
        session: Session,
        *,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> list[SMSHistory]:
        """Get SMS history for a specific customer."""
        statement = (
            select(SMSHistory)
            .where(SMSHistory.customer_id == customer_id)
            .order_by(SMSHistory.sent_at.desc())
            .offset(skip)
            .limit(limit)
        )

        return list(session.exec(statement).all())

    def get_campaign_recipients(
        self,
        session: Session,
        *,
        campaign_id: UUID
    ) -> list[UUID]:
        """Get list of customer IDs who received SMS from this campaign."""
        statement = select(SMSHistory.customer_id).where(
            SMSHistory.campaign_id == campaign_id
        ).distinct()

        return list(session.exec(statement).all())

    def get_recent_sms(
        self,
        session: Session,
        *,
        hours: int = 24,
        limit: int = 100
    ) -> list[SMSHistory]:
        """Get recent SMS history for monitoring/dashboard."""
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)

        statement = (
            select(SMSHistory)
            .where(SMSHistory.sent_at >= cutoff_time)
            .order_by(SMSHistory.sent_at.desc())
            .limit(limit)
        )

        return list(session.exec(statement).all())

    def get_failed_sms(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> list[SMSHistory]:
        """Get failed SMS records for troubleshooting."""
        statement = (
            select(SMSHistory)
            .where(SMSHistory.status == SMSStatus.FAILED)
            .order_by(SMSHistory.sent_at.desc())
            .offset(skip)
            .limit(limit)
        )

        return list(session.exec(statement).all())

    def delete_by_campaign(self, session: Session, *, campaign_id: UUID) -> int:
        """Delete all SMS history for a campaign (for campaign deletion)."""
        statement = select(SMSHistory).where(SMSHistory.campaign_id == campaign_id)
        sms_records = session.exec(statement).all()

        count = len(sms_records)
        for record in sms_records:
            session.delete(record)

        session.flush()
        return count


# Create instances
campaigns = CRUDCampaign(Campaign)
sms_history = CRUDSMSHistory(SMSHistory)
