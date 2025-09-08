"""Comprehensive test suite for audit endpoints."""
import uuid
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.audit import log_audit
from app.core.config import settings
from app.models import AuditLog, UserRole
from app.tests.factories.booking_factory import BookingFactory
from app.tests.factories.customer_factory import CustomerFactory
from app.tests.factories.room_factory import RoomFactory
from app.tests.factories.user_factory import UserFactory


class TestAuditRead:
    """Tests for audit log read endpoints."""

    def test_read_audit_logs_as_admin(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test admin can read audit logs."""
        # Create some audit logs
        admin = UserFactory.get_admin_user(db)
        for i in range(5):
            log_audit(
                session=db,
                user=admin,
                action="created",
                entity_type="test_entity",
                entity_id=uuid.uuid4(),
                entity_name=f"Test Entity {i}",
            )

        response = client.get(
            f"{settings.API_V1_STR}/audit/",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 5
        assert len(content["data"]) >= 5

        # Check that username is included
        for log in content["data"]:
            assert "username" in log
            assert log["username"] == admin.username

    def test_read_audit_logs_as_manager_denied(
        self,
        client: TestClient,
        db: Session,
        manager_headers: dict[str, str],
    ) -> None:
        """Test manager cannot read audit logs."""
        response = client.get(
            f"{settings.API_V1_STR}/audit/",
            headers=manager_headers,
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_read_audit_logs_as_host_denied(
        self,
        client: TestClient,
        db: Session,
        host_headers: dict[str, str],
    ) -> None:
        """Test host cannot read audit logs."""
        response = client.get(
            f"{settings.API_V1_STR}/audit/",
            headers=host_headers,
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_read_audit_logs_unauthenticated_denied(
        self,
        client: TestClient,
    ) -> None:
        """Test unauthenticated users cannot read audit logs."""
        response = client.get(f"{settings.API_V1_STR}/audit/")
        assert response.status_code == 401

    def test_read_audit_logs_filter_by_user(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test filtering audit logs by username."""
        # Create users with distinct names
        user1 = UserFactory.create_test_user(db, username="testuser1", role=UserRole.HOST)
        user2 = UserFactory.create_test_user(db, username="testuser2", role=UserRole.HOST)

        # Create audit logs for each user
        for i in range(3):
            log_audit(
                session=db,
                user=user1,
                action="created",
                entity_type="booking",
                entity_id=uuid.uuid4(),
                entity_name=f"Booking {i}",
            )

        for i in range(2):
            log_audit(
                session=db,
                user=user2,
                action="updated",
                entity_type="customer",
                entity_id=uuid.uuid4(),
                entity_name=f"Customer {i}",
            )

        # Filter by user1's username
        response = client.get(
            f"{settings.API_V1_STR}/audit/?user_name=testuser1",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 3
        for log in content["data"]:
            assert "testuser1" in log["username"]

    def test_read_audit_logs_filter_by_action(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test filtering audit logs by action."""
        admin = UserFactory.get_admin_user(db)

        # Create logs with different actions
        log_audit(db, admin, "created", "room", uuid.uuid4(), "Room 101")
        log_audit(db, admin, "updated", "room", uuid.uuid4(), "Room 102")
        log_audit(db, admin, "deleted", "room", uuid.uuid4(), "Room 103")
        log_audit(db, admin, "created", "customer", uuid.uuid4(), "John Doe")

        # Filter by "created" action
        response = client.get(
            f"{settings.API_V1_STR}/audit/?action=created",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2
        for log in content["data"]:
            assert log["action"] == "created"

    def test_read_audit_logs_filter_by_entity_type(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test filtering audit logs by entity type."""
        admin = UserFactory.get_admin_user(db)

        # Create logs for different entity types
        log_audit(db, admin, "created", "booking", uuid.uuid4(), "Booking 1")
        log_audit(db, admin, "created", "booking", uuid.uuid4(), "Booking 2")
        log_audit(db, admin, "created", "customer", uuid.uuid4(), "Customer 1")
        log_audit(db, admin, "created", "room", uuid.uuid4(), "Room 1")

        # Filter by "booking" entity type
        response = client.get(
            f"{settings.API_V1_STR}/audit/?entity_type=booking",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2
        for log in content["data"]:
            assert log["entity_type"] == "booking"

    def test_read_audit_logs_search(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test searching audit logs."""
        admin = UserFactory.get_admin_user(db)
        unique_user = UserFactory.create_test_user(
            db,
            username="unique_searcher",
            role=UserRole.HOST
        )

        # Create logs with searchable content
        log_audit(
            db,
            admin,
            "created",
            "booking",
            uuid.uuid4(),
            "Special Holiday Booking",
            description="Created booking for holiday season"
        )
        log_audit(
            db,
            unique_user,
            "updated",
            "customer",
            uuid.uuid4(),
            "John Holiday",
            description="Updated customer information"
        )
        log_audit(
            db,
            admin,
            "deleted",
            "room",
            uuid.uuid4(),
            "Room 404",
            description="Deleted unused room"
        )

        # Search for "holiday"
        response = client.get(
            f"{settings.API_V1_STR}/audit/?search=holiday",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2  # Should find at least 2 entries

        # Search by username
        response = client.get(
            f"{settings.API_V1_STR}/audit/?search=unique_searcher",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 1

    def test_read_audit_logs_pagination(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test audit logs pagination."""
        admin = UserFactory.get_admin_user(db)

        # Create 15 audit logs
        for i in range(15):
            log_audit(
                db,
                admin,
                "created",
                "test",
                uuid.uuid4(),
                f"Test {i}",
            )

        # Get first page
        response = client.get(
            f"{settings.API_V1_STR}/audit/?skip=0&limit=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) == 5
        assert content["count"] >= 15

        # Get second page
        response = client.get(
            f"{settings.API_V1_STR}/audit/?skip=5&limit=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) == 5

        # Get third page
        response = client.get(
            f"{settings.API_V1_STR}/audit/?skip=10&limit=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) >= 5

    def test_read_audit_logs_order_by_timestamp(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test audit logs are ordered by timestamp descending."""
        admin = UserFactory.get_admin_user(db)

        # Create logs with different timestamps
        for i in range(5):
            log = AuditLog(
                user_id=admin.id,
                action=f"action_{i}",
                entity_type="test",
                entity_id=uuid.uuid4(),
                entity_name=f"Test {i}",
                description=f"Test audit log {i}",
                timestamp=datetime.utcnow() - timedelta(hours=i),
            )
            db.add(log)
        db.commit()

        response = client.get(
            f"{settings.API_V1_STR}/audit/",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()

        # Verify descending order
        timestamps = [log["timestamp"] for log in content["data"][:5]]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_read_audit_log_by_id(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test reading single audit log by ID."""
        admin = UserFactory.get_admin_user(db)

        # Create an audit log
        audit_log = AuditLog(
            user_id=admin.id,
            action="created",
            entity_type="booking",
            entity_id=uuid.uuid4(),
            entity_name="Test Booking",
            description="Created a test booking",
            old_values=None,
            new_values={"status": "confirmed"},
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        response = client.get(
            f"{settings.API_V1_STR}/audit/{audit_log.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["id"] == str(audit_log.id)
        assert content["action"] == "created"
        assert content["entity_name"] == "Test Booking"
        assert content["username"] == admin.username

    def test_read_audit_log_nonexistent(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Test reading nonexistent audit log."""
        fake_id = uuid.uuid4()

        response = client.get(
            f"{settings.API_V1_STR}/audit/{fake_id}",
            headers=admin_headers,
        )

        assert response.status_code == 404
        assert "Audit log not found" in response.json()["detail"]

    def test_read_audit_log_by_id_permission_denied(
        self,
        client: TestClient,
        db: Session,
        manager_headers: dict[str, str],
    ) -> None:
        """Test non-admin cannot read audit log by ID."""
        admin = UserFactory.get_admin_user(db)

        audit_log = AuditLog(
            user_id=admin.id,
            action="created",
            entity_type="test",
            entity_id=uuid.uuid4(),
            entity_name="Test",
            description="Admin created test entity",
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        response = client.get(
            f"{settings.API_V1_STR}/audit/{audit_log.id}",
            headers=manager_headers,
        )

        assert response.status_code == 403


class TestAuditStats:
    """Tests for audit statistics endpoint."""

    def test_get_audit_stats_as_admin(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test admin can get audit statistics."""
        admin = UserFactory.get_admin_user(db)
        host = UserFactory.create_test_user(db, role=UserRole.HOST)

        # Create various audit logs
        # By action
        for _ in range(5):
            log_audit(db, admin, "created", "booking", uuid.uuid4(), "Booking")
        for _ in range(3):
            log_audit(db, admin, "updated", "booking", uuid.uuid4(), "Booking")
        for _ in range(2):
            log_audit(db, admin, "deleted", "booking", uuid.uuid4(), "Booking")

        # By entity type
        for _ in range(4):
            log_audit(db, host, "created", "customer", uuid.uuid4(), "Customer")
        for _ in range(2):
            log_audit(db, host, "created", "room", uuid.uuid4(), "Room")

        response = client.get(
            f"{settings.API_V1_STR}/audit/stats/summary",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()

        # Check structure
        assert "total_logs" in content
        assert "by_action" in content
        assert "by_entity_type" in content
        assert "top_users" in content

        # Verify counts
        assert content["total_logs"] >= 16

        # Check action stats
        action_counts = {item["action"]: item["count"] for item in content["by_action"]}
        assert action_counts.get("created", 0) >= 11
        assert action_counts.get("updated", 0) >= 3
        assert action_counts.get("deleted", 0) >= 2

        # Check entity type stats
        entity_counts = {item["entity_type"]: item["count"] for item in content["by_entity_type"]}
        assert entity_counts.get("booking", 0) >= 10
        assert entity_counts.get("customer", 0) >= 4
        assert entity_counts.get("room", 0) >= 2

        # Check top users
        assert len(content["top_users"]) > 0
        assert content["top_users"][0]["username"] in [admin.username, host.username]

    def test_get_audit_stats_permission_denied(
        self,
        client: TestClient,
        manager_headers: dict[str, str],
    ) -> None:
        """Test non-admin cannot get audit statistics."""
        response = client.get(
            f"{settings.API_V1_STR}/audit/stats/summary",
            headers=manager_headers,
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_get_audit_stats_unauthenticated(
        self,
        client: TestClient,
    ) -> None:
        """Test unauthenticated users cannot get audit statistics."""
        response = client.get(f"{settings.API_V1_STR}/audit/stats/summary")
        assert response.status_code == 401


class TestAuditIntegration:
    """Tests for audit logging integration with other operations."""

    def test_booking_operations_create_audit_logs(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that booking operations create audit logs."""
        # Create a booking
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": datetime.utcnow().isoformat(),
            "check_out": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "status": "confirmed",
            "total_amount": room.price_per_night,
            "discount": 0,
            "payment_method": "cash",
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )
        if response.status_code != 200:
            print(f"Booking creation failed: {response.json()}")
        assert response.status_code == 200
        booking_id = response.json()["id"]

        # Check audit log was created
        response = client.get(
            f"{settings.API_V1_STR}/audit/?entity_type=booking&action=created",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 1

        # Find the specific audit log
        found = False
        for log in content["data"]:
            if str(log["entity_id"]) == booking_id:
                found = True
                assert log["action"] == "created"
                assert "Booking" in log["entity_name"]
                break
        assert found, "Audit log for booking creation not found"

    def test_customer_operations_create_audit_logs(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that customer operations create audit logs."""
        # Create a customer
        customer_data = {
            "first_name": "Test",
            "last_name": "Customer",
            "phone": "+1234567890",
            "notes": "Test customer for audit",
        }

        response = client.post(
            f"{settings.API_V1_STR}/customers/",
            headers=admin_headers,
            json=customer_data,
        )
        assert response.status_code == 200
        customer_id = response.json()["id"]

        # Update the customer
        update_data = {"phone": "+9876543210"}
        response = client.put(
            f"{settings.API_V1_STR}/customers/{customer_id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200

        # Check audit logs
        response = client.get(
            f"{settings.API_V1_STR}/audit/?entity_type=customer",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2  # Create and update

        # Verify both actions exist
        actions = [log["action"] for log in content["data"] if str(log["entity_id"]) == customer_id]
        assert "created" in actions
        assert "updated" in actions

    def test_room_operations_create_audit_logs(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that room operations create audit logs."""
        # Create a room
        room_data = {
            "room_number": "999",
            "room_type": "vip",
            "floor": 9,
            "status": "available",
            "price_per_night": 200.0,
        }

        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=room_data,
        )
        if response.status_code != 200:
            print(f"Room creation failed: {response.json()}")
        assert response.status_code == 200
        room_id = response.json()["id"]

        # Delete the room
        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{room_id}",
            headers=admin_headers,
        )
        assert response.status_code == 200

        # Check audit logs
        response = client.get(
            f"{settings.API_V1_STR}/audit/?entity_type=room",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()

        # Verify both actions exist
        actions = [log["action"] for log in content["data"] if str(log["entity_id"]) == room_id]
        assert "created" in actions
        assert "deleted" in actions

    def test_check_in_creates_audit_log(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that check-in creates specific audit log."""
        # Create a booking
        room = RoomFactory.create_test_room(db)
        booking = BookingFactory.create_confirmed_booking(db, room=room)

        # Check in
        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-in",
            headers=admin_headers,
        )
        assert response.status_code == 200

        # Check audit log
        response = client.get(
            f"{settings.API_V1_STR}/audit/?action=checked_in",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()

        # Find the specific audit log
        found = False
        for log in content["data"]:
            if str(log["entity_id"]) == str(booking.id):
                found = True
                assert log["action"] == "checked_in"
                assert log["entity_type"] == "booking"
                break
        assert found, "Audit log for check-in not found"

    def test_check_out_creates_audit_log(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that check-out creates specific audit log."""
        # Create a checked-in booking
        booking = BookingFactory.create_checked_in_booking(db)

        # Check out
        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-out",
            headers=admin_headers,
        )
        assert response.status_code == 200

        # Check audit log
        response = client.get(
            f"{settings.API_V1_STR}/audit/?action=checked_out",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()

        # Find the specific audit log
        found = False
        for log in content["data"]:
            if str(log["entity_id"]) == str(booking.id):
                found = True
                assert log["action"] == "checked_out"
                assert log["entity_type"] == "booking"
                break
        assert found, "Audit log for check-out not found"

    def test_audit_log_includes_old_and_new_values(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that audit logs include old and new values for updates."""
        # Create a customer
        customer = CustomerFactory.create_test_customer(db, phone="+1111111111")

        # Update the customer
        update_data = {
            "phone": "+2222222222",
            "email": "newemail@example.com",
        }

        response = client.put(
            f"{settings.API_V1_STR}/customers/{customer.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200

        # Get audit logs for this update
        response = client.get(
            f"{settings.API_V1_STR}/audit/?entity_type=customer&action=updated",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()

        # Find the specific audit log
        for log in content["data"]:
            if str(log["entity_id"]) == str(customer.id):
                assert log["old_values"] is not None
                assert log["new_values"] is not None
                assert log["old_values"]["phone"] == "+1111111111"
                assert log["new_values"]["phone"] == "+2222222222"
                break

    def test_audit_log_with_null_user(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test audit log handles null user gracefully."""
        # Create an audit log with null user (system operation)
        audit_log = AuditLog(
            user_id=None,  # System operation
            action="system_cleanup",
            entity_type="session",
            entity_id=uuid.uuid4(),
            entity_name="Old Session",
            description="System cleaned up expired session",
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        # Read the audit log
        response = client.get(
            f"{settings.API_V1_STR}/audit/{audit_log.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["username"] == "Unknown"


class TestAuditComplexQueries:
    """Tests for complex audit query combinations."""

    def test_combined_filters(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test combining multiple filters."""
        admin = UserFactory.get_admin_user(db)
        host = UserFactory.create_test_user(db, username="specific_host", role=UserRole.HOST)

        # Create specific audit logs
        log_audit(db, host, "created", "booking", uuid.uuid4(), "Host Booking 1")
        log_audit(db, host, "created", "booking", uuid.uuid4(), "Host Booking 2")
        log_audit(db, host, "updated", "booking", uuid.uuid4(), "Host Booking 3")
        log_audit(db, admin, "created", "booking", uuid.uuid4(), "Admin Booking")
        log_audit(db, host, "created", "customer", uuid.uuid4(), "Host Customer")

        # Filter by username AND action AND entity_type
        response = client.get(
            f"{settings.API_V1_STR}/audit/?user_name=specific_host&action=created&entity_type=booking",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] == 2

        for log in content["data"]:
            assert "specific_host" in log["username"]
            assert log["action"] == "created"
            assert log["entity_type"] == "booking"

    def test_search_with_filters(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test search combined with filters."""
        admin = UserFactory.get_admin_user(db)

        # Create audit logs with specific patterns
        log_audit(
            db,
            admin,
            "created",
            "booking",
            uuid.uuid4(),
            "VIP Suite Booking",
            description="Created VIP booking for presidential suite"
        )
        log_audit(
            db,
            admin,
            "updated",
            "booking",
            uuid.uuid4(),
            "Standard Room Booking",
            description="Updated VIP status for customer"
        )
        log_audit(
            db,
            admin,
            "created",
            "customer",
            uuid.uuid4(),
            "VIP Customer John",
            description="Created VIP customer profile"
        )

        # Search for "VIP" with entity_type filter
        response = client.get(
            f"{settings.API_V1_STR}/audit/?search=VIP&entity_type=booking",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2

        for log in content["data"]:
            assert log["entity_type"] == "booking"
            # Should contain VIP in name or description
            assert ("VIP" in log.get("entity_name", "") or
                    "VIP" in log.get("description", ""))

    def test_empty_results(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test handling of queries with no results."""
        # Search for non-existent content
        response = client.get(
            f"{settings.API_V1_STR}/audit/?search=nonexistent_xyz_123",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] == 0
        assert content["data"] == []

    def test_case_insensitive_search(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test that search is case-insensitive."""
        admin = UserFactory.get_admin_user(db)

        # Create audit log with mixed case
        log_audit(
            db,
            admin,
            "created",
            "booking",
            uuid.uuid4(),
            "Special PREMIUM Booking",
            description="Created Premium Package Deal"
        )

        # Search with different cases
        for search_term in ["premium", "PREMIUM", "Premium", "pReMiUm"]:
            response = client.get(
                f"{settings.API_V1_STR}/audit/?search={search_term}",
                headers=admin_headers,
            )

            assert response.status_code == 200
            content = response.json()
            assert content["count"] >= 1, f"Failed to find with search term: {search_term}"
