import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.customer import customer as crud_customer
from app.models import (
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
    customers = crud_customer.get_multi_with_search(
        session, skip=skip, limit=limit, search=search
    )
    count = crud_customer.count_with_search(session, search=search)
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
    customer = crud_customer.get(session, id=customer_id)
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
    # Check if phone exists (phone is required in CustomerCreate)
    if customer_in.phone and crud_customer.get_by_phone(session, phone=customer_in.phone):
        raise HTTPException(status_code=400, detail="Phone number already registered")

    customer = crud_customer.create(session, obj_in=customer_in)

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
    customer = crud_customer.get(session, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Check phone uniqueness if changing
    if customer_in.phone and customer_in.phone != customer.phone:
        if crud_customer.get_by_phone(session, phone=customer_in.phone):
            raise HTTPException(status_code=400, detail="Phone number already in use")

    # Get old and new values for audit
    update_dict = customer_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(customer, update_dict)

    customer = crud_customer.update(session, db_obj=customer, obj_in=customer_in)

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
    customer = crud_customer.get(session, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Check for existing bookings
    from app.crud.booking import booking as crud_booking
    booking_count = crud_booking.count_filtered(session, customer_id=customer_id)
    if booking_count > 0:
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

    crud_customer.delete(session, id=customer_id)
    session.commit()
    return Message(message="Customer deleted successfully")
