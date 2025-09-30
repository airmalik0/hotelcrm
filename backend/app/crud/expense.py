from uuid import UUID

from sqlmodel import Session, func, select

from app.crud.base import CRUDBase
from app.models import (
    Expense,
    ExpenseCategory,
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCreate,
    ExpenseUpdate,
)


class CRUDExpenseCategory(CRUDBase[ExpenseCategory, ExpenseCategoryCreate, ExpenseCategoryUpdate]):
    def get_by_name(self, session: Session, *, name: str) -> ExpenseCategory | None:
        statement = select(ExpenseCategory).where(ExpenseCategory.name == name)
        return session.exec(statement).first()

    def get_multi(
        self, session: Session, *, skip: int = 0, limit: int = 100
    ) -> list[ExpenseCategory]:
        statement = select(ExpenseCategory).offset(skip).limit(limit).order_by(ExpenseCategory.name)
        return session.exec(statement).all()

    def count(self, session: Session) -> int:
        statement = select(func.count()).select_from(ExpenseCategory)
        return session.exec(statement).one()


class CRUDExpense(CRUDBase[Expense, ExpenseCreate, ExpenseUpdate]):
    def get_multi_filtered(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        category_id: UUID | None = None,
    ) -> list[Expense]:
        statement = select(Expense)

        if category_id:
            statement = statement.where(Expense.category_id == category_id)

        statement = statement.offset(skip).limit(limit).order_by(Expense.expense_date.desc())
        return session.exec(statement).all()

    def count_filtered(
        self,
        session: Session,
        *,
        category_id: UUID | None = None,
    ) -> int:
        statement = select(func.count()).select_from(Expense)

        if category_id:
            statement = statement.where(Expense.category_id == category_id)

        return session.exec(statement).one()

    def get_with_category(self, session: Session, *, expense_id: UUID) -> Expense | None:
        """Get expense with category relationship loaded."""
        from sqlalchemy.orm import joinedload

        statement = (
            select(Expense)
            .where(Expense.id == expense_id)
            .options(joinedload(Expense.category))  # type: ignore[arg-type]
        )
        return session.exec(statement).first()


expense_category = CRUDExpenseCategory(ExpenseCategory)
expense = CRUDExpense(Expense)
