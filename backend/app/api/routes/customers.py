import uuid
from typing import Any

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.rate_limit import RateLimits, limiter
from app.crud.customer import customer as crud_customer
from app.models import (
    CustomerCreate,
    CustomerPublic,
    CustomersPublic,
    CustomerUpdate,
    Message,
)
from app.services.customer import CustomerService

router = APIRouter()


@router.get("/", response_model=CustomersPublic)
@limiter.limit(RateLimits.READ_LIST)
def read_customers(
    request: Request,  # noqa: ARG001
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
    service = CustomerService(session)
    return service.get_customer_or_404(customer_id)


@router.post("/", response_model=CustomerPublic)
def create_customer(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    customer_in: CustomerCreate,
) -> Any:
    """
    Create new customer.
    """
    service = CustomerService(session)
    customer = service.create_customer(customer_in)

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
    current_user: CurrentUser,
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
) -> Any:
    """
    Update a customer.
    """
    service = CustomerService(session)
    customer = service.get_customer_for_update(customer_id)

    # Get old and new values for audit
    update_dict = customer_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(customer, update_dict)

    customer = service.update_customer(customer, customer_in)

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
    current_user: CurrentUser,
    customer_id: uuid.UUID,
) -> Any:
    """
    Delete a customer.
    """
    service = CustomerService(session)
    customer = service.get_customer_for_delete(customer_id)

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

    service.delete_customer(customer_id)

    session.commit()
    return Message(message="Customer deleted successfully")
