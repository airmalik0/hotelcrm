
import re
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import joinedload
from sqlmodel import Session, col, func, or_, select

from app.crud.base import CRUDBase
from app.models import Customer, CustomerCreate, CustomerUpdate
from app.models.common import District


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

    def _apply_filters(
        self,
        statement: select,
        search: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        min_spent: float | None = None,
        max_spent: float | None = None,
        min_bookings: int | None = None,
        max_bookings: int | None = None,
        country_code: str | None = None,
        region: str | None = None,
        district: District | None = None,
    ) -> select:
        """Apply filters to the query statement."""
        # Search filter (existing logic)
        if search:
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

        # Date filters
        if date_from:
            try:
                date_from_parsed = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                statement = statement.where(Customer.created_at >= date_from_parsed)
            except ValueError:
                pass  # Invalid date format, ignore filter

        if date_to:
            try:
                date_to_parsed = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                statement = statement.where(Customer.created_at <= date_to_parsed)
            except ValueError:
                pass  # Invalid date format, ignore filter

        # Spending filters
        if min_spent is not None:
            statement = statement.where(Customer.total_spent >= min_spent)
        if max_spent is not None:
            statement = statement.where(Customer.total_spent <= max_spent)

        # Bookings filters
        if min_bookings is not None:
            statement = statement.where(Customer.total_bookings >= min_bookings)
        if max_bookings is not None:
            statement = statement.where(Customer.total_bookings <= max_bookings)

        # Geographic filters
        if country_code:
            statement = statement.where(Customer.country_code == country_code.upper())
        if region:
            statement = statement.where(Customer.region == region.upper())
        if district:
            statement = statement.where(Customer.district == district)

        return statement

    def _apply_sorting(self, statement: select, order_by: str = "created_at", order_direction: str = "desc") -> select:
        """Apply sorting to the query statement."""
        # Define allowed sort fields
        sort_fields = {
            "first_name": Customer.first_name,
            "last_name": Customer.last_name,
            "created_at": Customer.created_at,
            "total_spent": Customer.total_spent,
            "total_bookings": Customer.total_bookings,
        }

        # Get the field to sort by
        sort_field = sort_fields.get(order_by, Customer.created_at)

        # Apply sorting direction
        if order_direction.lower() == "asc":
            statement = statement.order_by(sort_field.asc())
        else:
            statement = statement.order_by(sort_field.desc())

        return statement

    def get_multi_filtered(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        min_spent: float | None = None,
        max_spent: float | None = None,
        min_bookings: int | None = None,
        max_bookings: int | None = None,
        country_code: str | None = None,
        region: str | None = None,
        district: District | None = None,
        order_by: str = "created_at",
        order_direction: str = "desc",
    ) -> list[Customer]:
        """Get multiple customers with filters and sorting."""
        statement = select(Customer)

        # Apply filters
        statement = self._apply_filters(
            statement,
            search=search,
            date_from=date_from,
            date_to=date_to,
            min_spent=min_spent,
            max_spent=max_spent,
            min_bookings=min_bookings,
            max_bookings=max_bookings,
            country_code=country_code,
            region=region,
            district=district,
        )

        # Apply sorting
        statement = self._apply_sorting(statement, order_by, order_direction)

        # Apply pagination
        statement = statement.offset(skip).limit(limit)

        return session.exec(statement).all()

    def count_filtered(
        self,
        session: Session,
        *,
        search: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        min_spent: float | None = None,
        max_spent: float | None = None,
        min_bookings: int | None = None,
        max_bookings: int | None = None,
        country_code: str | None = None,
        region: str | None = None,
        district: District | None = None,
    ) -> int:
        """Count customers with filters applied."""
        statement = select(func.count()).select_from(Customer)

        # Apply filters (same as get_multi_filtered)
        statement = self._apply_filters(
            statement,
            search=search,
            date_from=date_from,
            date_to=date_to,
            min_spent=min_spent,
            max_spent=max_spent,
            min_bookings=min_bookings,
            max_bookings=max_bookings,
            country_code=country_code,
            region=region,
            district=district,
        )

        return session.exec(statement).one()


customer = CRUDCustomer(Customer)
