#!/usr/bin/env python3
"""
Seed script to populate database with validated data via API endpoints.
This ensures all data passes through proper validation and business logic.
Usage: cd backend && uv run python seed_data_api.py
"""

import random
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel

# API configuration
API_BASE_URL = "http://localhost:8000/api/v1"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "hope228_"  # From .env

# Configuration
ENABLE_VERBOSE = True


class APIClient:
    """Client for interacting with the Hotel CRM API."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.Client(timeout=30.0)
        self.token: Optional[str] = None

    def login(self, username: str, password: str) -> bool:
        """Authenticate and get access token."""
        try:
            response = self.client.post(
                f"{self.base_url}/login/access-token",
                data={"username": username, "password": password},
            )
            response.raise_for_status()
            self.token = response.json()["access_token"]
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"✅ Authenticated as {username}")
            return True
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return False

    def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user."""
        try:
            response = self.client.post(f"{self.base_url}/users/", json=user_data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to create user {user_data.get('username')}: {e.response.text}")
            return None

    def create_room(self, room_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new room."""
        try:
            response = self.client.post(f"{self.base_url}/rooms/", json=room_data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to create room {room_data.get('room_number')}: {e.response.text}")
            return None

    def create_customer(self, customer_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new customer."""
        try:
            response = self.client.post(f"{self.base_url}/customers/", json=customer_data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to create customer: {e.response.text}")
            return None

    def create_booking(self, booking_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new booking."""
        try:
            response = self.client.post(f"{self.base_url}/bookings/", json=booking_data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to create booking: {e.response.text}")
            return None

    def check_in_booking(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Check in a booking."""
        try:
            response = self.client.post(f"{self.base_url}/bookings/{booking_id}/check-in")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to check in booking {booking_id}: {e.response.text}")
            return None

    def check_out_booking(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Check out a booking."""
        try:
            response = self.client.post(f"{self.base_url}/bookings/{booking_id}/check-out")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to check out booking {booking_id}: {e.response.text}")
            return None

    def cancel_booking(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Cancel a booking."""
        try:
            response = self.client.post(f"{self.base_url}/bookings/{booking_id}/cancel")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to cancel booking {booking_id}: {e.response.text}")
            return None

    def modify_booking_discount(
        self, booking_id: str, discount: float, reason: str
    ) -> Optional[Dict[str, Any]]:
        """Modify booking discount."""
        try:
            response = self.client.post(
                f"{self.base_url}/bookings/{booking_id}/modify-discount",
                json={"new_discount": discount, "discount_reason": reason},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if ENABLE_VERBOSE:
                print(f"❌ Failed to modify discount for booking {booking_id}: {e.response.text}")
            return None

    def close(self):
        """Close the HTTP client."""
        self.client.close()


def create_users(client: APIClient) -> List[Dict[str, Any]]:
    """Create additional users (managers and hosts)."""
    print("\n👤 Creating users...")
    users = []

    user_configs = [
        {"username": "manager1", "password": "password123", "full_name": "Азиз Каримов", "role": "manager"},
        {"username": "manager2", "password": "password123", "full_name": "Гульнара Алимова", "role": "manager"},
        {"username": "host1", "password": "password123", "full_name": "Рустам Юсупов", "role": "host"},
        {"username": "host2", "password": "password123", "full_name": "Дилноза Рахимова", "role": "host"},
        {"username": "host3", "password": "password123", "full_name": "Шохрух Назаров", "role": "host"},
    ]

    for config in user_configs:
        user = client.create_user(config)
        if user:
            users.append(user)
            print(f"  ✅ Created user: {config['username']} ({config['role']})")

    print(f"✅ Created {len(users)} users")
    return users


def create_rooms(client: APIClient) -> List[Dict[str, Any]]:
    """Create rooms with varied configurations."""
    print("\n🏨 Creating rooms...")
    rooms = []

    room_configs = [
        # Floor 1 - Standard rooms
        {
            "room_number": "101",
            "floor": 1,
            "room_type": "standard",
            "price_per_night": 50.0,
            "status": "available",
            "description": "Уютный номер с видом на город",
        },
        {
            "room_number": "102",
            "floor": 1,
            "room_type": "standard",
            "price_per_night": 50.0,
            "status": "available",
            "description": "Комфортабельный номер с балконом",
        },
        {
            "room_number": "103",
            "floor": 1,
            "room_type": "standard",
            "price_per_night": 55.0,
            "status": "available",
            "description": "Стандартный номер с мини-баром",
        },
        # Floor 2 - Mix of standard and VIP
        {
            "room_number": "201",
            "floor": 2,
            "room_type": "standard",
            "price_per_night": 60.0,
            "status": "available",
            "description": "Номер с панорамными окнами",
        },
        {
            "room_number": "202",
            "floor": 2,
            "room_type": "vip",
            "price_per_night": 120.0,
            "status": "available",
            "description": "Люкс номер с джакузи",
        },
        {
            "room_number": "203",
            "floor": 2,
            "room_type": "vip",
            "price_per_night": 130.0,
            "status": "available",
            "description": "VIP номер с гостиной зоной",
        },
        # Floor 3 - Premium rooms
        {
            "room_number": "301",
            "floor": 3,
            "room_type": "vip",
            "price_per_night": 150.0,
            "status": "available",
            "description": "Премиум номер с видом на горы",
        },
        {
            "room_number": "302",
            "floor": 3,
            "room_type": "vip",
            "price_per_night": 160.0,
            "status": "available",
            "description": "Люкс с террасой",
        },
        # Floor 4 - Penthouse suites
        {
            "room_number": "401",
            "floor": 4,
            "room_type": "vip",
            "price_per_night": 200.0,
            "status": "available",
            "description": "Пентхаус с панорамным видом",
        },
        {
            "room_number": "402",
            "floor": 4,
            "room_type": "vip",
            "price_per_night": 250.0,
            "status": "available",
            "description": "Президентский люкс",
        },
    ]

    for config in room_configs:
        room = client.create_room(config)
        if room:
            rooms.append(room)
            print(f"  ✅ Created room: {config['room_number']} ({config['room_type']})")

    print(f"✅ Created {len(rooms)} rooms")
    return rooms


def create_customers(client: APIClient) -> List[Dict[str, Any]]:
    """Create customers with realistic Uzbek data."""
    print("\n👥 Creating customers...")
    customers = []

    # Realistic Uzbek names
    first_names_male = ["Азиз", "Рустам", "Шохрух", "Жасур", "Бахтиёр", "Мирзо", "Камол", "Равшан", "Улугбек", "Санжар"]
    first_names_female = ["Гульнара", "Дилноза", "Нилуфар", "Мадина", "Севара", "Зухра", "Малика", "Шахноза", "Дилдора", "Нигора"]
    last_names = [
        "Каримов", "Алимов", "Юсупов", "Рахимов", "Назаров",
        "Хасанов", "Абдуллаев", "Исмаилов", "Турсунов", "Махмудов",
        "Каримова", "Алимова", "Юсупова", "Рахимова", "Назарова",
        "Хасанова", "Абдуллаева", "Исмаилова", "Турсунова", "Махмудова",
    ]

    districts = [
        "ALMAZAR", "BEKTEMIR", "MIRABAD", "MIRZO_ULUGBEK", "SERGELI",
        "UCHTEPA", "CHILANZAR", "SHAYKHANTAKHUR", "YUNUSABAD", "YAKKASARAY",
        "YASHNABAD", "YANGIHAYOT",
    ]

    for i in range(20):
        is_female = i % 2 == 0
        first_name = random.choice(first_names_female if is_female else first_names_male)
        last_name = random.choice(last_names[10:] if is_female else last_names[:10])

        # Generate Uzbek phone numbers (90, 91, 93, 94, 95, 97, 98, 99 prefixes)
        phone_prefix = random.choice(["90", "91", "93", "94", "95", "97", "98", "99"])
        phone = f"+998{phone_prefix}{random.randint(1000000, 9999999)}"

        # Random birth date between 1960 and 2005
        birth_year = random.randint(1960, 2005)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        date_of_birth = datetime(birth_year, birth_month, birth_day, tzinfo=timezone.utc).isoformat()

        customer_data = {
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "date_of_birth": date_of_birth,
            "district": random.choice(districts),
            "notes": f"Клиент #{i+1}" if random.random() < 0.3 else None,
        }

        customer = client.create_customer(customer_data)
        if customer:
            customers.append(customer)
            if i < 5:  # Show first 5 for brevity
                print(f"  ✅ Created customer: {first_name} {last_name}")

    print(f"✅ Created {len(customers)} customers")
    return customers


def create_bookings(
    client: APIClient,
    rooms: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Create bookings with various statuses."""
    print("\n📅 Creating bookings...")
    bookings = []

    now = datetime.now(timezone.utc)

    # Payment methods distribution
    payment_methods = ["cash"] * 50 + ["transfer"] * 30 + ["terminal"] * 20

    # Track room availability to avoid conflicts
    room_bookings = {room["id"]: [] for room in rooms}

    booking_count = 0
    attempt_count = 0
    max_attempts = 300  # Prevent infinite loop
    rate_limit_counter = 0  # Track API calls for rate limiting

    # Create different types of bookings
    booking_configs = []

    # 1. Past bookings (will create as future then immediately check-in/out)
    for i in range(30):
        booking_configs.append({"type": "past", "priority": 1})

    # 2. Current bookings (create today and check-in)
    for i in range(10):
        booking_configs.append({"type": "current", "priority": 2})

    # 3. Future bookings
    for i in range(60):
        booking_configs.append({"type": "future", "priority": 3})

    random.shuffle(booking_configs)

    for config in booking_configs:
        if booking_count >= 100 or attempt_count >= max_attempts:
            break

        attempt_count += 1

        customer = random.choice(customers)
        room = random.choice(rooms)

        # Handle rate limiting - wait after every 9 bookings
        if rate_limit_counter >= 9:
            print("⏳ Waiting 60 seconds for rate limit...")
            time.sleep(61)  # Wait 61 seconds to be safe
            rate_limit_counter = 0

        # Set booking dates based on type
        if config["type"] == "past":
            # Create as tomorrow (will check-in/out immediately)
            check_in = now + timedelta(days=1, hours=14)
        elif config["type"] == "current":
            # Create for today
            check_in = now + timedelta(hours=1)  # 1 hour from now
        else:  # future
            # Create for 2-30 days from now
            days_offset = random.randint(2, 30)
            check_in = now + timedelta(days=days_offset, hours=14)

        # Booking duration 1-3 nights for past/current, 1-7 for future
        if config["type"] in ["past", "current"]:
            nights = random.randint(1, 3)
        else:
            nights = random.choices(
                range(1, 8),
                weights=[30, 25, 20, 10, 8, 5, 2],
                k=1
            )[0]
        check_out = check_in + timedelta(days=nights, hours=12)  # 12 PM check-out

        # Check if room is available for these dates
        is_available = True
        for existing_booking in room_bookings[room["id"]]:
            # Check for date overlap
            if not (check_out <= existing_booking["check_in"] or check_in >= existing_booking["check_out"]):
                is_available = False
                break

        if not is_available:
            continue  # Try again with different dates/room

        # Prepare booking data
        booking_data = {
            "customer_id": customer["id"],
            "room_id": room["id"],
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "total_amount": room["price_per_night"] * nights,
            "payment_method": random.choice(payment_methods),
            "registration_need": random.random() > 0.1,  # 90% need registration
        }

        # Apply discount for some bookings
        if random.random() < 0.2:  # 20% have discount
            if random.random() < 0.3:  # VIP discount
                booking_data["discount"] = 15.0
                booking_data["discount_reason"] = "VIP клиент"
            elif nights >= 5:  # Long stay discount
                booking_data["discount"] = 10.0
                booking_data["discount_reason"] = "Скидка за длительное проживание"
            else:  # Promo discount
                booking_data["discount"] = 5.0
                booking_data["discount_reason"] = "Промо акция"

            # Recalculate total with discount
            discount_multiplier = 1 - (booking_data.get("discount", 0) / 100)
            booking_data["total_amount"] = room["price_per_night"] * nights * discount_multiplier

        # Create the booking
        booking = client.create_booking(booking_data)
        if booking:
            rate_limit_counter += 1

            # Store booking info for room availability tracking
            room_bookings[room["id"]].append({
                "check_in": check_in,
                "check_out": check_out,
                "booking_id": booking["id"],
            })

            # Process booking based on type
            if config["type"] == "past":
                # Simulate past booking - check in and out immediately
                time.sleep(0.5)  # Small delay between operations
                if random.random() < 0.85:  # 85% completed
                    checked_in = client.check_in_booking(booking["id"])
                    if checked_in:
                        rate_limit_counter += 1
                        time.sleep(0.5)
                        checked_out = client.check_out_booking(booking["id"])
                        if checked_out:
                            rate_limit_counter += 1
                            booking = checked_out
                else:  # 15% cancelled
                    cancelled = client.cancel_booking(booking["id"])
                    if cancelled:
                        rate_limit_counter += 1
                        booking = cancelled

            elif config["type"] == "current":
                # Current booking - check in
                time.sleep(0.5)
                if random.random() < 0.8:  # 80% checked in
                    checked_in = client.check_in_booking(booking["id"])
                    if checked_in:
                        rate_limit_counter += 1
                        booking = checked_in

            elif config["type"] == "future" and random.random() < 0.1:
                # Future booking - 10% cancelled
                time.sleep(0.5)
                cancelled = client.cancel_booking(booking["id"])
                if cancelled:
                    rate_limit_counter += 1
                    booking = cancelled

            bookings.append(booking)
            booking_count += 1

            if booking_count <= 10 or booking_count % 10 == 0:  # Show progress
                print(f"  ✅ Created booking #{booking_count}: {booking['id'][:8]}... (Room {room['room_number']}, {booking['status']})")

    print(f"\n✅ Created {len(bookings)} bookings")

    # Show statistics
    status_counts = {}
    for booking in bookings:
        status = booking["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    print("\n📈 Booking Status Distribution:")
    for status, count in status_counts.items():
        print(f"  - {status}: {count}")

    return bookings


def main():
    """Main function to seed the database via API."""
    print("🌱 Starting database seeding via API...")
    print(f"🔗 API URL: {API_BASE_URL}")

    # Create API client
    client = APIClient(API_BASE_URL)

    try:
        # Authenticate
        if not client.login(ADMIN_USERNAME, ADMIN_PASSWORD):
            print("❌ Failed to authenticate. Check credentials in .env")
            return

        # Create data in order
        users = create_users(client)
        rooms = create_rooms(client)
        customers = create_customers(client)
        bookings = create_bookings(client, rooms, customers)

        print("\n" + "=" * 50)
        print("✅ Database seeding completed successfully!")
        print("=" * 50)
        print("\n📊 Summary:")
        print(f"  👤 Users: {len(users)}")
        print(f"  🏨 Rooms: {len(rooms)}")
        print(f"  👥 Customers: {len(customers)}")
        print(f"  📅 Bookings: {len(bookings)}")
        print("\n💡 Note: All data has been validated through API endpoints")
        print("📝 Audit logs have been created automatically for all operations")

    finally:
        client.close()


if __name__ == "__main__":
    main()