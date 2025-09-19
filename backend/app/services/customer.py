import uuid

from sqlmodel import Session

from app.core.exceptions import AlreadyExistsError, BusinessRuleViolation, NotFoundError
from app.crud.customer import customer as crud_customer
from app.models import Customer, CustomerCreate, CustomerUpdate


class CustomerService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_customer

    def create_customer(self, customer_in: CustomerCreate) -> Customer:
        """Create customer with business logic."""
        # Check if phone exists (phone is required)
        if customer_in.phone and self.crud.get_by_phone(self.session, phone=customer_in.phone):
            raise AlreadyExistsError("phone", "Phone number already registered")

        return self.crud.create(self.session, obj_in=customer_in)

    def update_customer(self, customer: Customer, customer_in: CustomerUpdate) -> Customer:
        """Update customer with validations."""
        if customer_in.phone and customer_in.phone != customer.phone:
            if self.crud.get_by_phone(self.session, phone=customer_in.phone):
                raise AlreadyExistsError("phone", "Phone number already in use")

        return self.crud.update(self.session, db_obj=customer, obj_in=customer_in)

    def delete_customer(self, customer_id: uuid.UUID) -> Customer | None:
        """Delete customer with validation."""
        from app.crud.booking import booking as crud_booking

        # Check for existing bookings
        booking_count = crud_booking.count_filtered(self.session, customer_id=customer_id)
        if booking_count > 0:
            raise BusinessRuleViolation(f"Cannot delete customer with {booking_count} existing booking(s)")

        return self.crud.delete(self.session, id=customer_id)

    def get_customer_or_404(self, customer_id: uuid.UUID) -> Customer:
        """Get customer by ID or raise NotFoundError."""
        customer = self.crud.get(self.session, id=customer_id)
        if not customer:
            raise NotFoundError("Customer", str(customer_id))
        return customer

    def get_customer_for_update(self, customer_id: uuid.UUID) -> Customer:
        """Get customer for update operations."""
        return self.get_customer_or_404(customer_id)

    def get_customer_for_delete(self, customer_id: uuid.UUID) -> Customer:
        """Get customer and validate for deletion."""
        customer = self.get_customer_or_404(customer_id)

        # Check business rules for deletion
        from app.crud.booking import booking as crud_booking
        booking_count = crud_booking.count_filtered(self.session, customer_id=customer_id)
        if booking_count > 0:
            raise BusinessRuleViolation(f"Cannot delete customer with {booking_count} existing booking(s)")

        return customer
