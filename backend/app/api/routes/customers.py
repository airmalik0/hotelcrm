import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, exists, func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.models import (
    Customer,
    CustomerCreate,
    CustomerPublic,
    CustomersPublic,
    CustomerUpdate,
    Message,
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
            col(Customer.phone).ilike(f"%{search}%"),
        )
        statement = statement.where(search_filter)

    statement = statement.offset(skip).limit(limit)
    customers = session.exec(statement).all()

    count_statement = select(func.count()).select_from(Customer)
    if search:
        count_statement = count_statement.where(search_filter)
    count = session.exec(count_statement).one()

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
    # Phone uniqueness is enforced at the database level (unique=True in model)
    customer = Customer.model_validate(customer_in)
    session.add(customer)
    session.flush()  # Get ID without committing

    # Log audit in the same transaction
    entity_name = get_entity_name("customer", customer)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=entity_name,
    )

    # Single commit for both customer and audit
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

    # Phone uniqueness is enforced at the database level (unique=True in model)
    update_dict = customer_in.model_dump(exclude_unset=True)

    # Get old and new values for audit
    old_values, new_values = get_change_values(customer, update_dict)

    customer.sqlmodel_update(update_dict)
    session.add(customer)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("customer", customer)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="customer",
            entity_id=customer.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    # Single commit for both customer update and audit
    session.commit()
    session.refresh(customer)
    return customer


@router.delete("/{customer_id}", response_model=Message)
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

    # Check if customer has bookings using EXISTS (more efficient than loading all bookings)
    from app.models import Booking
    has_bookings_stmt = exists(select(Booking).where(Booking.customer_id == customer_id))
    has_bookings = session.exec(select(has_bookings_stmt)).one()

    if has_bookings:
        # Get count for better error message
        booking_count = session.exec(
            select(func.count()).select_from(Booking).where(Booking.customer_id == customer_id)
        ).one()
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete customer with {booking_count} existing booking(s)",
        )

    # Log audit before deletion
    entity_name = get_entity_name("customer", customer)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=entity_name,
    )

    session.delete(customer)
    session.commit()
    return Message(message="Customer deleted successfully")
