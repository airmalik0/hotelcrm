
from sqlmodel import Session, col, func, or_, select

from app.crud.base import CRUDBase
from app.models import Customer, CustomerCreate, CustomerUpdate


class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
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
            search_filter = or_(
                col(Customer.first_name).ilike(f"%{search}%"),
                col(Customer.last_name).ilike(f"%{search}%"),
                col(Customer.phone).ilike(f"%{search}%"),
            )
            statement = statement.where(search_filter)

        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()

    def count_with_search(self, session: Session, *, search: str | None = None) -> int:
        statement = select(func.count()).select_from(Customer)

        if search:
            search_filter = or_(
                col(Customer.first_name).ilike(f"%{search}%"),
                col(Customer.last_name).ilike(f"%{search}%"),
                col(Customer.phone).ilike(f"%{search}%"),
            )
            statement = statement.where(search_filter)

        return session.exec(statement).one()


customer = CRUDCustomer(Customer)
