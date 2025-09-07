import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Customer,
    CustomerCreate,
    CustomerPublic,
    CustomerUpdate,
    CustomersPublic,
)

router = APIRouter()


@router.get("/", response_model=CustomersPublic)
def read_customers(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> Any:
    """
    Retrieve customers.
    """
    statement = select(Customer)
    
    if search:
        search_filter = or_(
            col(Customer.first_name).ilike(f"%{search}%"),
            col(Customer.last_name).ilike(f"%{search}%"),
            col(Customer.email).ilike(f"%{search}%"),
            col(Customer.phone).ilike(f"%{search}%"),
        )
        statement = statement.where(search_filter)
    
    statement = statement.offset(skip).limit(limit)
    customers = session.exec(statement).all()
    
    count_statement = select(Customer)
    if search:
        count_statement = count_statement.where(search_filter)
    count = len(session.exec(count_statement).all())
    
    return CustomersPublic(data=customers, count=count)


@router.get("/{customer_id}", response_model=CustomerPublic)
def read_customer(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    customer_id: uuid.UUID,
) -> Any:
    """
    Get customer by ID.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/", response_model=CustomerPublic)
def create_customer(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    customer_in: CustomerCreate,
) -> Any:
    """
    Create new customer.
    """
    # Check if email already exists
    statement = select(Customer).where(Customer.email == customer_in.email)
    existing_customer = session.exec(statement).first()
    if existing_customer:
        raise HTTPException(
            status_code=400,
            detail="Customer with this email already exists",
        )
    
    customer = Customer.model_validate(customer_in)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerPublic)
def update_customer(
    *,
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
) -> Any:
    """
    Update a customer.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if new email already exists (if email is being updated)
    if customer_in.email and customer_in.email != customer.email:
        statement = select(Customer).where(Customer.email == customer_in.email)
        existing_customer = session.exec(statement).first()
        if existing_customer:
            raise HTTPException(
                status_code=400,
                detail="Customer with this email already exists",
            )
    
    update_dict = customer_in.model_dump(exclude_unset=True)
    customer.sqlmodel_update(update_dict)
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    customer_id: uuid.UUID,
) -> Any:
    """
    Delete a customer.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer has bookings
    if customer.bookings:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete customer with existing bookings",
        )
    
    session.delete(customer)
    session.commit()
    return {"message": "Customer deleted successfully"}