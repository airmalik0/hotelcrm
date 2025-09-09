"""
Comprehensive tests for rooms API endpoints.

Tests follow CRUD testing ideology:
- Complete isolation between tests
- Structure: Setup → Act → Assert → Teardown
- No dependencies between tests
- Clean database state for each test
"""
import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Room, RoomStatus, RoomType
from app.tests.factories.booking_factory import BookingFactory
from app.tests.factories.room_factory import RoomFactory


class TestRoomsCreate:
    """Test room creation endpoint."""

    def test_create_room_as_admin(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Admin can create a room."""
        data = {
            "room_number": "A101",
            "floor": 1,
            "room_type": RoomType.STANDARD.value,
            "price_per_night": 100.0,
            "status": RoomStatus.AVAILABLE.value,
            "description": "Test room",
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["room_number"] == "A101"
        assert content["floor"] == 1
        assert content["room_type"] == RoomType.STANDARD.value
        assert content["price_per_night"] == 100.0
        assert content["status"] == RoomStatus.AVAILABLE.value
        assert "id" in content

        # Verify in database
        room = db.exec(select(Room).where(Room.room_number == "A101")).first()
        assert room is not None
        assert room.room_number == "A101"

    def test_create_room_as_manager(
        self,
        client: TestClient,
        manager_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Manager can create a room."""
        data = {
            "room_number": "B202",
            "floor": 2,
            "room_type": RoomType.VIP.value,
            "price_per_night": 300.0,
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=manager_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["room_number"] == "B202"
        assert content["room_type"] == RoomType.VIP.value

    def test_create_room_as_host_forbidden(
        self,
        client: TestClient,
        host_headers: dict[str, str],
    ) -> None:
        """Host cannot create a room."""
        data = {
            "room_number": "C303",
            "floor": 3,
            "room_type": RoomType.STANDARD.value,
            "price_per_night": 150.0,
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=host_headers,
            json=data,
        )
        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower() or "manager" in response.json()["detail"].lower()

    def test_create_room_duplicate_number(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
    ) -> None:
        """Cannot create room with duplicate room number."""
        data = {
            "room_number": test_room.room_number,
            "floor": 5,
            "room_type": RoomType.STANDARD.value,
            "price_per_night": 200.0,
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=data,
        )
        assert response.status_code in [400, 409, 500]  # 500 for DB constraint violation

    def test_create_room_invalid_floor(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Cannot create room with invalid floor number."""
        data = {
            "room_number": "D404",
            "floor": 0,  # Invalid: must be >= 1
            "room_type": RoomType.STANDARD.value,
            "price_per_night": 100.0,
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=data,
        )
        assert response.status_code == 422

    def test_create_room_invalid_price(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Cannot create room with invalid price."""
        data = {
            "room_number": "E505",
            "floor": 5,
            "room_type": RoomType.STANDARD.value,
            "price_per_night": -100.0,  # Invalid: must be > 0
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=data,
        )
        assert response.status_code == 422

    def test_create_room_with_photo_paths(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Can create room with photo paths."""
        data = {
            "room_number": "F606",
            "floor": 6,
            "room_type": RoomType.VIP.value,
            "price_per_night": 500.0,
            "room_photo_paths": ["/photos/room1.jpg", "/photos/room2.jpg"],
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["room_photo_paths"]) == 2

    def test_create_room_number_normalization(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Room number is normalized to uppercase."""
        data = {
            "room_number": "g707",  # lowercase
            "floor": 7,
            "room_type": RoomType.STANDARD.value,
            "price_per_night": 100.0,
        }
        response = client.post(
            f"{settings.API_V1_STR}/rooms/",
            headers=admin_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["room_number"] == "G707"  # Normalized to uppercase


class TestRoomsRead:
    """Test room reading endpoints."""

    def test_read_rooms_list(
        self,
        client: TestClient,
        host_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Any authenticated user can list rooms."""
        # Create multiple rooms
        RoomFactory.create_multiple_rooms(db, count=5)

        response = client.get(
            f"{settings.API_V1_STR}/rooms/",
            headers=host_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert "data" in content
        assert "count" in content
        assert content["count"] >= 5
        assert len(content["data"]) >= 5

    def test_read_rooms_pagination(
        self,
        client: TestClient,
        host_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Test pagination of rooms list."""
        # Create 10 rooms
        RoomFactory.create_multiple_rooms(db, count=10)

        # Get first page
        response = client.get(
            f"{settings.API_V1_STR}/rooms/?skip=0&limit=5",
            headers=host_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) == 5

        # Get second page
        response = client.get(
            f"{settings.API_V1_STR}/rooms/?skip=5&limit=5",
            headers=host_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) >= 5

    def test_read_room_by_id(
        self,
        client: TestClient,
        host_headers: dict[str, str],
        test_room: Room,
    ) -> None:
        """Any authenticated user can read room by ID."""
        response = client.get(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=host_headers,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["id"] == str(test_room.id)
        assert content["room_number"] == test_room.room_number

    def test_read_room_not_found(
        self,
        client: TestClient,
        host_headers: dict[str, str],
    ) -> None:
        """Returns 404 for non-existent room."""
        fake_id = uuid.uuid4()
        response = client.get(
            f"{settings.API_V1_STR}/rooms/{fake_id}",
            headers=host_headers,
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_read_available_rooms(
        self,
        client: TestClient,
        host_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Can filter available rooms."""
        # Create rooms with different statuses
        available1 = RoomFactory.create_test_room(db, room_number="AV1", status=RoomStatus.AVAILABLE)
        available2 = RoomFactory.create_test_room(db, room_number="AV2", status=RoomStatus.AVAILABLE)
        occupied = RoomFactory.create_occupied_room(db, room_number="OC1")
        cleaning = RoomFactory.create_cleaning_room(db, room_number="CL1")
        maintenance = RoomFactory.create_maintenance_room(db, room_number="MT1")

        response = client.get(
            f"{settings.API_V1_STR}/rooms/available/",
            headers=host_headers,
        )
        assert response.status_code == 200
        content = response.json()

        # Should only return available rooms
        room_ids = [r["id"] for r in content["data"]]
        assert str(available1.id) in room_ids
        assert str(available2.id) in room_ids
        assert str(occupied.id) not in room_ids
        assert str(cleaning.id) not in room_ids
        assert str(maintenance.id) not in room_ids

    def test_read_rooms_unauthenticated(
        self,
        client: TestClient,
    ) -> None:
        """Unauthenticated user cannot access rooms."""
        response = client.get(f"{settings.API_V1_STR}/rooms/")
        assert response.status_code == 401


class TestRoomsUpdate:
    """Test room update endpoint."""

    def test_update_room_as_admin(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
        db: Session,
    ) -> None:
        """Admin can update a room."""
        update_data = {
            "price_per_night": 150.0,
            "status": RoomStatus.CLEANING.value,
            "description": "Updated description",
        }
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["price_per_night"] == 150.0
        assert content["status"] == RoomStatus.CLEANING.value
        assert content["description"] == "Updated description"

        # Verify in database
        db.refresh(test_room)
        assert test_room.price_per_night == 150.0
        assert test_room.status == RoomStatus.CLEANING

    def test_update_room_as_manager(
        self,
        client: TestClient,
        manager_headers: dict[str, str],
        test_room: Room,
    ) -> None:
        """Manager can update a room."""
        update_data = {
            "floor": 10,
            "room_type": RoomType.VIP.value,
        }
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=manager_headers,
            json=update_data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["floor"] == 10
        assert content["room_type"] == RoomType.VIP.value

    def test_update_room_as_host_forbidden(
        self,
        client: TestClient,
        host_headers: dict[str, str],
        test_room: Room,
    ) -> None:
        """Host cannot update a room."""
        update_data = {"price_per_night": 200.0}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=host_headers,
            json=update_data,
        )
        assert response.status_code == 403

    def test_update_room_not_found(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Returns 404 when updating non-existent room."""
        fake_id = uuid.uuid4()
        update_data = {"price_per_night": 200.0}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{fake_id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 404

    def test_update_room_duplicate_number(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
        db: Session,
    ) -> None:
        """Cannot update room to have duplicate room number."""
        other_room = RoomFactory.create_test_room(db, room_number="OTHER123")

        update_data = {"room_number": other_room.room_number}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code in [400, 409, 500]  # 500 for DB constraint violation

    def test_update_room_partial(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
        db: Session,
    ) -> None:
        """Can partially update room fields."""
        original_floor = test_room.floor
        original_type = test_room.room_type

        update_data = {"price_per_night": 175.0}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["price_per_night"] == 175.0
        assert content["floor"] == original_floor
        assert content["room_type"] == original_type.value


class TestRoomsDelete:
    """Test room deletion endpoint."""

    def test_delete_room_as_admin(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
        db: Session,
    ) -> None:
        """Admin can delete a room without bookings."""
        room_id = test_room.id
        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{room_id}",
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify room is deleted
        room = db.get(Room, room_id)
        assert room is None

    def test_delete_room_as_manager(
        self,
        client: TestClient,
        manager_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Manager can delete a room without bookings."""
        room = RoomFactory.create_test_room(db)
        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{room.id}",
            headers=manager_headers,
        )
        assert response.status_code == 200

    def test_delete_room_as_host_forbidden(
        self,
        client: TestClient,
        host_headers: dict[str, str],
        test_room: Room,
    ) -> None:
        """Host cannot delete a room."""
        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=host_headers,
        )
        assert response.status_code == 403

    def test_delete_room_with_active_booking(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
        test_customer: Any,
        db: Session,
    ) -> None:
        """Cannot delete room with active bookings."""
        # Create an active booking
        BookingFactory.create_confirmed_booking(
            db,
            customer=test_customer,
            room=test_room,
        )

        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=admin_headers,
        )
        assert response.status_code == 400
        assert "active booking" in response.json()["detail"].lower()

    def test_delete_room_with_historical_booking(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
        test_customer: Any,
        db: Session,
    ) -> None:
        """Cannot delete room with historical bookings."""
        # Create a checked-out booking
        BookingFactory.create_checked_out_booking(
            db,
            customer=test_customer,
            room=test_room,
        )

        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=admin_headers,
        )
        assert response.status_code == 400
        assert "historical booking" in response.json()["detail"].lower()

    def test_delete_room_not_found(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Returns 404 when deleting non-existent room."""
        fake_id = uuid.uuid4()
        response = client.delete(
            f"{settings.API_V1_STR}/rooms/{fake_id}",
            headers=admin_headers,
        )
        assert response.status_code == 404


class TestRoomsStatusTransitions:
    """Test room status transition logic."""

    def test_status_transition_available_to_occupied(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        test_room: Room,
    ) -> None:
        """Can transition from available to occupied."""
        update_data = {"status": RoomStatus.OCCUPIED.value}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{test_room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        assert response.json()["status"] == RoomStatus.OCCUPIED.value

    def test_status_transition_occupied_to_cleaning(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Can transition from occupied to cleaning."""
        room = RoomFactory.create_occupied_room(db)
        update_data = {"status": RoomStatus.CLEANING.value}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        assert response.json()["status"] == RoomStatus.CLEANING.value

    def test_status_transition_cleaning_to_available(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Can transition from cleaning to available."""
        room = RoomFactory.create_cleaning_room(db)
        update_data = {"status": RoomStatus.AVAILABLE.value}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        assert response.json()["status"] == RoomStatus.AVAILABLE.value

    def test_status_transition_maintenance_to_available(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
        db: Session,
    ) -> None:
        """Can transition from maintenance to available."""
        room = RoomFactory.create_maintenance_room(db)
        update_data = {"status": RoomStatus.AVAILABLE.value}
        response = client.put(
            f"{settings.API_V1_STR}/rooms/{room.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        assert response.json()["status"] == RoomStatus.AVAILABLE.value
