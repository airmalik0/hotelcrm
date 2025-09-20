
import re
from uuid import UUID

from sqlalchemy.orm import joinedload
from sqlmodel import Session, col, func, or_, select

from app.crud.base import CRUDBase
from app.models import Customer, CustomerCreate, CustomerUpdate


class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
    def get_with_relations(self, session: Session, *, customer_id: UUID) -> Customer | None:
        """Get customer with all relationships loaded."""
        statement = (
            select(Customer)
            .where(Customer.id == customer_id)
            .options(
                joinedload(Customer.bookings)  # type: ignore[arg-type]
            )
        )
        return session.exec(statement).first()

    def get_by_phone(self, session: Session, *, phone: str) -> Customer | None:
        statement = select(Customer).where(Customer.phone == phone)
        return session.exec(statement).first()

    def get_by_phones(self, session: Session, *, phones: list[str]) -> list[Customer]:
        """Get multiple customers by their phone numbers."""
        if not phones:
            return []
        statement = select(Customer).where(Customer.phone.in_(phones))
        return session.exec(statement).all()

    def get_multi_with_search(
        self, session: Session, *, skip: int = 0, limit: int = 100, search: str | None = None
    ) -> list[Customer]:
        statement = select(Customer)

        if search:
            # Check if search term looks like a phone number (contains digits)
            if any(c.isdigit() for c in search):
                # Normalize the search term for phone search (keep only digits)
                normalized_search = re.sub(r'\D', '', search)
                search_pattern = f"%{search}%"
                normalized_pattern = f"%{normalized_search}%"
                search_filter = or_(
                    col(Customer.first_name).ilike(search_pattern),
                    col(Customer.last_name).ilike(search_pattern),
                    col(Customer.phone).ilike(normalized_pattern),
                )
            else:
                # Regular search for names only
                search_pattern = f"%{search}%"
                search_filter = or_(
                    col(Customer.first_name).ilike(search_pattern),
                    col(Customer.last_name).ilike(search_pattern),
                )
            statement = statement.where(search_filter)

        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()

    def count_with_search(self, session: Session, *, search: str | None = None) -> int:
        statement = select(func.count()).select_from(Customer)

        if search:
            # Check if search term looks like a phone number (contains digits)
            if any(c.isdigit() for c in search):
                # Normalize the search term for phone search (keep only digits)
                normalized_search = re.sub(r'\D', '', search)
                search_pattern = f"%{search}%"
                normalized_pattern = f"%{normalized_search}%"
                search_filter = or_(
                    col(Customer.first_name).ilike(search_pattern),
                    col(Customer.last_name).ilike(search_pattern),
                    col(Customer.phone).ilike(normalized_pattern),
                )
            else:
                # Regular search for names only
                search_pattern = f"%{search}%"
                search_filter = or_(
                    col(Customer.first_name).ilike(search_pattern),
                    col(Customer.last_name).ilike(search_pattern),
                )
            statement = statement.where(search_filter)

        return session.exec(statement).one()


customer = CRUDCustomer(Customer)
