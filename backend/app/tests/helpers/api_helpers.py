"""API Test Helper Utilities

This module provides helper functions for API testing that follow clean architecture.
Tests should only validate API responses, not database state.
"""

from typing import Any


class APITestHelper:
    """Helper class for API response testing."""

    @staticmethod
    def assert_success_response(
        response: Any, expected_status: int = 200
    ) -> dict[str, Any]:
        """Validate successful API response and return JSON content.
        
        Args:
            response: The HTTP response object
            expected_status: Expected HTTP status code (default: 200)
            
        Returns:
            The response JSON content
            
        Raises:
            AssertionError: If status code doesn't match expected
        """
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.text}"
        )
        return response.json()

    @staticmethod
    def assert_error_response(
        response: Any, 
        expected_status: int, 
        error_pattern: str | None = None
    ) -> None:
        """Validate error API response.
        
        Args:
            response: The HTTP response object
            expected_status: Expected HTTP error status code
            error_pattern: Optional pattern to match in error detail
            
        Raises:
            AssertionError: If status code doesn't match or pattern not found
        """
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.text}"
        )
        
        if error_pattern:
            error_detail = response.json().get("detail", "")
            if isinstance(error_detail, str):
                assert error_pattern.lower() in error_detail.lower(), (
                    f"Expected error pattern '{error_pattern}' not found in '{error_detail}'"
                )
            elif isinstance(error_detail, list):
                # Handle validation errors which return list of details
                error_messages = " ".join(str(e.get("msg", "")) for e in error_detail)
                assert error_pattern.lower() in error_messages.lower(), (
                    f"Expected error pattern '{error_pattern}' not found in validation errors"
                )

    @staticmethod
    def assert_pagination_response(
        response: Any,
        expected_status: int = 200,
        min_items: int = 0,
        max_items: int | None = None
    ) -> dict[str, Any]:
        """Validate paginated API response.
        
        Args:
            response: The HTTP response object
            expected_status: Expected HTTP status code
            min_items: Minimum expected items in data array
            max_items: Maximum expected items in data array
            
        Returns:
            The response JSON content
        """
        content = APITestHelper.assert_success_response(response, expected_status)
        
        # Check pagination structure
        assert "data" in content, "Paginated response must have 'data' field"
        assert "count" in content, "Paginated response must have 'count' field"
        
        items = content["data"]
        assert isinstance(items, list), "Data field must be a list"
        
        # Check item count constraints
        assert len(items) >= min_items, (
            f"Expected at least {min_items} items, got {len(items)}"
        )
        
        if max_items is not None:
            assert len(items) <= max_items, (
                f"Expected at most {max_items} items, got {len(items)}"
            )
        
        return content

    @staticmethod
    def extract_id(response: Any) -> str:
        """Extract ID from a successful creation response.
        
        Args:
            response: The HTTP response object
            
        Returns:
            The ID string from the response
        """
        content = APITestHelper.assert_success_response(response, 200)
        assert "id" in content, "Response must contain 'id' field"
        return str(content["id"])

    @staticmethod
    def verify_fields_updated(
        response: Any,
        expected_updates: dict[str, Any]
    ) -> None:
        """Verify that specific fields were updated in the response.
        
        Args:
            response: The HTTP response object
            expected_updates: Dictionary of field names and expected values
        """
        content = APITestHelper.assert_success_response(response, 200)
        
        for field, expected_value in expected_updates.items():
            assert field in content, f"Response missing field '{field}'"
            actual_value = content[field]
            assert actual_value == expected_value, (
                f"Field '{field}': expected '{expected_value}', got '{actual_value}'"
            )

    @staticmethod
    def verify_fields_present(
        response: Any,
        required_fields: list[str]
    ) -> dict[str, Any]:
        """Verify that required fields are present in the response.
        
        Args:
            response: The HTTP response object
            required_fields: List of field names that must be present
            
        Returns:
            The response JSON content
        """
        content = APITestHelper.assert_success_response(response, 200)
        
        missing_fields = [f for f in required_fields if f not in content]
        assert not missing_fields, (
            f"Response missing required fields: {', '.join(missing_fields)}"
        )
        
        return content