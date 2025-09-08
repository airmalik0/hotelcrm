#!/usr/bin/env python3
"""
Script to add sample data to the hotel CRM database
"""
import random
from datetime import datetime, timedelta

from sqlmodel import Session

from app.core.db import engine
from app.models import (
    Booking,
    BookingStatus,
    Customer,
    PaymentMethod,
    Room,
    RoomStatus,
    RoomType,
)


def create_sample_rooms(session: Session) -> list[Room]:
    """Create sample rooms across 5 floors"""
    rooms = []
    room_types = [
        (RoomType.STANDARD, 100),
        (RoomType.VIP, 300)
    ]

    for floor in range(1, 6):
        for room_num in range(1, 11):
            room_number = f"{floor}{room_num:02d}"
            room_type, price = random.choice(room_types)

            room = Room(
                room_number=room_number,
                floor=floor,
                room_type=room_type,
                price_per_night=price + random.randint(-20, 50),
                status=RoomStatus.AVAILABLE,
                description=f"Comfortable {room_type.value} room on floor {floor}"
            )
            rooms.append(room)
            session.add(room)

    session.commit()
    print(f"Created {len(rooms)} rooms")
    return rooms


def create_sample_customers(session: Session) -> list[Customer]:
    """Create sample customers"""
    customers = []

    customer_data = [
        ("John", "Smith", "+1234567890", "Центральный", ["vip"]),
        ("Emma", "Johnson", "+1234567891", "Северный", ["постоянный"]),
        ("Michael", "Brown", "+1234567892", "Южный", ["проблемный"]),
        ("Sophia", "Davis", "+1234567893", "Западный", ["постоянный"]),
        ("James", "Wilson", "+1234567894", "Восточный", ["vip"]),
        ("Isabella", "Martinez", "+1234567895", "Центральный", ["vip", "постоянный"]),
        ("William", "Anderson", "+1234567896", "Северный", ["проблемный"]),
        ("Olivia", "Taylor", "+1234567897", "Южный", ["постоянный"]),
        ("Alexander", "Thomas", "+1234567898", "Западный", ["vip"]),
        ("Mia", "Jackson", "+1234567899", "Восточный", ["постоянный"]),
    ]

    for first_name, last_name, phone, district, tags in customer_data:
        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            district=district,
            tags=tags,
            notes=f"Customer from {district} district"
        )
        customers.append(customer)
        session.add(customer)

    session.commit()
    print(f"Created {len(customers)} customers")
    return customers


def create_sample_bookings(session: Session, rooms: list[Room], customers: list[Customer]) -> list[Booking]:
    """Create sample bookings"""
    bookings = []
    now = datetime.utcnow()

    # Create past bookings (checked out)
    for _ in range(10):
        customer = random.choice(customers)
        room = random.choice(rooms)

        check_in = now - timedelta(days=random.randint(30, 60))
        check_out = check_in + timedelta(days=random.randint(2, 7))
        nights = (check_out - check_in).days

        booking = Booking(
            customer_id=customer.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CHECKED_OUT,
            total_amount=room.price_per_night * nights,
            discount=random.randint(0, 15),
            payment_method=random.choice(list(PaymentMethod)),
            registration_need=True
        )
        bookings.append(booking)
        session.add(booking)

        # Update customer stats
        customer.total_bookings += 1
        customer.total_spent += booking.total_amount
        if not customer.first_booking_date or check_in < customer.first_booking_date:
            customer.first_booking_date = check_in
        customer.last_booking_date = check_out

    # Create current bookings (checked in)
    for _ in range(5):
        customer = random.choice(customers)
        room = random.choice(rooms[:25])  # Use first half of rooms

        check_in = now - timedelta(days=random.randint(1, 3))
        check_out = now + timedelta(days=random.randint(1, 4))
        nights = (check_out - check_in).days

        booking = Booking(
            customer_id=customer.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CHECKED_IN,
            total_amount=room.price_per_night * nights,
            discount=random.randint(0, 10),
            payment_method=random.choice(list(PaymentMethod)),
            registration_need=True
        )
        bookings.append(booking)
        session.add(booking)

        # Update room status
        room.status = RoomStatus.OCCUPIED

        # Update customer stats
        customer.total_bookings += 1
        customer.total_spent += booking.total_amount * (1 - booking.discount / 100)
        if not customer.first_booking_date:
            customer.first_booking_date = check_in
        customer.last_booking_date = now

    # Create future bookings (confirmed)
    for _ in range(8):
        customer = random.choice(customers)
        room = random.choice(rooms[25:])  # Use second half of rooms

        check_in = now + timedelta(days=random.randint(2, 30))
        check_out = check_in + timedelta(days=random.randint(2, 5))
        nights = (check_out - check_in).days

        booking = Booking(
            customer_id=customer.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
            total_amount=room.price_per_night * nights,
            discount=random.randint(0, 20),
            payment_method=random.choice(list(PaymentMethod)),
            registration_need=random.choice([True, False])
        )
        bookings.append(booking)
        session.add(booking)

        # Update customer stats
        customer.total_bookings += 1

    session.commit()
    print(f"Created {len(bookings)} bookings")
    return bookings


def main() -> None:
    """Main function to create all sample data"""
    print("Starting to create sample data...")

    with Session(engine) as session:
        # Check if data already exists
        existing_rooms = session.query(Room).first()
        if existing_rooms:
            print("Sample data already exists. Skipping...")
            return

        # Create sample data
        rooms = create_sample_rooms(session)
        customers = create_sample_customers(session)
        bookings = create_sample_bookings(session, rooms, customers)

        print("\nSample data created successfully!")
        print(f"Total rooms: {len(rooms)}")
        print(f"Total customers: {len(customers)}")
        print(f"Total bookings: {len(bookings)}")

        # Print some statistics
        occupied_rooms = [r for r in rooms if r.status == RoomStatus.OCCUPIED]
        print(f"\nCurrent occupancy: {len(occupied_rooms)}/{len(rooms)} rooms")

        checked_in = [b for b in bookings if b.status == BookingStatus.CHECKED_IN]
        print(f"Currently checked in: {len(checked_in)} guests")


if __name__ == "__main__":
    main()
