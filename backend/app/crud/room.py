
from uuid import UUID

from sqlalchemy.orm import joinedload
from sqlmodel import Session, func, select

from app.crud.base import CRUDBase
from app.models import Room, RoomCreate, RoomStatus, RoomUpdate


class CRUDRoom(CRUDBase[Room, RoomCreate, RoomUpdate]):
    def get_with_relations(self, session: Session, *, room_id: UUID) -> Room | None:
        """Get room with all relationships loaded."""
        statement = (
            select(Room)
            .where(Room.id == room_id)
            .options(
                joinedload(Room.bookings)  # type: ignore[arg-type]
            )
        )
        return session.exec(statement).first()

    def get_by_room_number(self, session: Session, *, room_number: str) -> Room | None:
        statement = select(Room).where(Room.room_number == room_number)
        return session.exec(statement).first()

    def get_available(
        self, session: Session, *, skip: int = 0, limit: int = 100
    ) -> list[Room]:
        statement = (
            select(Room)
            .where(Room.status == RoomStatus.AVAILABLE)
            .offset(skip)
            .limit(limit)
        )
        return session.exec(statement).all()

    def count_available(self, session: Session) -> int:
        statement = select(func.count()).select_from(Room).where(
            Room.status == RoomStatus.AVAILABLE
        )
        return session.exec(statement).one()

    def update_status(self, session: Session, *, room: Room, status: RoomStatus) -> Room:
        """Update room status."""
        room.status = status
        session.add(room)
        session.flush()
        return room


room = CRUDRoom(Room)
