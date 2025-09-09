from typing import Generic, TypeVar
from uuid import UUID

from sqlmodel import Session, SQLModel, select

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, session: Session, id: UUID) -> ModelType | None:
        return session.get(self.model, id)

    def get_multi(
        self, session: Session, *, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        statement = select(self.model).offset(skip).limit(limit)
        return session.exec(statement).all()

    def create(self, session: Session, *, obj_in: CreateSchemaType) -> ModelType:
        db_obj = self.model.model_validate(obj_in)
        session.add(db_obj)
        session.flush()
        return db_obj

    def update(
        self, session: Session, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        update_data = obj_in.model_dump(exclude_unset=True)
        db_obj.sqlmodel_update(update_data)
        session.add(db_obj)
        session.flush()
        return db_obj

    def delete(self, session: Session, *, id: UUID) -> ModelType:
        obj = session.get(self.model, id)
        if obj:
            session.delete(obj)
            session.flush()
        return obj

    def count(self, session: Session) -> int:
        from sqlmodel import func
        statement = select(func.count()).select_from(self.model)
        return session.exec(statement).one()
