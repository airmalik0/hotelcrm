import uuid

from sqlmodel import Session

from app.crud.customer import customer as crud_customer
from app.models import Customer, CustomerCreate, CustomersPublic, CustomerUpdate


class CustomerService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_customer

    def get_customers(
        self, skip: int = 0, limit: int = 100, search: str | None = None
    ) -> CustomersPublic:
        """
        Get customers with pagination and optional search.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search string

        Returns:
            CustomersPublic with data and count
        """
        customers = self.crud.get_multi_with_search(
            self.session, skip=skip, limit=limit, search=search
        )
        count = self.crud.count_with_search(self.session, search=search)
        return CustomersPublic(data=customers, count=count)

    def get_customer_by_id(self, customer_id: uuid.UUID) -> Customer:
        """
        Get customer by ID.

        Args:
            customer_id: Customer UUID

        Returns:
            Customer object

        Raises:
            ValueError: If customer not found
        """
        customer = self.crud.get(self.session, id=customer_id)
        if not customer:
            raise ValueError("Customer not found")
        return customer

    def create_customer(self, customer_in: CustomerCreate) -> Customer:
        """Create customer with business logic."""
        # Check if phone exists (phone is required)
        if customer_in.phone and self.crud.get_by_phone(self.session, phone=customer_in.phone):
            raise ValueError("Phone number already registered")

        return self.crud.create(self.session, obj_in=customer_in)

    def update_customer(self, customer: Customer, customer_in: CustomerUpdate) -> Customer:
        """Update customer with validations."""
        if customer_in.phone and customer_in.phone != customer.phone:
            if self.crud.get_by_phone(self.session, phone=customer_in.phone):
                raise ValueError("Phone number already in use")

        return self.crud.update(self.session, db_obj=customer, obj_in=customer_in)

    def delete_customer(self, customer_id: uuid.UUID) -> Customer | None:
        """Delete customer with validation."""
        from app.crud.booking import booking as crud_booking

        # Check for existing bookings
        booking_count = crud_booking.count_filtered(self.session, customer_id=customer_id)
        if booking_count > 0:
            raise ValueError(f"Cannot delete customer with {booking_count} existing booking(s)")

        return self.crud.delete(self.session, id=customer_id)
