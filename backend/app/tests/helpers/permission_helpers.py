"""Permission Testing Helper Utilities

This module provides helper functions for testing API endpoint permissions
systematically across different user roles.
"""

from typing import Any, Literal


class PermissionTestHelper:
    """Helper class for testing endpoint permissions."""
    
    @staticmethod
    def test_endpoint_permissions(
        client: Any,
        endpoint: str,
        method: Literal["GET", "POST", "PUT", "DELETE", "PATCH"] = "GET",
        json_data: dict[str, Any] | None = None,
        admin_headers: dict[str, str] | None = None,
        manager_headers: dict[str, str] | None = None,
        host_headers: dict[str, str] | None = None,
        admin_allowed: bool = True,
        manager_allowed: bool = True,
        host_allowed: bool = False,
        unauthenticated_allowed: bool = False
    ) -> dict[str, Any]:
        """Test endpoint with different permission levels.
        
        Args:
            client: Test client instance
            endpoint: API endpoint path
            method: HTTP method to test
            json_data: Optional JSON data for POST/PUT requests
            admin_headers: Admin authentication headers
            manager_headers: Manager authentication headers
            host_headers: Host authentication headers
            admin_allowed: Whether admin should have access
            manager_allowed: Whether manager should have access
            host_allowed: Whether host should have access
            unauthenticated_allowed: Whether unauthenticated access is allowed
            
        Returns:
            Dictionary with test results for each role
        """
        results = {}
        
        # Prepare request kwargs
        request_kwargs = {}
        if json_data:
            request_kwargs["json"] = json_data
        
        # Test unauthenticated access
        response = client.request(method, endpoint, **request_kwargs)
        expected_status = 200 if unauthenticated_allowed else 401
        assert response.status_code == expected_status, (
            f"Unauthenticated: expected {expected_status}, got {response.status_code}"
        )
        results["unauthenticated"] = response.status_code
        
        # Test host access (if headers provided)
        if host_headers:
            response = client.request(
                method, endpoint, headers=host_headers, **request_kwargs
            )
            expected_status = 200 if host_allowed else 403
            assert response.status_code == expected_status, (
                f"Host: expected {expected_status}, got {response.status_code}"
            )
            results["host"] = response.status_code
        
        # Test manager access (if headers provided)
        if manager_headers:
            response = client.request(
                method, endpoint, headers=manager_headers, **request_kwargs
            )
            expected_status = 200 if manager_allowed else 403
            assert response.status_code == expected_status, (
                f"Manager: expected {expected_status}, got {response.status_code}"
            )
            results["manager"] = response.status_code
        
        # Test admin access (if headers provided)
        if admin_headers:
            response = client.request(
                method, endpoint, headers=admin_headers, **request_kwargs
            )
            expected_status = 200 if admin_allowed else 403
            assert response.status_code == expected_status, (
                f"Admin: expected {expected_status}, got {response.status_code}. "
                f"Response: {response.text}"
            )
            results["admin"] = response.status_code
        
        return results
    
    @staticmethod
    def test_crud_permissions(
        client: Any,
        resource_path: str,
        resource_id: str,
        create_data: dict[str, Any],
        update_data: dict[str, Any],
        admin_headers: dict[str, str] | None = None,
        manager_headers: dict[str, str] | None = None,
        host_headers: dict[str, str] | None = None,
        create_permissions: dict[str, bool] | None = None,
        read_permissions: dict[str, bool] | None = None,
        update_permissions: dict[str, bool] | None = None,
        delete_permissions: dict[str, bool] | None = None
    ) -> None:
        """Test full CRUD permissions for a resource.
        
        Args:
            client: Test client instance
            resource_path: Base API path for the resource (e.g., "/customers")
            resource_id: ID of existing resource for read/update/delete tests
            create_data: Data for testing POST endpoint
            update_data: Data for testing PUT endpoint
            admin_headers: Admin authentication headers
            manager_headers: Manager authentication headers  
            host_headers: Host authentication headers
            create_permissions: Dict of role permissions for CREATE
            read_permissions: Dict of role permissions for READ
            update_permissions: Dict of role permissions for UPDATE
            delete_permissions: Dict of role permissions for DELETE
        """
        # Default permissions if not specified
        default_admin_only = {"admin": True, "manager": False, "host": False}
        default_admin_manager = {"admin": True, "manager": True, "host": False}
        
        create_perms = create_permissions or default_admin_manager
        read_perms = read_permissions or default_admin_manager
        update_perms = update_permissions or default_admin_manager
        delete_perms = delete_permissions or default_admin_only
        
        # Test CREATE permissions
        PermissionTestHelper.test_endpoint_permissions(
            client=client,
            endpoint=f"{resource_path}/",
            method="POST",
            json_data=create_data,
            admin_headers=admin_headers,
            manager_headers=manager_headers,
            host_headers=host_headers,
            admin_allowed=create_perms.get("admin", True),
            manager_allowed=create_perms.get("manager", False),
            host_allowed=create_perms.get("host", False)
        )
        
        # Test READ permissions
        PermissionTestHelper.test_endpoint_permissions(
            client=client,
            endpoint=f"{resource_path}/{resource_id}",
            method="GET",
            admin_headers=admin_headers,
            manager_headers=manager_headers,
            host_headers=host_headers,
            admin_allowed=read_perms.get("admin", True),
            manager_allowed=read_perms.get("manager", False),
            host_allowed=read_perms.get("host", False)
        )
        
        # Test UPDATE permissions
        PermissionTestHelper.test_endpoint_permissions(
            client=client,
            endpoint=f"{resource_path}/{resource_id}",
            method="PUT",
            json_data=update_data,
            admin_headers=admin_headers,
            manager_headers=manager_headers,
            host_headers=host_headers,
            admin_allowed=update_perms.get("admin", True),
            manager_allowed=update_perms.get("manager", False),
            host_allowed=update_perms.get("host", False)
        )
        
        # Test DELETE permissions
        PermissionTestHelper.test_endpoint_permissions(
            client=client,
            endpoint=f"{resource_path}/{resource_id}",
            method="DELETE",
            admin_headers=admin_headers,
            manager_headers=manager_headers,
            host_headers=host_headers,
            admin_allowed=delete_perms.get("admin", True),
            manager_allowed=delete_perms.get("manager", False),
            host_allowed=delete_perms.get("host", False)
        )
    
    @staticmethod
    def assert_permission_denied(response: Any, expected_status: int = 403) -> None:
        """Assert that a response indicates permission denied.
        
        Args:
            response: The HTTP response object
            expected_status: Expected status code (403 or 401)
        """
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.text}"
        )
        
        if expected_status == 403:
            detail = response.json().get("detail", "")
            assert "permission" in detail.lower() or "forbidden" in detail.lower(), (
                f"Expected permission error message, got: {detail}"
            )
    
    @staticmethod
    def assert_authentication_required(response: Any) -> None:
        """Assert that a response requires authentication.
        
        Args:
            response: The HTTP response object
        """
        assert response.status_code == 401, (
            f"Expected status 401, got {response.status_code}. "
            f"Response: {response.text}"
        )
        
        detail = response.json().get("detail", "")
        assert "not authenticated" in detail.lower() or "unauthorized" in detail.lower(), (
            f"Expected authentication error message, got: {detail}"
        )