from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel, select

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)

class ConcurrentUpdateError(Exception):
    """Raised when a concurrent update is detected via optimistic locking."""
    pass

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, session: Session, id: UUID) -> ModelType | None:
        return session.get(self.model, id)

    def get_multi(
        self, session: Session, *, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        statement = select(self.model).offset(skip).limit(limit)
        return list(session.exec(statement).all())

    def create(self, session: Session, *, obj_in: CreateSchemaType) -> ModelType:
        db_obj = self.model.model_validate(obj_in)
        session.add(db_obj)
        session.flush()
        return db_obj

    def update(
        self, session: Session, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        """
        Update a database object with optimistic locking support.

        If the object has a 'version' field, it will be incremented and checked
        to prevent concurrent updates.

        Raises:
            ConcurrentUpdateError: If another process has updated the record
        """
        update_data = obj_in.model_dump(exclude_unset=True)

        # Handle optimistic locking if version field exists
        if hasattr(db_obj, 'version'):
            # Store the current version
            current_version = db_obj.version
            # Increment version for the update
            db_obj.version = current_version + 1

            # Update the object with new data
            db_obj.sqlmodel_update(update_data)
            session.add(db_obj)

            try:
                session.flush()
            except IntegrityError:
                session.rollback()
                raise ConcurrentUpdateError(
                    "Record was modified by another user. Please refresh and try again."
                )

            # Verify the update actually happened (version was correct)
            # This is a double-check for databases that don't enforce it
            session.refresh(db_obj)
            if db_obj.version != current_version + 1:
                session.rollback()
                raise ConcurrentUpdateError(
                    "Record was modified by another user. Please refresh and try again."
                )
        else:
            # No version field, proceed with normal update
            db_obj.sqlmodel_update(update_data)
            session.add(db_obj)
            session.flush()

        return db_obj

    def delete(self, session: Session, *, id: UUID) -> ModelType | None:
        obj = session.get(self.model, id)
        if obj:
            session.delete(obj)
            session.flush()
        return obj

    def count(self, session: Session) -> int:
        from sqlmodel import func
        statement = select(func.count()).select_from(self.model)
        return session.exec(statement).one()
