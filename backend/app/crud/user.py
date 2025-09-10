from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models import User, UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def create(self, session: Session, *, obj_in: UserCreate) -> User:
        user = User.model_validate(
            obj_in,
            update={"hashed_password": get_password_hash(obj_in.password)}
        )
        session.add(user)
        session.flush()
        return user

    def update(self, session: Session, *, db_obj: User, obj_in: UserUpdate) -> User:
        update_data = obj_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password

        db_obj.sqlmodel_update(update_data)
        session.add(db_obj)
        session.flush()
        return db_obj

    def get_by_username(self, session: Session, *, username: str) -> User | None:
        statement = select(User).where(User.username == username)
        return session.exec(statement).first()

    def authenticate(self, session: Session, *, username: str, password: str) -> User | None:
        user = self.get_by_username(session=session, username=username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user


user = CRUDUser(User)


# Backward compatibility functions
def create_user(*, session: Session, user_create: UserCreate) -> User:
    return user.create(session, obj_in=user_create)


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> User:
    return user.update(session, db_obj=db_user, obj_in=user_in)


def get_user_by_username(*, session: Session, username: str) -> User | None:
    return user.get_by_username(session=session, username=username)


def authenticate(*, session: Session, username: str, password: str) -> User | None:
    return user.authenticate(session=session, username=username, password=password)
