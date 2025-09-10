"""Mock Helper Utilities for Testing

This module provides mock objects for unit testing services and CRUD operations.
Helps isolate layers during testing following clean architecture.
"""

from typing import Any, Generic, TypeVar
from unittest.mock import Mock, MagicMock
from uuid import UUID, uuid4
from sqlmodel import SQLModel


ModelType = TypeVar("ModelType", bound=SQLModel)


class MockCRUD(Generic[ModelType]):
    """Base mock for CRUD operations."""
    
    def __init__(self, model_class: type[ModelType]):
        """Initialize mock CRUD with model class.
        
        Args:
            model_class: The SQLModel class this CRUD handles
        """
        self.model = model_class
        
        # Mock all standard CRUD methods
        self.get = Mock(return_value=None)
        self.get_multi = Mock(return_value=[])
        self.create = Mock()
        self.update = Mock()
        self.delete = Mock()
        self.count = Mock(return_value=0)
        
        # Additional common methods
        self.get_by_id = Mock(return_value=None)
        self.exists = Mock(return_value=False)
        
    def setup_get_response(self, return_value: ModelType | None) -> None:
        """Configure the get method to return a specific value."""
        self.get.return_value = return_value
        self.get_by_id.return_value = return_value
        
    def setup_get_multi_response(self, return_value: list[ModelType]) -> None:
        """Configure the get_multi method to return specific values."""
        self.get_multi.return_value = return_value
        
    def setup_create_response(self, return_value: ModelType) -> None:
        """Configure the create method to return a specific value."""
        self.create.return_value = return_value
        
    def setup_update_response(self, return_value: ModelType) -> None:
        """Configure the update method to return a specific value."""
        self.update.return_value = return_value
        
    def assert_get_called_with(self, session: Any, id_value: UUID) -> None:
        """Assert that get was called with specific parameters."""
        self.get.assert_called_with(session, id_value)
        
    def assert_create_called_once(self) -> None:
        """Assert that create was called exactly once."""
        self.create.assert_called_once()


class MockService:
    """Base mock for service operations."""
    
    def __init__(self):
        """Initialize mock service."""
        self.session = Mock()
        self.crud = MockCRUD(SQLModel)
        
        # Common service methods
        self.get = Mock(return_value=None)
        self.get_multi = Mock(return_value=[])
        self.create = Mock()
        self.update = Mock()
        self.delete = Mock()
        
    def setup_method_response(self, method_name: str, return_value: Any) -> None:
        """Configure a specific method to return a value.
        
        Args:
            method_name: Name of the method to configure
            return_value: Value to return when method is called
        """
        if hasattr(self, method_name):
            getattr(self, method_name).return_value = return_value
        else:
            setattr(self, method_name, Mock(return_value=return_value))
            
    def setup_method_side_effect(self, method_name: str, side_effect: Any) -> None:
        """Configure a method to raise an exception or have side effects.
        
        Args:
            method_name: Name of the method to configure
            side_effect: Exception to raise or function to call
        """
        if hasattr(self, method_name):
            getattr(self, method_name).side_effect = side_effect
        else:
            mock = Mock()
            mock.side_effect = side_effect
            setattr(self, method_name, mock)


class MockSession:
    """Mock database session for testing."""
    
    def __init__(self):
        """Initialize mock session."""
        self.add = Mock()
        self.commit = Mock()
        self.refresh = Mock()
        self.flush = Mock()
        self.rollback = Mock()
        self.close = Mock()
        self.exec = Mock()
        self.get = Mock(return_value=None)
        self.query = Mock()
        
        # Make exec return a mock that has first() method
        mock_result = Mock()
        mock_result.first = Mock(return_value=None)
        mock_result.all = Mock(return_value=[])
        mock_result.one = Mock(side_effect=Exception("No results found"))
        self.exec.return_value = mock_result
        
    def setup_exec_result(self, first_value: Any = None, all_values: list[Any] | None = None) -> None:
        """Configure exec to return specific results.
        
        Args:
            first_value: Value to return from .first()
            all_values: Values to return from .all()
        """
        mock_result = Mock()
        mock_result.first = Mock(return_value=first_value)
        mock_result.all = Mock(return_value=all_values or [])
        self.exec.return_value = mock_result
        
    def setup_get_result(self, model_class: type[SQLModel], id_value: UUID, return_value: Any) -> None:
        """Configure get to return specific value for an ID.
        
        Args:
            model_class: The model class being fetched
            id_value: The ID being looked up
            return_value: Value to return
        """
        self.get.return_value = return_value


class ServiceTestHelper:
    """Helper for testing service layer."""
    
    @staticmethod
    def create_mock_crud(model_class: type[SQLModel]) -> MockCRUD:
        """Create a mock CRUD instance for testing.
        
        Args:
            model_class: The model class this CRUD handles
            
        Returns:
            Configured MockCRUD instance
        """
        return MockCRUD(model_class)
    
    @staticmethod
    def create_mock_session() -> MockSession:
        """Create a mock database session for testing.
        
        Returns:
            Configured MockSession instance
        """
        return MockSession()
    
    @staticmethod
    def create_mock_service() -> MockService:
        """Create a mock service instance for testing.
        
        Returns:
            Configured MockService instance
        """
        return MockService()
    
    @staticmethod
    def assert_business_error(
        func: Any, 
        *args: Any, 
        expected_error: type[Exception] = ValueError,
        error_pattern: str | None = None,
        **kwargs: Any
    ) -> None:
        """Assert that a service method raises a business logic error.
        
        Args:
            func: The function to call
            *args: Positional arguments to pass to function
            expected_error: Expected exception type
            error_pattern: Optional pattern to match in error message
            **kwargs: Keyword arguments to pass to function
        """
        try:
            func(*args, **kwargs)
            assert False, f"Expected {expected_error.__name__} to be raised"
        except expected_error as e:
            if error_pattern:
                assert error_pattern.lower() in str(e).lower(), (
                    f"Expected error pattern '{error_pattern}' not found in '{str(e)}'"
                )