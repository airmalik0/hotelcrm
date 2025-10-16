"""Service layer for customer inquiry operations"""
import uuid

from sqlmodel import Session, select

from app.core.exceptions import NotFoundError
from app.crud.customer_inquiry import customer_inquiry as crud_inquiry
from app.models import (
    BotUser,
    Customer,
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
        """Create new customer inquiry.

        Automatically links to customer if bot_user phone matches a customer phone.
        """
        # If customer_id is not provided, try to find customer by bot_user's phone
        if not inquiry_in.customer_id:
            # Get bot_user to find their phone
            bot_user = self.session.get(BotUser, inquiry_in.bot_user_id)
            if bot_user:
                # Normalize phone: remove all non-digits for comparison
                normalized_phone = "".join(filter(str.isdigit, bot_user.phone))

                # Search for customer with matching phone
                stmt = select(Customer).where(Customer.phone == normalized_phone)
                customer = self.session.exec(stmt).first()

                if customer:
                    # Create inquiry with customer link
                    inquiry_data = inquiry_in.model_dump()
                    inquiry_data["customer_id"] = customer.id
                    inquiry_in = CustomerInquiryCreate(**inquiry_data)

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
