"""API routes for customer inquiries"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlmodel import SQLModel, select

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.customer_inquiry import customer_inquiry as crud_inquiry
from app.models import (
    BotSession,
    CustomerInquiriesPublic,
    CustomerInquiryCreate,
    CustomerInquiryPublic,
    CustomerInquiryUpdate,
    InquiryStatus,
)
from app.services.customer_inquiry import CustomerInquiryService

router = APIRouter()


@router.get("/", response_model=CustomerInquiriesPublic, dependencies=[Depends(require_admin_or_manager)])
def read_inquiries(
    session: SessionDep,
    skip: int = 0,
    limit: int = 100,
    status: InquiryStatus | None = None,
    customer_id: uuid.UUID | None = None,
    customers_only: bool | None = None,
) -> Any:
    """Retrieve customer inquiries (admin/manager only)"""
    inquiries = crud_inquiry.get_multi_filtered(
        session, skip=skip, limit=limit, status=status, customer_id=customer_id, customers_only=customers_only
    )
    count = crud_inquiry.count_filtered(session, status=status, customer_id=customer_id, customers_only=customers_only)

    # Enrich with related data
    inquiry_publics = []
    for inquiry in inquiries:
        inquiry_public = CustomerInquiryPublic.model_validate(inquiry)

        # Bot user data
        if inquiry.bot_user:
            inquiry_public.bot_user_name = inquiry.bot_user.name
            inquiry_public.bot_user_phone = inquiry.bot_user.phone

            # Get most recent session for Telegram metadata
            stmt = select(BotSession).where(BotSession.bot_user_id == inquiry.bot_user.id).order_by(BotSession.last_active_at.desc()).limit(1)  # type: ignore[attr-defined]
            recent_session = session.exec(stmt).first()
            if recent_session:
                inquiry_public.telegram_username = recent_session.username
                inquiry_public.telegram_first_name = recent_session.first_name

        # Customer data
        if inquiry.customer:
            inquiry_public.customer_name = f"{inquiry.customer.first_name} {inquiry.customer.last_name}"
            inquiry_public.customer_phone = inquiry.customer.phone
            inquiry_public.has_customer = True

        inquiry_publics.append(inquiry_public)

    return CustomerInquiriesPublic(data=inquiry_publics, count=count)


@router.post("/", response_model=CustomerInquiryPublic)
def create_inquiry_api(
    session: SessionDep,
    current_user: CurrentUser,
    inquiry_in: CustomerInquiryCreate,
) -> Any:
    """Create inquiry via standard user-authenticated API."""
    service = CustomerInquiryService(session)
    inquiry = service.create_inquiry(inquiry_in)

    # Log audit
    entity_name = get_entity_name("customer_inquiry", inquiry)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="customer_inquiry",
        entity_id=inquiry.id,
        entity_name=entity_name,
    )

    session.commit()
    session.refresh(inquiry)
    return inquiry


@router.get("/{inquiry_id}", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def read_inquiry(session: SessionDep, inquiry_id: uuid.UUID) -> Any:
    """Get inquiry by ID (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry = service.get_inquiry_or_404(inquiry_id)

    inquiry_public = CustomerInquiryPublic.model_validate(inquiry)

    # Bot user data
    if inquiry.bot_user:
        inquiry_public.bot_user_name = inquiry.bot_user.name
        inquiry_public.bot_user_phone = inquiry.bot_user.phone

        # Get most recent session for Telegram metadata
        stmt = select(BotSession).where(BotSession.bot_user_id == inquiry.bot_user.id).order_by(BotSession.last_active_at.desc()).limit(1)  # type: ignore[attr-defined]
        recent_session = session.exec(stmt).first()
        if recent_session:
            inquiry_public.telegram_username = recent_session.username
            inquiry_public.telegram_first_name = recent_session.first_name

    # Customer data
    if inquiry.customer:
        inquiry_public.customer_name = f"{inquiry.customer.first_name} {inquiry.customer.last_name}"
        inquiry_public.customer_phone = inquiry.customer.phone
        inquiry_public.has_customer = True

    return inquiry_public


@router.patch("/{inquiry_id}", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def update_inquiry(
    session: SessionDep,
    current_user: CurrentUser,
    inquiry_id: uuid.UUID,
    inquiry_in: CustomerInquiryUpdate,
) -> Any:
    """Update inquiry (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry = service.get_inquiry_or_404(inquiry_id)

    # Get old and new values for audit
    update_dict = inquiry_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(inquiry, update_dict)

    inquiry = service.update_inquiry(inquiry_id, inquiry_in)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("customer_inquiry", inquiry)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="customer_inquiry",
            entity_id=inquiry.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    session.commit()
    session.refresh(inquiry)
    return inquiry


class ResolveInquiryRequest(SQLModel):
    """Request body for resolving inquiry"""
    resolution_notes: str


@router.post("/{inquiry_id}/resolve", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def resolve_inquiry(
    session: SessionDep,
    current_user: CurrentUser,
    inquiry_id: uuid.UUID,
    request: ResolveInquiryRequest,
) -> Any:
    """Mark inquiry as resolved (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry = service.update_inquiry_status(inquiry_id, InquiryStatus.RESOLVED)

    if request.resolution_notes:
        inquiry.resolution_notes = request.resolution_notes
        session.add(inquiry)

    # Log audit
    entity_name = get_entity_name("customer_inquiry", inquiry)
    log_audit(
        session=session,
        user=current_user,
        action="resolved",
        entity_type="customer_inquiry",
        entity_id=inquiry.id,
        entity_name=entity_name,
        new_values={"resolution_notes": request.resolution_notes} if request.resolution_notes else None,
    )

    session.commit()
    session.refresh(inquiry)
    return inquiry
