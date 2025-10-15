"""Bot models - pure Pydantic DTOs for API communication"""
from .bot_user import (
    BotUserCreate,
    BotUserPublic,
    BotUsersPublic,
    BotUserUpdate,
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
    "BotUserCreate",
    "BotUserPublic",
    "BotUsersPublic",
    "BotUserUpdate",
    # Customer Inquiry models
    "CustomerInquiriesPublic",
    "CustomerInquiryCreate",
    "CustomerInquiryPublic",
    "InquiryType",
    "InquiryStatus",
    "InquiryPriority",
]
