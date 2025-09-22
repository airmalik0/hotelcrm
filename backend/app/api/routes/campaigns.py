import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.rate_limit import RateLimits, limiter
from app.crud.campaigns import campaigns as crud_campaigns
from app.models import (
    CampaignCreate,
    CampaignExecutionRequest,
    CampaignExecutionResponse,
    CampaignPublic,
    CampaignsPublic,
    CampaignStatus,
    CampaignType,
    CampaignUpdate,
    CustomerPreviewResponse,
    Message,
    SMSHistoryList,
    TriggerCheckResponse,
)
from app.services.campaigns import CampaignService

router = APIRouter()


@router.get("/", response_model=CampaignsPublic)
@limiter.limit(RateLimits.READ_LIST)
def read_campaigns(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
    status: CampaignStatus | None = None,
    campaign_type: CampaignType | None = None,
    search: str | None = None,
) -> Any:
    """
    Retrieve campaigns with filtering.
    """
    campaigns = crud_campaigns.get_multi_filtered(
        session,
        skip=skip,
        limit=limit,
        status=status,
        campaign_type=campaign_type,
        search=search
    )
    count = crud_campaigns.count_filtered(
        session,
        status=status,
        campaign_type=campaign_type,
        search=search
    )
    return CampaignsPublic(data=campaigns, count=count)


@router.get("/{campaign_id}", response_model=CampaignPublic)
def read_campaign(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    campaign_id: uuid.UUID,
) -> Any:
    """
    Get campaign by ID with statistics.
    """
    service = CampaignService(session)
    return service.get_campaign_or_404(campaign_id)


@router.post("/", response_model=CampaignPublic)
@limiter.limit(RateLimits.BOOKING_CREATE)  # Reuse booking rate limit
def create_campaign(
    *,
    request: Request,  # noqa: ARG001
    session: SessionDep,
    current_user: CurrentUser,
    campaign_in: CampaignCreate,
) -> Any:
    """
    Create new campaign.
    """
    service = CampaignService(session)

    campaign = service.create_campaign(campaign_in)

    # Log audit
    entity_name = get_entity_name("campaign", campaign)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="campaign",
        entity_id=campaign.id,
        entity_name=entity_name,
    )

    # Commit everything
    session.commit()

    # Return campaign with fresh data
    return crud_campaigns.get_with_stats(session, campaign_id=campaign.id)


@router.put("/{campaign_id}", response_model=CampaignPublic)
def update_campaign(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    campaign_id: uuid.UUID,
    campaign_in: CampaignUpdate,
) -> Any:
    """
    Update a campaign.
    """
    service = CampaignService(session)
    campaign = service.get_campaign_or_404(campaign_id)

    # Get old values for audit
    update_dict = campaign_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(campaign, update_dict)

    # Update campaign
    campaign = service.update_campaign(campaign, campaign_in)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("campaign", campaign)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="campaign",
            entity_id=campaign.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    session.commit()

    # Return updated campaign with fresh stats
    return crud_campaigns.get_with_stats(session, campaign_id=campaign.id)


@router.delete("/{campaign_id}", response_model=Message, dependencies=[Depends(require_admin_or_manager)])
def delete_campaign(
    session: SessionDep,
    current_user: CurrentUser,
    campaign_id: uuid.UUID,
) -> Any:
    """
    Delete a campaign. Requires admin or manager role.
    """
    service = CampaignService(session)
    campaign = service.get_campaign_or_404(campaign_id)

    # Log audit before deletion
    entity_name = get_entity_name("campaign", campaign)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="campaign",
        entity_id=campaign.id,
        entity_name=entity_name,
    )

    # Use service to handle deletion properly
    service.delete_campaign(campaign)
    session.commit()

    return Message(message="Campaign deleted successfully")


# Specialized campaign operations (following booking's specialized endpoints pattern)

@router.post("/{campaign_id}/execute", response_model=CampaignExecutionResponse)
@limiter.limit(RateLimits.BOOKING_CREATE)  # Reuse booking rate limit for execution
def execute_campaign(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    campaign_id: uuid.UUID,
    request: CampaignExecutionRequest,
) -> Any:
    """
    Execute a one-time campaign immediately.
    Available to admin and manager roles.
    """
    service = CampaignService(session)
    campaign = service.get_campaign_or_404(campaign_id)

    # Execute campaign
    result = service.execute_onetime_campaign(campaign, test_mode=request.test_mode)

    # Log audit
    entity_name = get_entity_name("campaign", campaign)
    log_audit(
        session=session,
        user=current_user,
        action="executed",
        entity_type="campaign",
        entity_id=campaign.id,
        entity_name=entity_name,
        new_values={
            "customers_matched": result["customers_matched"],
            "sms_sent": result["sms_sent"],
            "sms_failed": result["sms_failed"],
            "test_mode": result["test_mode"]
        },
    )

    session.commit()

    return CampaignExecutionResponse(**result)


@router.get("/{campaign_id}/preview", response_model=CustomerPreviewResponse)
def preview_campaign_recipients(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    campaign_id: uuid.UUID,
) -> Any:
    """
    Preview customers who would receive SMS from this campaign.
    """
    service = CampaignService(session)
    campaign = service.get_campaign_or_404(campaign_id)

    preview_data = service.preview_campaign_recipients(campaign)

    return CustomerPreviewResponse(**preview_data)


@router.post("/check-triggers", response_model=TriggerCheckResponse, dependencies=[Depends(require_admin_or_manager)])
def check_triggers(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
) -> Any:
    """
    Check all active trigger campaigns and execute for new matching customers.
    This endpoint requires admin or manager authentication.
    Can be called manually or by authenticated cron job.
    """
    service = CampaignService(session)
    result = service.check_trigger_campaigns()

    session.commit()

    return TriggerCheckResponse(**result)


# SMS History endpoints (following audit pattern)

@router.get("/{campaign_id}/sms-history", response_model=SMSHistoryList)
def get_campaign_sms_history(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    campaign_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get SMS history for a specific campaign.
    """
    from app.crud.campaigns import sms_history as crud_sms_history

    service = CampaignService(session)
    # Verify campaign exists
    service.get_campaign_or_404(campaign_id)

    # Get SMS history
    sms_records = crud_sms_history.get_by_campaign(
        session,
        campaign_id=campaign_id,
        skip=skip,
        limit=limit
    )

    count = crud_sms_history.count_by_campaign(session, campaign_id=campaign_id)

    # Convert to public format
    from app.models import SMSHistoryList, SMSHistoryPublic

    public_records = [SMSHistoryPublic.model_validate(record) for record in sms_records]

    return SMSHistoryList(data=public_records, count=count)
