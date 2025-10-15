"""Bot-facing endpoints authenticated via Telegram Bot Token header.

Header: X-Telegram-Bot-Token: <token>
"""
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import SessionDep, telegram_bot_auth
from app.crud.bot_user import bot_user as crud_bot_user
from app.models import (
    BotUserCreate,
    BotUserPublic,
    BotUsersPublic,
    BotUserUpdate,
    CustomerInquiryCreate,
    CustomerInquiryPublic,
)
from app.services.bot_user import BotUserService
from app.services.customer_inquiry import CustomerInquiryService


# Response models
class BotUserWithContext(BaseModel):
    """Bot user with generated context for AI"""
    user: BotUserPublic
    context: dict[str, Any]


class CustomerIdResponse(BaseModel):
    """Customer ID lookup response"""
    customer_id: str | None
    found: bool


router = APIRouter(tags=["bot"], dependencies=[Depends(telegram_bot_auth)])


@router.post("/users/upsert", response_model=BotUserPublic)
def upsert_bot_user(session: SessionDep, bot_user_in: BotUserCreate) -> Any:
    """Create or update BotUser by unique keys (telegram_id/phone)."""
    existing = crud_bot_user.get_by_telegram_or_phone(session, telegram_id=bot_user_in.telegram_id, phone=bot_user_in.phone)
    if existing:
        updated = crud_bot_user.update(session, db_obj=existing, obj_in=BotUserUpdate(**bot_user_in.model_dump()))
        session.commit()
        session.refresh(updated)
        return updated
    user = crud_bot_user.create(session, obj_in=bot_user_in)
    session.commit()
    session.refresh(user)
    return user


@router.get("/users", response_model=BotUsersPublic)
def list_bot_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    data = crud_bot_user.get_multi(session, skip=skip, limit=limit)
    count = crud_bot_user.count(session)
    return BotUsersPublic(data=data, count=count)


@router.get("/users/by-telegram-id", response_model=BotUserPublic)
def get_user_by_telegram_id(session: SessionDep, telegram_id: int) -> Any:
    """Get a single BotUser by telegram_id (deprecated - use /users/{telegram_id})."""
    service = BotUserService(session)
    return service.get_bot_user_or_404(telegram_id)


@router.get("/users/{telegram_id}", response_model=BotUserWithContext)
def get_user_with_context(session: SessionDep, telegram_id: int) -> Any:
    """Get bot user with generated context for AI."""
    service = BotUserService(session)
    user = service.get_bot_user_or_404(telegram_id)
    context = service.generate_user_context(user.phone)
    return BotUserWithContext(user=BotUserPublic.model_validate(user), context=context)


@router.get("/users/{telegram_id}/customer", response_model=CustomerIdResponse)
def get_customer_id_by_telegram(session: SessionDep, telegram_id: int) -> Any:
    """Get CRM customer_id for a bot user by looking up their phone number."""
    service = BotUserService(session)
    user = service.get_bot_user_or_404(telegram_id)
    customer = service.get_customer_by_phone(user.phone)

    if customer:
        return CustomerIdResponse(customer_id=str(customer.id), found=True)
    return CustomerIdResponse(customer_id=None, found=False)


@router.delete("/users/{telegram_id}")
def delete_bot_user(session: SessionDep, telegram_id: int) -> Any:
    """Delete bot user by telegram_id."""
    service = BotUserService(session)
    success = service.delete_bot_user(telegram_id)
    if not success:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("BotUser", str(telegram_id))

    session.commit()
    from app.models import Message
    return Message(message="Bot user deleted successfully")


@router.post("/inquiries", response_model=CustomerInquiryPublic)
def create_inquiry(session: SessionDep, inquiry_in: CustomerInquiryCreate) -> Any:
    service = CustomerInquiryService(session)
    inquiry = service.create_inquiry(inquiry_in)
    session.commit()
    session.refresh(inquiry)
    return inquiry


