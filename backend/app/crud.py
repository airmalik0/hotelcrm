from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import User, UserCreate, UserUpdate


def create_user(*, session: Session, user_create: UserCreate) -> User:
    user = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(user)
    session.flush()  # Get ID without committing
    return user


def update_user(*, session: Session, user: User, user_in: UserUpdate) -> User:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    user.sqlmodel_update(user_data, update=extra_data)
    session.add(user)
    # Don't commit here - let the caller decide when to commit
    return user


def get_user_by_username(*, session: Session, username: str) -> User | None:
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    return user


def authenticate(*, session: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(session=session, username=username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
