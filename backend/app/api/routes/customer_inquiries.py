"""API routes for customer inquiries"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, require_admin_or_manager
from app.crud.customer_inquiry import customer_inquiry as crud_inquiry
from app.models import (
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
) -> Any:
    """Retrieve customer inquiries (admin/manager only)"""
    inquiries = crud_inquiry.get_multi_filtered(
        session, skip=skip, limit=limit, status=status, customer_id=customer_id
    )
    count = crud_inquiry.count_filtered(session, status=status, customer_id=customer_id)

    # Enrich with related data
    inquiry_publics = []
    for inquiry in inquiries:
        inquiry_public = CustomerInquiryPublic.model_validate(inquiry)
        # Add bot user name
        if inquiry.bot_user:
            inquiry_public.bot_user_name = f"{inquiry.bot_user.name} {inquiry.bot_user.surname or ''}".strip()
        # Add customer name
        if inquiry.customer:
            inquiry_public.customer_name = f"{inquiry.customer.first_name} {inquiry.customer.last_name}"
        # Add assigned user name
        if inquiry.assigned_user:
            inquiry_public.assigned_user_name = inquiry.assigned_user.username
        inquiry_publics.append(inquiry_public)

    return CustomerInquiriesPublic(data=inquiry_publics, count=count)


@router.post("/", response_model=CustomerInquiryPublic)
def create_inquiry_api(
    session: SessionDep,
    _current_user: CurrentUser,
    inquiry_in: CustomerInquiryCreate,
) -> Any:
    """Create inquiry via standard user-authenticated API."""
    service = CustomerInquiryService(session)
    inquiry = service.create_inquiry(inquiry_in)
    session.commit()
    session.refresh(inquiry)
    return inquiry


@router.get("/{inquiry_id}", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def read_inquiry(session: SessionDep, inquiry_id: uuid.UUID) -> Any:
    """Get inquiry by ID (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry = service.get_inquiry_or_404(inquiry_id)

    inquiry_public = CustomerInquiryPublic.model_validate(inquiry)
    # Enrich with related data
    if inquiry.bot_user:
        inquiry_public.bot_user_name = f"{inquiry.bot_user.name} {inquiry.bot_user.surname or ''}".strip()
    if inquiry.customer:
        inquiry_public.customer_name = f"{inquiry.customer.first_name} {inquiry.customer.last_name}"
    if inquiry.assigned_user:
        inquiry_public.assigned_user_name = inquiry.assigned_user.username

    return inquiry_public


@router.patch("/{inquiry_id}", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def update_inquiry(
    session: SessionDep,
    _current_user: CurrentUser,
    inquiry_id: uuid.UUID,
    inquiry_in: CustomerInquiryUpdate,
) -> Any:
    """Update inquiry (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry = service.update_inquiry(inquiry_id, inquiry_in)
    session.commit()
    session.refresh(inquiry)
    return inquiry


@router.post("/{inquiry_id}/assign", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def assign_inquiry(
    session: SessionDep,
    _current_user: CurrentUser,
    inquiry_id: uuid.UUID,
    assigned_to: uuid.UUID,
) -> Any:
    """Assign inquiry to a user (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry_in = CustomerInquiryUpdate(assigned_to=assigned_to, status=InquiryStatus.IN_PROGRESS)
    inquiry = service.update_inquiry(inquiry_id, inquiry_in)
    session.commit()
    session.refresh(inquiry)
    return inquiry


@router.post("/{inquiry_id}/resolve", response_model=CustomerInquiryPublic, dependencies=[Depends(require_admin_or_manager)])
def resolve_inquiry(
    session: SessionDep,
    _current_user: CurrentUser,
    inquiry_id: uuid.UUID,
    resolution_notes: str | None = None,
) -> Any:
    """Mark inquiry as resolved (admin/manager only)"""
    service = CustomerInquiryService(session)
    inquiry = service.update_inquiry_status(inquiry_id, InquiryStatus.RESOLVED)

    if resolution_notes:
        inquiry.resolution_notes = resolution_notes
        session.add(inquiry)

    session.commit()
    session.refresh(inquiry)
    return inquiry
