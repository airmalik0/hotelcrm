#!/usr/bin/env python3
"""
Script to add sample data to the hotel CRM database
"""
import random
from datetime import datetime, timedelta
from sqlmodel import Session

from app.core.db import engine
from app.models import Room, Customer, Booking, RoomType, RoomStatus, BookingStatus


def create_sample_rooms(session: Session):
    """Create sample rooms across 5 floors"""
    rooms = []
    room_types = [
        (RoomType.SINGLE, 100),
        (RoomType.DOUBLE, 150),
        (RoomType.SUITE, 250),
        (RoomType.DELUXE, 350),
        (RoomType.PRESIDENTIAL, 500)
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
                max_occupancy=2 if room_type in [RoomType.SINGLE, RoomType.DOUBLE] else 4,
                description=f"Comfortable {room_type.value} room on floor {floor}"
            )
            rooms.append(room)
            session.add(room)
    
    session.commit()
    print(f"Created {len(rooms)} rooms")
    return rooms


def create_sample_customers(session: Session):
    """Create sample customers"""
    customers = []
    
    customer_data = [
        ("John", "Smith", "john.smith@email.com", "+1234567890", "USA", ["vip"]),
        ("Emma", "Johnson", "emma.j@email.com", "+1234567891", "UK", ["business"]),
        ("Michael", "Brown", "m.brown@company.com", "+1234567892", "Canada", ["corporate"]),
        ("Sophia", "Davis", "sophia.d@email.com", "+1234567893", "Australia", ["regular"]),
        ("James", "Wilson", "james.w@email.com", "+1234567894", "USA", ["family"]),
        ("Isabella", "Martinez", "isabella.m@email.com", "+1234567895", "Spain", ["vip", "business"]),
        ("William", "Anderson", "w.anderson@corp.com", "+1234567896", "UK", ["corporate"]),
        ("Olivia", "Taylor", "olivia.t@email.com", "+1234567897", "France", ["regular"]),
        ("Alexander", "Thomas", "alex.t@email.com", "+1234567898", "Germany", ["business"]),
        ("Mia", "Jackson", "mia.j@email.com", "+1234567899", "Italy", ["family"]),
    ]
    
    for first_name, last_name, email, phone, nationality, tags in customer_data:
        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            nationality=nationality,
            tags=tags,
            address=f"123 Main St, {nationality}",
            notes=f"Preferred customer from {nationality}"
        )
        customers.append(customer)
        session.add(customer)
    
    session.commit()
    print(f"Created {len(customers)} customers")
    return customers


def create_sample_bookings(session: Session, rooms: list, customers: list):
    """Create sample bookings"""
    bookings = []
    now = datetime.utcnow()
    
    # Create past bookings (checked out)
    for i in range(10):
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
            adults=random.randint(1, 2),
            children=random.randint(0, 2),
            total_amount=room.price_per_night * nights,
            paid_amount=room.price_per_night * nights,
            special_requests="Past booking - completed"
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
    for i in range(5):
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
            adults=random.randint(1, 2),
            children=random.randint(0, 1),
            total_amount=room.price_per_night * nights,
            paid_amount=room.price_per_night * nights * 0.5,  # Partial payment
            special_requests="Currently staying"
        )
        bookings.append(booking)
        session.add(booking)
        
        # Update room status
        room.status = RoomStatus.OCCUPIED
        
        # Update customer stats
        customer.total_bookings += 1
        customer.total_spent += booking.paid_amount
        if not customer.first_booking_date:
            customer.first_booking_date = check_in
        customer.last_booking_date = now
    
    # Create future bookings (confirmed)
    for i in range(8):
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
            adults=random.randint(1, 2),
            children=random.randint(0, 2),
            total_amount=room.price_per_night * nights,
            paid_amount=room.price_per_night * nights * 0.3,  # Deposit
            special_requests="Future reservation"
        )
        bookings.append(booking)
        session.add(booking)
        
        # Update customer stats
        customer.total_bookings += 1
    
    session.commit()
    print(f"Created {len(bookings)} bookings")
    return bookings


def main():
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