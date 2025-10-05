import uuid

from sqlmodel import Session

from app.core.exceptions import AlreadyExistsError, BusinessRuleViolation, NotFoundError
from app.crud.expense import expense as crud_expense
from app.crud.expense import expense_category as crud_expense_category
from app.models import (
    Expense,
    ExpenseCategory,
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseUpdate,
)


class ExpenseCategoryService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_expense_category

    def create_category(self, category_in: ExpenseCategoryCreate) -> ExpenseCategory:
        """Create expense category with business logic."""
        # Check if category name already exists
        if self.crud.get_by_name(self.session, name=category_in.name):
            raise AlreadyExistsError("name", "Category name already exists")

        return self.crud.create(self.session, obj_in=category_in)

    def update_category(
        self, category: ExpenseCategory, category_in: ExpenseCategoryUpdate
    ) -> ExpenseCategory:
        """Update expense category with validations."""
        if category_in.name and category_in.name != category.name:
            if self.crud.get_by_name(self.session, name=category_in.name):
                raise AlreadyExistsError("name", "Category name already exists")

        return self.crud.update(self.session, db_obj=category, obj_in=category_in)

    def get_category_or_404(self, category_id: uuid.UUID) -> ExpenseCategory:
        """Get category by ID or raise NotFoundError."""
        category = self.crud.get(self.session, id=category_id)
        if not category:
            raise NotFoundError("ExpenseCategory", str(category_id))
        return category

    def get_category_for_update(self, category_id: uuid.UUID) -> ExpenseCategory:
        """Get category for update operations."""
        return self.get_category_or_404(category_id)

    def get_category_for_delete(self, category_id: uuid.UUID) -> ExpenseCategory:
        """Get category and validate for deletion."""
        category = self.get_category_or_404(category_id)

        # Check if category has expenses
        expense_count = crud_expense.count_filtered(self.session, category_id=category_id)
        if expense_count > 0:
            raise BusinessRuleViolation(
                f"Cannot delete category with {expense_count} existing expense(s)"
            )

        return category

    def delete_category(self, category_id: uuid.UUID) -> ExpenseCategory | None:
        """Delete category with validation."""
        # Validation happens in get_category_for_delete
        return self.crud.delete(self.session, id=category_id)


class ExpenseService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_expense

    def create_expense(self, expense_in: ExpenseCreate) -> Expense:
        """Create expense with business logic."""
        # Verify category exists
        category = crud_expense_category.get(self.session, id=expense_in.category_id)
        if not category:
            raise NotFoundError("ExpenseCategory", str(expense_in.category_id))

        return self.crud.create(self.session, obj_in=expense_in)

    def update_expense(self, expense: Expense, expense_in: ExpenseUpdate) -> Expense:
        """Update expense with validations."""
        # If category is being changed, verify it exists
        if expense_in.category_id and expense_in.category_id != expense.category_id:
            category = crud_expense_category.get(self.session, id=expense_in.category_id)
            if not category:
                raise NotFoundError("ExpenseCategory", str(expense_in.category_id))

        return self.crud.update(self.session, db_obj=expense, obj_in=expense_in)

    def get_expense_or_404(self, expense_id: uuid.UUID) -> Expense:
        """Get expense by ID or raise NotFoundError."""
        expense = self.crud.get_with_category(self.session, expense_id=expense_id)
        if not expense:
            raise NotFoundError("Expense", str(expense_id))
        return expense

    def get_expense_for_update(self, expense_id: uuid.UUID) -> Expense:
        """Get expense for update operations."""
        return self.get_expense_or_404(expense_id)

    def get_expense_for_delete(self, expense_id: uuid.UUID) -> Expense:
        """Get expense and validate for deletion."""
        return self.get_expense_or_404(expense_id)

    def delete_expense(self, expense_id: uuid.UUID) -> Expense | None:
        """Delete expense."""
        return self.crud.delete(self.session, id=expense_id)
