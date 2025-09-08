"""Comprehensive test suite for booking endpoints."""
import uuid
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import BookingStatus, PaymentMethod, RoomStatus
from app.tests.factories.booking_factory import BookingFactory
from app.tests.factories.customer_factory import CustomerFactory
from app.tests.factories.room_factory import RoomFactory


class TestBookingCreate:
    """Tests for booking creation endpoint."""

    def test_create_booking_success(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test successful booking creation."""
        # Setup
        room = RoomFactory.create_test_room(db, status=RoomStatus.AVAILABLE)
        customer = CustomerFactory.create_test_customer(db)

        # Calculate dates
        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=3)
        nights = 3
        total_amount = room.price_per_night * nights

        # Create booking
        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": total_amount,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["customer_id"] == str(customer.id)
        assert content["room_id"] == str(room.id)
        assert content["total_amount"] == total_amount
        assert content["status"] == BookingStatus.CONFIRMED.value

        # Verify customer stats updated
        db.refresh(customer)
        assert customer.total_bookings == 1
        assert customer.total_spent == total_amount

    def test_create_booking_with_discount(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with discount."""
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=2)
        nights = 2
        discount = 20.0
        subtotal = room.price_per_night * nights
        discount_amount = subtotal * (discount / 100)
        total_amount = subtotal - discount_amount

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": total_amount,
            "discount": discount,
            "discount_reason": "Early booking discount",
            "payment_method": PaymentMethod.TERMINAL.value,
            "registration_need": False,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["discount"] == discount
        assert content["discount_reason"] == "Early booking discount"
        assert content["total_amount"] == total_amount

    def test_create_booking_nonexistent_customer(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with nonexistent customer."""
        room = RoomFactory.create_test_room(db)
        fake_customer_id = uuid.uuid4()

        booking_data = {
            "customer_id": str(fake_customer_id),
            "room_id": str(room.id),
            "check_in": datetime.utcnow().isoformat(),
            "check_out": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": 100.0,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 404
        assert "Customer not found" in response.json()["detail"]

    def test_create_booking_nonexistent_room(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with nonexistent room."""
        customer = CustomerFactory.create_test_customer(db)
        fake_room_id = uuid.uuid4()

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(fake_room_id),
            "check_in": datetime.utcnow().isoformat(),
            "check_out": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": 100.0,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 404
        assert "Room not found" in response.json()["detail"]

    def test_create_booking_unavailable_room(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with unavailable room."""
        room = RoomFactory.create_test_room(db, status=RoomStatus.CLEANING)
        customer = CustomerFactory.create_test_customer(db)

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": datetime.utcnow().isoformat(),
            "check_out": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": room.price_per_night,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 400
        assert "cleaning" in response.json()["detail"].lower()

    def test_create_booking_overlapping_dates(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with overlapping dates."""
        room = RoomFactory.create_test_room(db)
        customer1 = CustomerFactory.create_test_customer(db)
        customer2 = CustomerFactory.create_test_customer(db)

        # Create first booking
        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=3)
        BookingFactory.create_test_booking(
            db,
            customer=customer1,
            room=room,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
        )

        # Try to create overlapping booking
        overlapping_check_in = check_in + timedelta(days=1)
        overlapping_check_out = check_out + timedelta(days=1)
        total_amount = room.price_per_night * 3

        booking_data = {
            "customer_id": str(customer2.id),
            "room_id": str(room.id),
            "check_in": overlapping_check_in.isoformat(),
            "check_out": overlapping_check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": total_amount,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 400
        assert "not available for the selected dates" in response.json()["detail"]
        assert "15-minute gap required" in response.json()["detail"]

    def test_create_booking_insufficient_buffer_time(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation without 15-minute buffer."""
        room = RoomFactory.create_test_room(db)
        customer1 = CustomerFactory.create_test_customer(db)
        customer2 = CustomerFactory.create_test_customer(db)

        # Create first booking
        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=2)
        BookingFactory.create_test_booking(
            db,
            customer=customer1,
            room=room,
            check_in=check_in,
            check_out=check_out,
        )

        # Try to create booking immediately after (no buffer)
        new_check_in = check_out  # No buffer
        new_check_out = new_check_in + timedelta(days=1)

        booking_data = {
            "customer_id": str(customer2.id),
            "room_id": str(room.id),
            "check_in": new_check_in.isoformat(),
            "check_out": new_check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": room.price_per_night,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 400
        assert "15-minute gap required" in response.json()["detail"]

    def test_create_booking_with_sufficient_buffer_time(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with proper 15-minute buffer."""
        room = RoomFactory.create_test_room(db)
        customer1 = CustomerFactory.create_test_customer(db)
        customer2 = CustomerFactory.create_test_customer(db)

        # Create first booking
        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=2)
        BookingFactory.create_test_booking(
            db,
            customer=customer1,
            room=room,
            check_in=check_in,
            check_out=check_out,
        )

        # Create booking with proper buffer
        new_check_in = check_out + timedelta(minutes=15)
        new_check_out = new_check_in + timedelta(days=1)

        booking_data = {
            "customer_id": str(customer2.id),
            "room_id": str(room.id),
            "check_in": new_check_in.isoformat(),
            "check_out": new_check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": room.price_per_night,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["customer_id"] == str(customer2.id)

    def test_create_booking_incorrect_total_amount(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with incorrect total amount."""
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=2)
        correct_amount = room.price_per_night * 2
        incorrect_amount = correct_amount + 50  # Wrong amount

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": incorrect_amount,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 400
        assert "Total amount mismatch" in response.json()["detail"]

    def test_create_booking_discount_without_reason(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with discount but no reason."""
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=1)
        discount = 10.0
        subtotal = room.price_per_night
        total_amount = subtotal - (subtotal * discount / 100)

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": total_amount,
            "discount": discount,
            # Missing discount_reason
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        # Should fail due to model validation
        assert response.status_code == 422

    def test_create_booking_check_out_before_check_in(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test booking creation with check-out before check-in."""
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        check_in = datetime.utcnow() + timedelta(days=2)
        check_out = datetime.utcnow() + timedelta(days=1)  # Before check-in

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": room.price_per_night,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        # Should fail due to model validation
        assert response.status_code == 422


class TestBookingRead:
    """Tests for booking read endpoints."""

    def test_read_bookings_list(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test reading list of bookings."""
        # Create test bookings
        for _ in range(3):
            BookingFactory.create_test_booking(db)

        response = client.get(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 3
        assert len(content["data"]) >= 3

    def test_read_bookings_filter_by_status(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test filtering bookings by status."""
        # Create bookings with different statuses
        BookingFactory.create_confirmed_booking(db)
        BookingFactory.create_checked_in_booking(db)
        BookingFactory.create_checked_out_booking(db)
        BookingFactory.create_cancelled_booking(db)

        # Filter by CONFIRMED status
        response = client.get(
            f"{settings.API_V1_STR}/bookings/?status={BookingStatus.CONFIRMED.value}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 1
        for booking in content["data"]:
            assert booking["status"] == BookingStatus.CONFIRMED.value

    def test_read_bookings_filter_by_room(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test filtering bookings by room."""
        room1 = RoomFactory.create_test_room(db, room_number="101")
        room2 = RoomFactory.create_test_room(db, room_number="102")

        BookingFactory.create_test_booking(db, room=room1)
        BookingFactory.create_test_booking(db, room=room1)
        BookingFactory.create_test_booking(db, room=room2)

        response = client.get(
            f"{settings.API_V1_STR}/bookings/?room_id={room1.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2
        for booking in content["data"]:
            assert booking["room_id"] == str(room1.id)

    def test_read_bookings_filter_by_customer(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test filtering bookings by customer."""
        customer1 = CustomerFactory.create_test_customer(db)
        customer2 = CustomerFactory.create_test_customer(db)

        BookingFactory.create_test_booking(db, customer=customer1)
        BookingFactory.create_test_booking(db, customer=customer1)
        BookingFactory.create_test_booking(db, customer=customer2)

        response = client.get(
            f"{settings.API_V1_STR}/bookings/?customer_id={customer1.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["count"] >= 2
        for booking in content["data"]:
            assert booking["customer_id"] == str(customer1.id)

    def test_read_booking_by_id(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test reading single booking by ID."""
        booking = BookingFactory.create_test_booking(db)

        response = client.get(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["id"] == str(booking.id)
        assert "customer" in content  # Check relationship loaded
        assert "room" in content  # Check relationship loaded

    def test_read_booking_nonexistent(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Test reading nonexistent booking."""
        fake_id = uuid.uuid4()

        response = client.get(
            f"{settings.API_V1_STR}/bookings/{fake_id}",
            headers=admin_headers,
        )

        assert response.status_code == 404
        assert "Booking not found" in response.json()["detail"]

    def test_read_bookings_pagination(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test bookings pagination."""
        # Create 10 bookings
        for _ in range(10):
            BookingFactory.create_test_booking(db)

        # Get first page
        response = client.get(
            f"{settings.API_V1_STR}/bookings/?skip=0&limit=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) == 5
        assert content["count"] >= 10

        # Get second page
        response = client.get(
            f"{settings.API_V1_STR}/bookings/?skip=5&limit=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert len(content["data"]) == 5


class TestBookingUpdate:
    """Tests for booking update endpoint."""

    def test_update_booking_dates(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating booking dates."""
        booking = BookingFactory.create_test_booking(db)
        original_amount = booking.total_amount

        new_check_out = booking.check_out + timedelta(days=2)
        # Calculate new total
        # Need to refresh booking to get the room relationship
        db.refresh(booking)
        if not booking.room:
            raise ValueError("Room not found for booking")
        nights = max(1, (new_check_out.date() - booking.check_in.date()).days)
        expected_total = booking.room.price_per_night * nights

        update_data = {
            "check_out": new_check_out.isoformat(),
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["check_out"][:10] == new_check_out.date().isoformat()
        assert content["total_amount"] == expected_total
        assert content["total_amount"] > original_amount

    def test_update_booking_room(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating booking room."""
        old_room = RoomFactory.create_test_room(db, room_number="101")
        new_room = RoomFactory.create_test_room(db, room_number="102")
        booking = BookingFactory.create_test_booking(db, room=old_room)

        update_data = {
            "room_id": str(new_room.id),
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["room_id"] == str(new_room.id)

    def test_update_booking_room_when_checked_in(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating room when booking is checked in."""
        old_room = RoomFactory.create_test_room(db, room_number="101", status=RoomStatus.OCCUPIED)
        new_room = RoomFactory.create_test_room(db, room_number="102", status=RoomStatus.AVAILABLE)
        booking = BookingFactory.create_checked_in_booking(db, room=old_room)

        update_data = {
            "room_id": str(new_room.id),
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 200

        # Verify room status changes
        db.refresh(old_room)
        db.refresh(new_room)
        assert old_room.status == RoomStatus.CLEANING
        assert new_room.status == RoomStatus.OCCUPIED

    def test_update_booking_room_unavailable(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating to unavailable room when checked in."""
        old_room = RoomFactory.create_test_room(db, status=RoomStatus.OCCUPIED)
        new_room = RoomFactory.create_test_room(db, status=RoomStatus.OCCUPIED)
        booking = BookingFactory.create_checked_in_booking(db, room=old_room)

        update_data = {
            "room_id": str(new_room.id),
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 400
        assert "occupied" in response.json()["detail"].lower()

    def test_update_booking_customer(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating booking customer."""
        old_customer = CustomerFactory.create_test_customer(db)
        new_customer = CustomerFactory.create_test_customer(db)
        booking = BookingFactory.create_test_booking(db, customer=old_customer)

        update_data = {
            "customer_id": str(new_customer.id),
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["customer_id"] == str(new_customer.id)

        # Verify customer stats updated
        db.refresh(old_customer)
        db.refresh(new_customer)
        assert old_customer.total_bookings == 0
        assert new_customer.total_bookings == 1

    def test_update_booking_discount_as_manager(
        self,
        client: TestClient,
        db: Session,
        manager_headers: dict[str, str],
    ) -> None:
        """Test manager can update discount."""
        booking = BookingFactory.create_test_booking(db, discount=0)

        update_data = {
            "discount": 15.0,
            "discount_reason": "Manager special discount",
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=manager_headers,
            json=update_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["discount"] == 15.0
        assert content["discount_reason"] == "Manager special discount"

    def test_update_booking_discount_as_host_fails(
        self,
        client: TestClient,
        db: Session,
        host_headers: dict[str, str],
    ) -> None:
        """Test host cannot update discount."""
        booking = BookingFactory.create_test_booking(db, discount=0)

        update_data = {
            "discount": 15.0,
            "discount_reason": "Unauthorized discount",
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=host_headers,
            json=update_data,
        )

        assert response.status_code == 403

    def test_update_booking_status_transitions(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test valid status transitions."""
        booking = BookingFactory.create_confirmed_booking(db)

        # CONFIRMED -> CHECKED_IN (valid)
        update_data = {"status": BookingStatus.CHECKED_IN.value}
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200

        # CHECKED_IN -> CHECKED_OUT (valid)
        update_data = {"status": BookingStatus.CHECKED_OUT.value}
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200

    def test_update_booking_invalid_status_transition(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test invalid status transition."""
        booking = BookingFactory.create_checked_out_booking(db)

        # CHECKED_OUT -> CONFIRMED (invalid)
        update_data = {"status": BookingStatus.CONFIRMED.value}
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 400
        assert "Invalid status transition" in response.json()["detail"]

    def test_update_booking_overlapping_dates(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating to overlapping dates."""
        room = RoomFactory.create_test_room(db)

        # Create first booking
        BookingFactory.create_test_booking(
            db,
            room=room,
            check_in=datetime.utcnow() + timedelta(days=5),
            check_out=datetime.utcnow() + timedelta(days=7),
        )

        # Create second booking that we'll update
        booking2 = BookingFactory.create_test_booking(
            db,
            room=room,
            check_in=datetime.utcnow() + timedelta(days=1),
            check_out=datetime.utcnow() + timedelta(days=2),
        )

        # Try to update booking2 to overlap with booking1
        update_data = {
            "check_in": (datetime.utcnow() + timedelta(days=6)).isoformat(),
            "check_out": (datetime.utcnow() + timedelta(days=8)).isoformat(),
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking2.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 400
        assert "not available for the selected dates" in response.json()["detail"]

    def test_update_booking_nonexistent(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Test updating nonexistent booking."""
        fake_id = uuid.uuid4()

        update_data = {"discount": 10.0}

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{fake_id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 404
        assert "Booking not found" in response.json()["detail"]


class TestBookingDelete:
    """Tests for booking deletion endpoint."""

    def test_delete_booking_success(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test successful booking deletion."""
        customer = CustomerFactory.create_test_customer(db)
        booking = BookingFactory.create_test_booking(db, customer=customer)
        booking_id = booking.id

        # Customer should have stats from booking
        db.refresh(customer)
        assert customer.total_bookings == 1

        response = client.delete(
            f"{settings.API_V1_STR}/bookings/{booking_id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]

        # Verify booking deleted
        assert db.get(booking.__class__, booking_id) is None

        # Verify customer stats updated
        db.refresh(customer)
        assert customer.total_bookings == 0

    def test_delete_booking_nonexistent(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Test deleting nonexistent booking."""
        fake_id = uuid.uuid4()

        response = client.delete(
            f"{settings.API_V1_STR}/bookings/{fake_id}",
            headers=admin_headers,
        )

        assert response.status_code == 404
        assert "Booking not found" in response.json()["detail"]


class TestBookingCheckIn:
    """Tests for booking check-in endpoint."""

    def test_check_in_success(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test successful check-in."""
        room = RoomFactory.create_test_room(db, status=RoomStatus.AVAILABLE)
        booking = BookingFactory.create_confirmed_booking(db, room=room)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-in",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["status"] == BookingStatus.CHECKED_IN.value

        # Verify room status changed
        db.refresh(room)
        assert room.status == RoomStatus.OCCUPIED

    def test_check_in_not_confirmed(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-in for non-confirmed booking."""
        booking = BookingFactory.create_cancelled_booking(db)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-in",
            headers=admin_headers,
        )

        assert response.status_code == 400
        assert "Only confirmed bookings can be checked in" in response.json()["detail"]

    def test_check_in_room_not_available(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-in when room is not available."""
        room = RoomFactory.create_test_room(db, status=RoomStatus.CLEANING)
        booking = BookingFactory.create_confirmed_booking(db, room=room)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-in",
            headers=admin_headers,
        )

        assert response.status_code == 400
        assert "Room must be available to check in" in response.json()["detail"]

    def test_check_in_with_conflicting_booking(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-in with conflicting booking."""
        room = RoomFactory.create_test_room(db, status=RoomStatus.AVAILABLE)

        # Create a checked-in booking
        BookingFactory.create_checked_in_booking(db, room=room)
        room.status = RoomStatus.AVAILABLE  # Reset for test
        db.add(room)
        db.commit()

        # Try to check in another booking for same room
        booking2 = BookingFactory.create_confirmed_booking(db, room=room)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking2.id}/check-in",
            headers=admin_headers,
        )

        assert response.status_code == 400
        assert "conflicting bookings" in response.json()["detail"]

    def test_check_in_nonexistent_booking(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-in for nonexistent booking."""
        fake_id = uuid.uuid4()

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{fake_id}/check-in",
            headers=admin_headers,
        )

        assert response.status_code == 404
        assert "Booking not found" in response.json()["detail"]


class TestBookingCheckOut:
    """Tests for booking check-out endpoint."""

    def test_check_out_success(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test successful check-out."""
        room = RoomFactory.create_test_room(db, status=RoomStatus.OCCUPIED)
        booking = BookingFactory.create_checked_in_booking(db, room=room)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-out",
            headers=admin_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["status"] == BookingStatus.CHECKED_OUT.value

        # Verify room status changed to cleaning
        db.refresh(room)
        assert room.status == RoomStatus.CLEANING

    def test_check_out_not_checked_in(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-out for non-checked-in booking."""
        booking = BookingFactory.create_confirmed_booking(db)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-out",
            headers=admin_headers,
        )

        assert response.status_code == 400
        assert "Only checked-in bookings can be checked out" in response.json()["detail"]

    def test_check_out_already_checked_out(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-out for already checked-out booking."""
        booking = BookingFactory.create_checked_out_booking(db)

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{booking.id}/check-out",
            headers=admin_headers,
        )

        assert response.status_code == 400
        assert "Only checked-in bookings can be checked out" in response.json()["detail"]

    def test_check_out_nonexistent_booking(
        self,
        client: TestClient,
        admin_headers: dict[str, str],
    ) -> None:
        """Test check-out for nonexistent booking."""
        fake_id = uuid.uuid4()

        response = client.post(
            f"{settings.API_V1_STR}/bookings/{fake_id}/check-out",
            headers=admin_headers,
        )

        assert response.status_code == 404
        assert "Booking not found" in response.json()["detail"]


class TestBookingBusinessLogic:
    """Tests for booking business logic and edge cases."""

    def test_same_day_checkout_minimum_charge(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test same-day checkout charges minimum 1 night."""
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        # Same day check-in and check-out
        check_in = datetime.utcnow().replace(hour=14, minute=0)
        check_out = check_in.replace(hour=23, minute=59)

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": room.price_per_night,  # 1 night minimum
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["total_amount"] == room.price_per_night

    def test_discount_percentage_calculation(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test discount percentage calculation accuracy."""
        room = RoomFactory.create_test_room(db, price_per_night=100.0)
        customer = CustomerFactory.create_test_customer(db)

        check_in = datetime.utcnow() + timedelta(days=1)
        check_out = check_in + timedelta(days=3)  # 3 nights
        discount = 25.0  # 25% discount

        # 3 nights * 100 = 300, 25% discount = 75, total = 225
        expected_total = 225.0

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": expected_total,
            "discount": discount,
            "discount_reason": "Quarter off sale",
            "payment_method": PaymentMethod.TERMINAL.value,
            "registration_need": False,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=admin_headers,
            json=booking_data,
        )

        assert response.status_code == 200
        content = response.json()
        assert content["total_amount"] == expected_total

    def test_payment_method_update_when_checked_in(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
        host_headers: dict[str, str],
    ) -> None:
        """Test only admin/manager can change payment method when checked in."""
        booking = BookingFactory.create_checked_in_booking(db)
        booking.payment_method = PaymentMethod.CASH
        db.add(booking)
        db.commit()

        update_data = {"payment_method": PaymentMethod.TERMINAL.value}

        # Host cannot change
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=host_headers,
            json=update_data,
        )
        assert response.status_code == 403

        # Admin can change
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        assert response.json()["payment_method"] == PaymentMethod.TERMINAL.value

    def test_cancel_checked_out_booking_admin_only(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
        host_headers: dict[str, str],
    ) -> None:
        """Test only admin can cancel checked-out booking (for corrections)."""
        booking = BookingFactory.create_checked_out_booking(db)

        update_data = {"status": BookingStatus.CANCELLED.value}

        # Host cannot cancel checked-out (requires admin/manager)
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=host_headers,
            json=update_data,
        )
        assert response.status_code == 403

        # Admin can cancel for corrections
        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )
        assert response.status_code == 200
        assert response.json()["status"] == BookingStatus.CANCELLED.value


class TestBookingPermissions:
    """Tests for booking permissions."""

    def test_unauthenticated_cannot_access(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        """Test unauthenticated users cannot access bookings."""
        response = client.get(f"{settings.API_V1_STR}/bookings/")
        assert response.status_code == 401

    def test_host_can_read_bookings(
        self,
        client: TestClient,
        db: Session,
        host_headers: dict[str, str],
    ) -> None:
        """Test host can read bookings."""
        BookingFactory.create_test_booking(db)

        response = client.get(
            f"{settings.API_V1_STR}/bookings/",
            headers=host_headers,
        )

        assert response.status_code == 200

    def test_host_can_create_booking(
        self,
        client: TestClient,
        db: Session,
        host_headers: dict[str, str],
    ) -> None:
        """Test host can create bookings."""
        room = RoomFactory.create_test_room(db)
        customer = CustomerFactory.create_test_customer(db)

        booking_data = {
            "customer_id": str(customer.id),
            "room_id": str(room.id),
            "check_in": datetime.utcnow().isoformat(),
            "check_out": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "status": BookingStatus.CONFIRMED.value,
            "total_amount": room.price_per_night,
            "discount": 0,
            "payment_method": PaymentMethod.CASH.value,
            "registration_need": True,
        }

        response = client.post(
            f"{settings.API_V1_STR}/bookings/",
            headers=host_headers,
            json=booking_data,
        )

        assert response.status_code == 200

    def test_manager_has_full_booking_access(
        self,
        client: TestClient,
        db: Session,
        manager_headers: dict[str, str],
    ) -> None:
        """Test manager has full booking access."""
        booking = BookingFactory.create_test_booking(db)

        # Can update discount
        update_data = {
            "discount": 20.0,
            "discount_reason": "Manager override",
        }

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=manager_headers,
            json=update_data,
        )

        assert response.status_code == 200

    def test_admin_has_full_booking_access(
        self,
        client: TestClient,
        db: Session,
        admin_headers: dict[str, str],
    ) -> None:
        """Test admin has full booking access."""
        booking = BookingFactory.create_checked_out_booking(db)

        # Can cancel even checked-out bookings
        update_data = {"status": BookingStatus.CANCELLED.value}

        response = client.put(
            f"{settings.API_V1_STR}/bookings/{booking.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 200
