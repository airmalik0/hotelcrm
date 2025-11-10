from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Form, Header, HTTPException, Request

from app.api.deps import SessionDep
from app.core.config import settings
from app.crud.campaigns import sms_history as crud_sms_history
from app.models import Campaign, SMSStatus

router = APIRouter()


def _map_provider_status(status: str) -> SMSStatus:
    s = (status or "").upper()
    if s in {"STORED", "ACCEPTED"}:
        return SMSStatus.SENT
    if s == "DELIVERED":
        return SMSStatus.DELIVERED
    if s in {"REJECTED", "FAILED", "EXPIRED"}:
        return SMSStatus.FAILED
    return SMSStatus.PENDING


@router.post("/eskiz", include_in_schema=False)
def eskiz_webhook(
    request: Request,  # noqa: ARG001
    session: SessionDep,
    # Eskiz sends form-urlencoded - unused parameters accepted to match webhook signature
    callback_url: str | None = Form(default=None),  # noqa: ARG001
    country: str | None = Form(default=None),  # noqa: ARG001
    message_id: str | None = Form(default=None),
    phone_number: str | None = Form(default=None),  # noqa: ARG001
    request_id: str | None = Form(default=None),  # noqa: ARG001
    sms_count: str | None = Form(default=None),  # noqa: ARG001
    status: str | None = Form(default=None),
    status_date: str | None = Form(default=None),
    user_sms_id: str | None = Form(default=None),
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> dict[str, Any]:
    # Basic secret validation (optional)
    if settings.ESKIZ_WEBHOOK_SECRET:
        if not x_webhook_secret or x_webhook_secret != settings.ESKIZ_WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    record = None
    # Prefer user_sms_id
    if user_sms_id:
        record = crud_sms_history.get_by_user_sms_id(session, user_sms_id=user_sms_id)
    if not record and message_id:
        record = crud_sms_history.get_by_provider_message_id(session, provider_message_id=message_id)
    if not record:
        # Accept but do nothing to avoid retries storm; log could be added
        return {"ok": True, "matched": False}

    # Map status
    mapped = _map_provider_status(status or "")
    old_status = record.status
    record.provider_status = (status or "").upper()
    record.status = mapped
    if mapped == SMSStatus.DELIVERED and status_date:
        try:
            # Eskiz passes 'YYYY-MM-DD HH:MM:SS'
            dt = datetime.strptime(status_date, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            record.delivered_at = dt
        except Exception:
            pass

    # Update campaign statistics if status changed
    if old_status != mapped:
        campaign = session.get(Campaign, record.campaign_id)
        if campaign:
            if old_status == SMSStatus.DELIVERED and campaign.total_delivered > 0:
                campaign.total_delivered -= 1
            if old_status == SMSStatus.FAILED and campaign.total_failed > 0:
                campaign.total_failed -= 1

            if mapped == SMSStatus.DELIVERED:
                campaign.total_delivered += 1
            elif mapped == SMSStatus.FAILED:
                campaign.total_failed += 1

            campaign.updated_at = datetime.now(timezone.utc)
            session.add(campaign)

    session.add(record)
    session.commit()

    return {"ok": True, "matched": True}


