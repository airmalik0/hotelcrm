"""
Base factory class for test data creation.

Following clean architecture principles:
- Factories use CRUD layer for database operations
- No business logic in factories
- Clear separation between build() and create()
"""
from typing import Any, Generic, TypeVar

from sqlmodel import Session, SQLModel

from app.crud.base import CRUDBase

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)


class BaseFactory(Generic[ModelType, CreateSchemaType]):
    """
    Base factory for creating test objects.
    
    Provides two main methods:
    - build(): Creates an object without persisting (for unit tests)
    - create(): Creates and persists via CRUD layer (for integration tests)
    """
    
    model: type[ModelType]
    create_schema: type[CreateSchemaType]
    crud: CRUDBase[ModelType, CreateSchemaType, UpdateSchemaType] | None = None
    
    @classmethod
    def build(cls, **kwargs: Any) -> CreateSchemaType:
        """
        Build an object without persisting to database.
        
        Use this for:
        - Unit tests that don't need database
        - Creating request payloads for API tests
        - Testing validation logic
        
        Args:
            **kwargs: Fields for the create schema
            
        Returns:
            CreateSchemaType instance (not persisted)
        """
        return cls.create_schema(**cls.get_defaults(**kwargs))
    
    @classmethod
    def create(cls, session: Session, **kwargs: Any) -> ModelType:
        """
        Create and persist an object via CRUD layer.
        
        Use this for:
        - Integration tests that need persisted data
        - Setting up test prerequisites
        - Testing database operations
        
        Args:
            session: Database session
            **kwargs: Fields for the model
            
        Returns:
            ModelType instance (persisted)
        """
        if cls.crud is None:
            raise NotImplementedError(
                f"{cls.__name__} must define a crud attribute"
            )
        
        obj_in = cls.build(**kwargs)
        db_obj = cls.crud.create(session, obj_in=obj_in)
        session.flush()  # Ensure ID is available
        return db_obj
    
    @classmethod
    def create_batch(cls, session: Session, count: int = 3, **kwargs: Any) -> list[ModelType]:
        """
        Create multiple objects with optional field variations.
        
        Args:
            session: Database session
            count: Number of objects to create
            **kwargs: Base fields for all objects
            
        Returns:
            List of created objects
        """
        objects = []
        for i in range(count):
            # Allow for field variations via callable
            item_kwargs = {}
            for key, value in kwargs.items():
                if callable(value):
                    item_kwargs[key] = value(i)
                else:
                    item_kwargs[key] = value
            
            obj = cls.create(session, **item_kwargs)
            objects.append(obj)
        
        return objects
    
    @classmethod
    def get_defaults(cls, **overrides: Any) -> dict[str, Any]:
        """
        Get default values for object creation.
        
        Subclasses should override this to provide sensible defaults.
        
        Args:
            **overrides: Values to override defaults
            
        Returns:
            Dictionary of field values
        """
        return overrides