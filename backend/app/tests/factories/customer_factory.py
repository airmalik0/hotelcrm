"""Customer factory for creating test customers."""
import random
from datetime import datetime, timedelta
from typing import Any

from sqlmodel import Session

from app.models import Customer, CustomerCreate, CustomerUpdate


class CustomerFactory:
    """Factory for creating test customers."""

    @staticmethod
    def create_test_customer(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        date_of_birth: datetime | None = None,
        district: str | None = None,
        passport_photo_path: str | None = None,
        notes: str | None = None,
        tags: list[str] | None = None,
    ) -> Customer:
        """
        Create a test customer.

        Args:
            session: Database session
            first_name: First name (auto-generated if None)
            last_name: Last name (auto-generated if None)
            phone: Phone number (auto-generated if None)
            date_of_birth: Date of birth
            district: District/location
            passport_photo_path: Path to passport photo
            notes: Customer notes
            tags: Customer tags

        Returns:
            Created customer
        """
        if first_name is None:
            first_name = f"John{random.randint(1, 999)}"

        if last_name is None:
            last_name = f"Doe{random.randint(1, 999)}"

        if phone is None:
            # Generate unique phone number
            phone = f"+1{random.randint(1000000000, 9999999999)}"

        customer_in = CustomerCreate(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            date_of_birth=date_of_birth,
            district=district or "Test District",
            passport_photo_path=passport_photo_path,
            notes=notes or f"Test customer {first_name} {last_name}",
        )

        customer = Customer.model_validate(customer_in)
        if tags:
            customer.tags = tags
        session.add(customer)
        session.commit()
        session.refresh(customer)
        return customer

    @staticmethod
    def create_customer_with_stats(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
        total_spent: float = 0.0,
        total_bookings: int = 0,
        first_booking_date: datetime | None = None,
        last_booking_date: datetime | None = None,
    ) -> Customer:
        """Create a customer with predefined statistics."""
        customer = CustomerFactory.create_test_customer(
            session=session,
            first_name=first_name,
            last_name=last_name,
        )

        # Update statistics
        customer.total_spent = total_spent
        customer.total_bookings = total_bookings
        customer.first_booking_date = first_booking_date
        customer.last_booking_date = last_booking_date

        session.add(customer)
        session.commit()
        session.refresh(customer)
        return customer

    @staticmethod
    def create_vip_customer(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> Customer:
        """Create a VIP customer."""
        return CustomerFactory.create_test_customer(
            session=session,
            first_name=first_name or "VIP",
            last_name=last_name or "Customer",
            tags=["vip"],
        )

    @staticmethod
    def create_loyal_customer(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> Customer:
        """Create a loyal customer with booking history."""
        now = datetime.utcnow()
        return CustomerFactory.create_customer_with_stats(
            session=session,
            first_name=first_name or "Loyal",
            last_name=last_name or "Customer",
            total_spent=5000.0,
            total_bookings=10,
            first_booking_date=now - timedelta(days=365),
            last_booking_date=now - timedelta(days=7),
        )

    @staticmethod
    def create_problematic_customer(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> Customer:
        """Create a problematic customer."""
        return CustomerFactory.create_test_customer(
            session=session,
            first_name=first_name or "Problem",
            last_name=last_name or "Customer",
            tags=["problematic"],
            notes="Customer has history of issues and complaints",
        )

    @staticmethod
    def update_customer(
        session: Session,
        customer: Customer,
        **kwargs: Any,
    ) -> Customer:
        """Update a customer with given data."""
        customer_update = CustomerUpdate(**kwargs)
        update_dict = customer_update.model_dump(exclude_unset=True)
        customer.sqlmodel_update(update_dict)
        session.add(customer)
        session.commit()
        session.refresh(customer)
        return customer

    @staticmethod
    def create_multiple_customers(
        session: Session,
        count: int = 5,
    ) -> list[Customer]:
        """Create multiple test customers."""
        customers = []
        districts = ["Downtown", "Uptown", "Suburbs", "City Center", "Eastside"]

        for i in range(count):
            customer = CustomerFactory.create_test_customer(
                session=session,
                first_name=f"Customer{i}",
                last_name=f"Test{i}",
                phone=f"+1555000{i:04d}",
                district=districts[i % len(districts)],
            )
            customers.append(customer)
        return customers
