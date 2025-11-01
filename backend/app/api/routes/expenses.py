import uuid
from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.expense import expense as crud_expense
from app.crud.expense import expense_category as crud_expense_category
from app.models import (
    ExpenseCategoriesPublic,
    ExpenseCategoryCreate,
    ExpenseCategoryPublic,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpensePublic,
    ExpensesPublic,
    ExpenseUpdate,
    Message,
)
from app.services.expense import ExpenseCategoryService, ExpenseService

router = APIRouter()


# Expense Category Routes
@router.get("/categories", response_model=ExpenseCategoriesPublic)
def read_expense_categories(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve expense categories.
    """
    categories = crud_expense_category.get_multi(session, skip=skip, limit=limit)
    count = crud_expense_category.count(session)
    return ExpenseCategoriesPublic(data=categories, count=count)


@router.get("/categories/{category_id}", response_model=ExpenseCategoryPublic)
def read_expense_category(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    category_id: uuid.UUID,
) -> Any:
    """
    Get expense category by ID.
    """
    service = ExpenseCategoryService(session)
    return service.get_category_or_404(category_id)


@router.post("/categories", response_model=ExpenseCategoryPublic)
def create_expense_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    category_in: ExpenseCategoryCreate,
) -> Any:
    """
    Create new expense category.
    """
    service = ExpenseCategoryService(session)
    category = service.create_category(category_in)

    # Log audit
    entity_name = get_entity_name("expense_category", category)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="expense_category",
        entity_id=category.id,
        entity_name=entity_name,
    )

    session.commit()
    session.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=ExpenseCategoryPublic)
def update_expense_category(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    category_id: uuid.UUID,
    category_in: ExpenseCategoryUpdate,
) -> Any:
    """
    Update an expense category.
    """
    service = ExpenseCategoryService(session)
    category = service.get_category_for_update(category_id)

    # Get old and new values for audit
    update_dict = category_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(category, update_dict)

    category = service.update_category(category, category_in)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("expense_category", category)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="expense_category",
            entity_id=category.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    session.commit()
    session.refresh(category)
    return category


@router.delete("/categories/{category_id}", response_model=Message)
def delete_expense_category(
    session: SessionDep,
    current_user: CurrentUser,
    category_id: uuid.UUID,
) -> Any:
    """
    Delete an expense category.
    """
    service = ExpenseCategoryService(session)
    category = service.get_category_for_delete(category_id)

    # Log audit before deletion
    entity_name = get_entity_name("expense_category", category)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="expense_category",
        entity_id=category.id,
        entity_name=entity_name,
    )

    service.delete_category(category_id)

    session.commit()
    return Message(message="Expense category deleted successfully")


# Expense Routes
@router.get("/", response_model=ExpensesPublic)
def read_expenses(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    skip: int = 0,
    limit: int = 100,
    category_id: uuid.UUID | None = None,
) -> Any:
    """
    Retrieve expenses with optional category filter.
    """
    expenses = crud_expense.get_multi_filtered(
        session, skip=skip, limit=limit, category_id=category_id
    )
    count = crud_expense.count_filtered(session, category_id=category_id)
    return ExpensesPublic(data=expenses, count=count)


@router.get("/{expense_id}", response_model=ExpensePublic)
def read_expense(
    session: SessionDep,
    current_user: CurrentUser,  # noqa: ARG001
    expense_id: uuid.UUID,
) -> Any:
    """
    Get expense by ID.
    """
    service = ExpenseService(session)
    return service.get_expense_or_404(expense_id)


@router.post("/", response_model=ExpensePublic)
def create_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_in: ExpenseCreate,
) -> Any:
    """
    Create new expense.
    """
    service = ExpenseService(session)
    expense = service.create_expense(expense_in)

    # Log audit
    entity_name = get_entity_name("expense", expense)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="expense",
        entity_id=expense.id,
        entity_name=entity_name,
    )

    session.commit()
    session.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpensePublic)
def update_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_id: uuid.UUID,
    expense_in: ExpenseUpdate,
) -> Any:
    """
    Update an expense.
    """
    service = ExpenseService(session)
    expense = service.get_expense_for_update(expense_id)

    # Get old and new values for audit
    update_dict = expense_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(expense, update_dict)

    expense = service.update_expense(expense, expense_in)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("expense", expense)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="expense",
            entity_id=expense.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    session.commit()
    session.refresh(expense)
    return expense


@router.delete("/{expense_id}", response_model=Message)
def delete_expense(
    session: SessionDep,
    current_user: CurrentUser,
    expense_id: uuid.UUID,
) -> Any:
    """
    Delete an expense.
    """
    service = ExpenseService(session)
    expense = service.get_expense_for_delete(expense_id)

    # Log audit before deletion
    entity_name = get_entity_name("expense", expense)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="expense",
        entity_id=expense.id,
        entity_name=entity_name,
    )

    service.delete_expense(expense_id)

    session.commit()
    return Message(message="Expense deleted successfully")
