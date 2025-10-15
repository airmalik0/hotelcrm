"""CRUD operations for customer inquiries"""
import uuid
from datetime import datetime

from sqlmodel import Session, col, func, select

from app.crud.base import CRUDBase
from app.models import (
    CustomerInquiry,
    CustomerInquiryCreate,
    CustomerInquiryUpdate,
    InquiryStatus,
)


class CRUDCustomerInquiry(CRUDBase[CustomerInquiry, CustomerInquiryCreate, CustomerInquiryUpdate]):
    def get_multi_filtered(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: InquiryStatus | None = None,
        customer_id: uuid.UUID | None = None,
        bot_user_id: uuid.UUID | None = None,
    ) -> list[CustomerInquiry]:
        """Get filtered list of inquiries"""
        statement = select(CustomerInquiry)

        if status:
            statement = statement.where(CustomerInquiry.status == status)
        if customer_id:
            statement = statement.where(CustomerInquiry.customer_id == customer_id)
        if bot_user_id:
            statement = statement.where(CustomerInquiry.bot_user_id == bot_user_id)

        statement = statement.order_by(col(CustomerInquiry.created_at).desc()).offset(skip).limit(limit)
        return list(session.exec(statement).all())

    def count_filtered(
        self,
        session: Session,
        *,
        status: InquiryStatus | None = None,
        customer_id: uuid.UUID | None = None,
        bot_user_id: uuid.UUID | None = None,
    ) -> int:
        """Count filtered inquiries"""
        statement = select(func.count()).select_from(CustomerInquiry)

        if status:
            statement = statement.where(CustomerInquiry.status == status)
        if customer_id:
            statement = statement.where(CustomerInquiry.customer_id == customer_id)
        if bot_user_id:
            statement = statement.where(CustomerInquiry.bot_user_id == bot_user_id)

        return session.exec(statement).one()

    def update_status(
        self, session: Session, *, inquiry_id: uuid.UUID, new_status: InquiryStatus
    ) -> CustomerInquiry | None:
        """Update inquiry status"""
        inquiry = self.get(session, id=inquiry_id)
        if not inquiry:
            return None

        inquiry.status = new_status
        if new_status == InquiryStatus.RESOLVED:
            inquiry.resolved_at = datetime.utcnow()

        session.add(inquiry)
        session.flush()
        return inquiry


customer_inquiry = CRUDCustomerInquiry(CustomerInquiry)
