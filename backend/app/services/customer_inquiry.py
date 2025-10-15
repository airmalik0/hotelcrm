"""Service layer for customer inquiry operations"""
import uuid

from sqlmodel import Session

from app.core.exceptions import NotFoundError
from app.crud.customer_inquiry import customer_inquiry as crud_inquiry
from app.models import (
    CustomerInquiry,
    CustomerInquiryCreate,
    CustomerInquiryUpdate,
    InquiryStatus,
)


class CustomerInquiryService:
    """Service for customer inquiry business logic"""

    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_inquiry

    def get_inquiry_or_404(self, inquiry_id: uuid.UUID) -> CustomerInquiry:
        """Get inquiry by ID or raise NotFoundError"""
        inquiry = self.crud.get(self.session, id=inquiry_id)
        if not inquiry:
            raise NotFoundError("CustomerInquiry", str(inquiry_id))
        return inquiry

    def create_inquiry(self, inquiry_in: CustomerInquiryCreate) -> CustomerInquiry:
        """Create new customer inquiry"""
        return self.crud.create(self.session, obj_in=inquiry_in)

    def update_inquiry(self, inquiry_id: uuid.UUID, inquiry_in: CustomerInquiryUpdate) -> CustomerInquiry:
        """Update customer inquiry"""
        inquiry = self.get_inquiry_or_404(inquiry_id)
        return self.crud.update(self.session, db_obj=inquiry, obj_in=inquiry_in)

    def update_inquiry_status(self, inquiry_id: uuid.UUID, new_status: InquiryStatus) -> CustomerInquiry:
        """Update inquiry status"""
        inquiry = self.crud.update_status(self.session, inquiry_id=inquiry_id, new_status=new_status)
        if not inquiry:
            raise NotFoundError("CustomerInquiry", str(inquiry_id))
        return inquiry
