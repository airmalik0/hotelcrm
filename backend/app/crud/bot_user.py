"""CRUD for BotUser"""

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models import BotUser, BotUserCreate, BotUserUpdate


class CRUDBotUser(CRUDBase[BotUser, BotUserCreate, BotUserUpdate]):
    def get_by_telegram(self, session: Session, *, telegram_id: int) -> BotUser | None:
        statement = select(BotUser).where(BotUser.telegram_id == telegram_id)
        return session.exec(statement).first()

    def get_by_phone(self, session: Session, *, phone: str) -> BotUser | None:
        statement = select(BotUser).where(BotUser.phone == phone)
        return session.exec(statement).first()

    def get_by_telegram_or_phone(self, session: Session, *, telegram_id: int, phone: str) -> BotUser | None:
        statement = select(BotUser).where((BotUser.telegram_id == telegram_id) | (BotUser.phone == phone))
        return session.exec(statement).first()


bot_user = CRUDBotUser(BotUser)


