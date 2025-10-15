"""CRUD for BotUser (phone-based accounts)"""

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models import BotUser, BotUserCreate, BotUserUpdate


class CRUDBotUser(CRUDBase[BotUser, BotUserCreate, BotUserUpdate]):
    def get_by_phone(self, session: Session, *, phone: str) -> BotUser | None:
        """Get bot user by phone number"""
        statement = select(BotUser).where(BotUser.phone == phone)
        return session.exec(statement).first()


bot_user = CRUDBotUser(BotUser)


