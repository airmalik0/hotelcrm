"""Bot schemas - pure Pydantic DTOs for API communication"""
from .bot_user import (
    BotUserPublic,
    BotUsersPublic,
    SessionLoginRequest,
)
from .customer_inquiry import (
    CustomerInquiriesPublic,
    CustomerInquiryCreate,
    CustomerInquiryPublic,
    InquiryPriority,
    InquiryStatus,
    InquiryType,
)

__all__ = [
    # Bot User models
    "BotUserPublic",
    "BotUsersPublic",
    "SessionLoginRequest",
    # Customer Inquiry models
    "CustomerInquiriesPublic",
    "CustomerInquiryCreate",
    "CustomerInquiryPublic",
    "InquiryType",
    "InquiryStatus",
    "InquiryPriority",
]
