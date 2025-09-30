import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel


class ExpenseCategoryBase(SQLModel):
    name: str = Field(min_length=1, max_length=100, unique=True, index=True)
    description: str | None = Field(default=None, max_length=500)


class ExpenseCategory(ExpenseCategoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )

    # Relationship
    expenses: list["Expense"] = Relationship(back_populates="category")


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class ExpenseCategoryPublic(ExpenseCategoryBase):
    id: uuid.UUID
    created_at: datetime


class ExpenseCategoriesPublic(SQLModel):
    data: list[ExpenseCategoryPublic]
    count: int


class ExpenseBase(SQLModel):
    category_id: uuid.UUID = Field(foreign_key="expensecategory.id")
    amount: float = Field(gt=0, description="Expense amount (must be positive)")
    description: str | None = Field(default=None, max_length=1000)
    expense_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True)),
        description="Date when expense occurred"
    )


class Expense(ExpenseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )

    # Relationship
    category: ExpenseCategory = Relationship(back_populates="expenses")


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(SQLModel):
    category_id: uuid.UUID | None = None
    amount: float | None = Field(default=None, gt=0)
    description: str | None = None
    expense_date: datetime | None = None


class ExpensePublic(ExpenseBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    category: ExpenseCategoryPublic


class ExpensesPublic(SQLModel):
    data: list[ExpensePublic]
    count: int
