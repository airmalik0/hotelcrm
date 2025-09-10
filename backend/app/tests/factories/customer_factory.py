"""Customer factory for creating test customers."""
import random
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlmodel import Session

from app.crud.customer import customer as crud_customer
from app.models import Customer, CustomerCreate, CustomerUpdate
from app.tests.factories.base import BaseFactory


class CustomerFactory(BaseFactory[Customer, CustomerCreate]):
    """
    Factory for creating test customers.
    
    Uses CRUD layer for all database operations.
    No business logic - just test data creation.
    """
    
    model = Customer
    create_schema = CustomerCreate
    crud = crud_customer
    
    @classmethod
    def get_defaults(cls, **overrides: Any) -> dict[str, Any]:
        """Get default values for customer creation."""
        defaults = {
            "first_name": f"John{random.randint(1, 999)}",
            "last_name": f"Doe{random.randint(1, 999)}",
            "phone": f"+1{random.randint(1000000000, 9999999999)}",
            "district": "Test District",
            "notes": "Test customer",
        }
        
        # Apply overrides
        defaults.update(overrides)
        
        # Update notes if names were provided
        if "first_name" in overrides or "last_name" in overrides:
            defaults["notes"] = f"Test customer {defaults['first_name']} {defaults['last_name']}"
        
        return defaults

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
        Create a test customer (backward compatibility).
        
        DEPRECATED: Use CustomerFactory.create() instead.
        """
        kwargs = {}
        if first_name is not None:
            kwargs["first_name"] = first_name
        if last_name is not None:
            kwargs["last_name"] = last_name
        if phone is not None:
            kwargs["phone"] = phone
        if date_of_birth is not None:
            kwargs["date_of_birth"] = date_of_birth
        if district is not None:
            kwargs["district"] = district
        if passport_photo_path is not None:
            kwargs["passport_photo_path"] = passport_photo_path
        if notes is not None:
            kwargs["notes"] = notes
        
        customer = CustomerFactory.create(session, **kwargs)
        
        # Handle tags separately as they're not in CustomerCreate
        if tags:
            customer.tags = tags
            session.add(customer)
            session.flush()
        
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
        """
        Create a customer with predefined statistics.
        
        NOTE: Statistics should normally be managed by business logic,
        but for testing we set them directly.
        """
        # Provide default values if not specified
        kwargs = {}
        if first_name is not None:
            kwargs["first_name"] = first_name
        if last_name is not None:
            kwargs["last_name"] = last_name
        
        customer = CustomerFactory.create(
            session=session,
            **kwargs
        )

        # Update statistics directly for testing purposes
        customer.total_spent = total_spent
        customer.total_bookings = total_bookings
        customer.first_booking_date = first_booking_date
        customer.last_booking_date = last_booking_date

        session.add(customer)
        session.flush()
        return customer

    @staticmethod
    def create_vip_customer(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> Customer:
        """Create a VIP customer."""
        customer = CustomerFactory.create(
            session=session,
            first_name=first_name or "VIP",
            last_name=last_name or "Customer",
        )
        customer.tags = ["vip"]
        session.add(customer)
        session.flush()
        return customer

    @staticmethod
    def create_loyal_customer(
        session: Session,
        first_name: str | None = None,
        last_name: str | None = None,
    ) -> Customer:
        """Create a loyal customer with booking history."""
        now = datetime.now(timezone.utc)
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
        customer = CustomerFactory.create(
            session=session,
            first_name=first_name or "Problem",
            last_name=last_name or "Customer",
            notes="Customer has history of issues and complaints",
        )
        customer.tags = ["problematic"]
        session.add(customer)
        session.flush()
        return customer

    @staticmethod
    def update_customer(
        session: Session,
        customer: Customer,
        **kwargs: Any,
    ) -> Customer:
        """
        Update a customer with given data.
        
        Uses CRUD layer for proper update handling.
        """
        customer_update = CustomerUpdate(**kwargs)
        updated = crud_customer.update(session, db_obj=customer, obj_in=customer_update)
        session.flush()
        return updated

    @staticmethod
    def create_multiple_customers(
        session: Session,
        count: int = 5,
    ) -> list[Customer]:
        """Create multiple test customers."""
        districts = ["Downtown", "Uptown", "Suburbs", "City Center", "Eastside"]
        
        return CustomerFactory.create_batch(
            session,
            count=count,
            first_name=lambda i: f"Customer{i}",
            last_name=lambda i: f"Test{i}",
            phone=lambda i: f"+1555000{i:04d}",
            district=lambda i: districts[i % len(districts)],
        )
