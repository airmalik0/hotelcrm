"""CRUD for BotSession (active telegram logins)"""

import uuid

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models import BotSession, BotSessionCreate


class CRUDBotSession(CRUDBase[BotSession, BotSessionCreate, BotSessionCreate]):
    def get_by_telegram_id(self, session: Session, *, telegram_id: int) -> BotSession | None:
        """Get active session by telegram_id"""
        statement = select(BotSession).where(BotSession.telegram_id == telegram_id)
        return session.exec(statement).first()

    def get_by_bot_user_id(self, session: Session, *, bot_user_id: uuid.UUID) -> list[BotSession]:
        """Get all sessions for a bot user (phone number)"""
        statement = select(BotSession).where(BotSession.bot_user_id == bot_user_id)
        return list(session.exec(statement).all())

    def delete_by_telegram_id(self, session: Session, *, telegram_id: int) -> bool:
        """Delete session by telegram_id (logout)"""
        session_obj = self.get_by_telegram_id(session, telegram_id=telegram_id)
        if not session_obj:
            return False
        session.delete(session_obj)
        session.flush()
        return True


bot_session = CRUDBotSession(BotSession)
