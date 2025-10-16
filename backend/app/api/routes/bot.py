"""Bot-facing endpoints authenticated via Telegram Bot Token header.

Header: X-Telegram-Bot-Token: <token>
"""
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import SessionDep, telegram_bot_auth
from app.crud.bot_user import bot_user as crud_bot_user
from app.models import (
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


class SessionCreateRequest(BaseModel):
    """Request to create session (login)"""
    telegram_id: int
    phone: str
    name: str
    language: str = "ru"
    # Telegram account metadata
    telegram_username: str | None = None
    telegram_first_name: str
    telegram_last_name: str | None = None
    telegram_language_code: str | None = None


@router.post("/sessions/login", response_model=BotUserPublic)
def login_session(session: SessionDep, request: SessionCreateRequest) -> Any:
    """Login: create or get bot user by phone, create session for telegram_id"""
    service = BotUserService(session)

    # Create or get bot user
    bot_user = service.create_or_get_bot_user(
        phone=request.phone,
        name=request.name,
        language=request.language
    )

    # Create session with Telegram metadata
    service.create_session(
        telegram_id=request.telegram_id,
        bot_user_id=bot_user.id,
        username=request.telegram_username,
        first_name=request.telegram_first_name,
        last_name=request.telegram_last_name,
        language_code=request.telegram_language_code
    )

    session.commit()
    session.refresh(bot_user)
    return bot_user


@router.get("/users", response_model=BotUsersPublic)
def list_bot_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    data = crud_bot_user.get_multi(session, skip=skip, limit=limit)
    count = crud_bot_user.count(session)
    return BotUsersPublic(data=data, count=count)


@router.get("/sessions/{telegram_id}", response_model=BotUserPublic)
def get_session(session: SessionDep, telegram_id: int) -> Any:
    """Get bot user for active session by telegram_id"""
    service = BotUserService(session)
    return service.get_bot_user_or_404(telegram_id)


@router.put("/sessions/{telegram_id}", response_model=BotUserPublic)
def update_session_user(session: SessionDep, telegram_id: int, user_update: BotUserUpdate) -> Any:
    """Update bot user for active session"""
    service = BotUserService(session)

    # Get bot_user via session
    bot_user = service.get_bot_user_or_404(telegram_id)

    # Update bot_user
    updated_user = crud_bot_user.update(session, db_obj=bot_user, obj_in=user_update)
    session.commit()
    session.refresh(updated_user)
    return updated_user


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


@router.delete("/sessions/{telegram_id}")
def logout_session(session: SessionDep, telegram_id: int) -> Any:
    """Logout: delete session for telegram_id"""
    service = BotUserService(session)
    success = service.delete_session(telegram_id)
    if not success:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("BotSession", str(telegram_id))

    session.commit()
    from app.models import Message
    return Message(message="Session deleted successfully")


@router.post("/inquiries", response_model=CustomerInquiryPublic)
def create_inquiry(session: SessionDep, inquiry_in: CustomerInquiryCreate) -> Any:
    service = CustomerInquiryService(session)
    inquiry = service.create_inquiry(inquiry_in)
    session.commit()
    session.refresh(inquiry)
    return inquiry


