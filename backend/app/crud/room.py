
from sqlmodel import Session, func, select

from app.crud.base import CRUDBase
from app.models import Room, RoomCreate, RoomStatus, RoomUpdate


class CRUDRoom(CRUDBase[Room, RoomCreate, RoomUpdate]):
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


room = CRUDRoom(Room)