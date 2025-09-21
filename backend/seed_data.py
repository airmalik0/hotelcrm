#!/usr/bin/env python3
"""
Seed script to populate database with mock data for Hotel CRM.
Usage: cd backend && uv run python seed_data.py
"""

import random
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.core.security import get_password_hash
from app.models import (
    AuditLog,
    Booking,
    BookingStatus,
    Customer,
    CustomerTag,
    PaymentMethod,
    Room,
    RoomStatus,
    RoomType,
    User,
    UserRole,
)
from app.models.common import District, PaymentAdjustmentType


def clear_existing_data(session: Session) -> None:
    """Clear existing data (except superuser) to avoid conflicts."""
    print("🗑️  Clearing existing data...")

    # Delete in correct order due to foreign keys
    session.exec(select(AuditLog)).all()
    for audit in session.exec(select(AuditLog)).all():
        session.delete(audit)

    session.exec(select(Booking)).all()
    for booking in session.exec(select(Booking)).all():
        session.delete(booking)

    session.exec(select(Customer)).all()
    for customer in session.exec(select(Customer)).all():
        session.delete(customer)

    session.exec(select(Room)).all()
    for room in session.exec(select(Room)).all():
        session.delete(room)

    # Keep superuser, delete other users
    for user in session.exec(select(User).where(~User.is_superuser)).all():
        session.delete(user)

    session.commit()
    print("✅ Data cleared")


def create_users(session: Session) -> list[User]:
    """Create additional users (staff members)."""
    print("👤 Creating users...")
    users = []

    # Create managers
    manager_data = [
        {"username": "manager1", "full_name": "Азиз Каримов", "role": UserRole.MANAGER},
        {"username": "manager2", "full_name": "Гульнара Алимова", "role": UserRole.MANAGER},
    ]

    # Create hosts
    host_data = [
        {"username": "host1", "full_name": "Рустам Юсупов", "role": UserRole.HOST},
        {"username": "host2", "full_name": "Дилноза Рахимова", "role": UserRole.HOST},
        {"username": "host3", "full_name": "Шохрух Назаров", "role": UserRole.HOST},
    ]

    for data in manager_data + host_data:
        user = User(
            **data,
            hashed_password=get_password_hash("password123"),
            is_active=True,
            is_superuser=False,
        )
        session.add(user)
        users.append(user)

    session.commit()
    print(f"✅ Created {len(users)} users")
    return users


def create_rooms(session: Session) -> list[Room]:
    """Create 10 rooms with varied configurations."""
    print("🏨 Creating rooms...")
    rooms = []

    room_configs = [
        # Floor 1 - Standard rooms
        {"room_number": "101", "floor": 1, "room_type": RoomType.STANDARD, "price_per_night": 50.0, "status": RoomStatus.AVAILABLE},
        {"room_number": "102", "floor": 1, "room_type": RoomType.STANDARD, "price_per_night": 50.0, "status": RoomStatus.OCCUPIED},
        {"room_number": "103", "floor": 1, "room_type": RoomType.STANDARD, "price_per_night": 55.0, "status": RoomStatus.AVAILABLE},

        # Floor 2 - Mix of standard and VIP
        {"room_number": "201", "floor": 2, "room_type": RoomType.STANDARD, "price_per_night": 60.0, "status": RoomStatus.CLEANING},
        {"room_number": "202", "floor": 2, "room_type": RoomType.VIP, "price_per_night": 120.0, "status": RoomStatus.AVAILABLE},
        {"room_number": "203", "floor": 2, "room_type": RoomType.VIP, "price_per_night": 130.0, "status": RoomStatus.OCCUPIED},

        # Floor 3 - Premium rooms
        {"room_number": "301", "floor": 3, "room_type": RoomType.VIP, "price_per_night": 150.0, "status": RoomStatus.AVAILABLE},
        {"room_number": "302", "floor": 3, "room_type": RoomType.VIP, "price_per_night": 160.0, "status": RoomStatus.AVAILABLE},

        # Floor 4 - Penthouse suites
        {"room_number": "401", "floor": 4, "room_type": RoomType.VIP, "price_per_night": 200.0, "status": RoomStatus.AVAILABLE},
        {"room_number": "402", "floor": 4, "room_type": RoomType.VIP, "price_per_night": 250.0, "status": RoomStatus.MAINTENANCE},
    ]

    descriptions = {
        RoomType.STANDARD: [
            "Уютный номер с видом на город",
            "Комфортабельный номер с балконом",
            "Стандартный номер с мини-баром",
        ],
        RoomType.VIP: [
            "Люкс номер с джакузи и панорамным видом",
            "Премиум номер с гостиной зоной",
            "VIP номер с террасой и видом на горы",
            "Президентский люкс с двумя спальнями",
        ],
    }

    for config in room_configs:
        room_type = config["room_type"]
        room = Room(
            **config,
            description=random.choice(descriptions[config["room_type"]]),
            room_photo_paths=[
                f"/uploads/rooms/{config['room_number']}_1.jpg",
                f"/uploads/rooms/{config['room_number']}_2.jpg",
            ] if random.random() > 0.3 else [],
        )
        session.add(room)
        rooms.append(room)

    session.commit()
    print(f"✅ Created {len(rooms)} rooms")
    return rooms


def create_customers(session: Session) -> list[Customer]:
    """Create 20 customers with realistic Uzbek data."""
    print("👥 Creating customers...")
    customers = []

    # Realistic Uzbek names
    first_names_male = ["Азиз", "Рустам", "Шохрух", "Жасур", "Бахтиёр", "Мирзо", "Камол", "Равшан", "Улугбек", "Санжар"]
    first_names_female = ["Гульнара", "Дилноза", "Нилуфар", "Мадина", "Севара", "Зухра", "Малика", "Шахноза", "Дилдора", "Нигора"]
    last_names = ["Каримов", "Алимов", "Юсупов", "Рахимов", "Назаров", "Хасанов", "Абдуллаев", "Исмаилов", "Турсунов", "Махмудов",
                  "Каримова", "Алимова", "Юсупова", "Рахимова", "Назарова", "Хасанова", "Абдуллаева", "Исмаилова", "Турсунова", "Махмудова"]

    districts_list = list(District)

    for i in range(20):
        is_female = i % 2 == 0
        first_name = random.choice(first_names_female if is_female else first_names_male)
        last_name = random.choice(last_names[10:] if is_female else last_names[:10])

        # Generate Uzbek phone numbers (90, 91, 93, 94, 95, 97, 98, 99 prefixes)
        phone_prefix = random.choice(["90", "91", "93", "94", "95", "97", "98", "99"])
        phone = f"998{phone_prefix}{random.randint(1000000, 9999999)}"

        # Random birth date between 1960 and 2005
        birth_year = random.randint(1960, 2005)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)

        # Assign tags to some customers
        tags = []
        if random.random() < 0.15:  # 15% VIP
            tags.append(CustomerTag.VIP)
        elif random.random() < 0.25:  # 25% loyal
            tags.append(CustomerTag.LOYAL)
        elif random.random() < 0.05:  # 5% problematic
            tags.append(CustomerTag.PROBLEMATIC)

        customer = Customer(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            date_of_birth=datetime(birth_year, birth_month, birth_day, tzinfo=timezone.utc),
            district=random.choice(districts_list),
            notes=f"Клиент #{i+1}" if random.random() < 0.3 else None,
            tags=[tag.value for tag in tags],
            passport_photo_path=f"/uploads/passports/{phone}.jpg" if random.random() > 0.4 else None,
        )
        session.add(customer)
        customers.append(customer)

    session.commit()
    print(f"✅ Created {len(customers)} customers")
    return customers


def create_bookings(session: Session, rooms: list[Room], customers: list[Customer], users: list[User]) -> list[Booking]:
    """Create 100+ bookings with various statuses and dates."""
    print("📅 Creating bookings...")
    bookings = []

    # Get the superuser for audit logs
    superuser = session.exec(select(User).where(User.is_superuser)).first()
    all_users = users + ([superuser] if superuser else [])

    now = datetime.now(timezone.utc)

    # Create bookings over the last 6 months and next 3 months
    start_date = now - timedelta(days=180)

    # Payment methods distribution
    payment_methods = [PaymentMethod.CASH] * 50 + [PaymentMethod.TRANSFER] * 30 + [PaymentMethod.TERMINAL] * 20

    for i in range(120):  # Create 120 bookings
        customer = random.choice(customers)
        room = random.choice(rooms)

        # Vary booking start dates
        days_offset = random.randint(-180, 90)
        check_in = now + timedelta(days=days_offset)

        # Booking duration 1-14 nights, with bias towards 1-3 nights
        nights = random.choices(
            range(1, 15),
            weights=[30, 25, 20, 10, 5, 3, 2, 1, 1, 1, 1, 0.5, 0.3, 0.2],
            k=1
        )[0]
        check_out = check_in + timedelta(days=nights)

        # Determine status based on dates
        if check_out < now - timedelta(days=1):
            # Past bookings - mostly checked out
            status = random.choices(
                [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED],
                weights=[85, 15],
                k=1
            )[0]
        elif check_in <= now <= check_out:
            # Current bookings - mostly checked in
            status = random.choices(
                [BookingStatus.CHECKED_IN, BookingStatus.CONFIRMED],
                weights=[80, 20],
                k=1
            )[0]
        elif check_in > now:
            # Future bookings - confirmed or cancelled
            status = random.choices(
                [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
                weights=[90, 10],
                k=1
            )[0]
        else:
            status = BookingStatus.CONFIRMED

        # Calculate total amount
        total_before_discount = room.price_per_night * nights

        # Apply discount for some bookings
        discount = 0.0
        discount_reason = None
        if random.random() < 0.2:  # 20% of bookings have discount
            if CustomerTag.VIP in [tag for tag in customer.tags]:
                discount = 15.0
                discount_reason = "VIP клиент"
            elif CustomerTag.LOYAL in [tag for tag in customer.tags]:
                discount = 10.0
                discount_reason = "Постоянный клиент"
            elif nights >= 7:
                discount = 10.0
                discount_reason = "Скидка за длительное проживание"
            else:
                discount = 5.0
                discount_reason = "Промо акция"

        total_amount = total_before_discount * (1 - discount / 100)

        # Set actual check-in/out for past bookings
        actual_check_in = None
        actual_check_out = None
        payment_adjustments = []

        if status == BookingStatus.CHECKED_IN:
            actual_check_in = check_in + timedelta(hours=random.randint(-2, 4))
        elif status == BookingStatus.CHECKED_OUT:
            actual_check_in = check_in + timedelta(hours=random.randint(-2, 4))
            actual_check_out = check_out + timedelta(hours=random.randint(-3, 6))

            # Add payment adjustments for some checked-out bookings
            if random.random() < 0.15:  # 15% have adjustments
                adjustment_type = random.choice([
                    PaymentAdjustmentType.EARLY_CHECKOUT,
                    PaymentAdjustmentType.LATE_CHECKIN,
                    PaymentAdjustmentType.SERVICE_CHARGE,
                    PaymentAdjustmentType.DAMAGE_CHARGE,
                ])

                if adjustment_type == PaymentAdjustmentType.EARLY_CHECKOUT:
                    # Refund for early checkout
                    nights_not_used = random.randint(1, min(3, nights - 1))
                    refund_amount = -room.price_per_night * nights_not_used * 0.5  # 50% refund
                    payment_adjustments.append({
                        "type": adjustment_type.value,
                        "amount": refund_amount,
                        "reason": f"Ранний выезд, возврат за {nights_not_used} ночь(ей)",
                        "created_at": actual_check_out.isoformat(),
                        "created_by": random.choice(all_users).username if all_users else "system",
                    })
                elif adjustment_type == PaymentAdjustmentType.SERVICE_CHARGE:
                    # Additional service charge
                    service_amount = random.choice([20, 30, 50, 75, 100])
                    payment_adjustments.append({
                        "type": adjustment_type.value,
                        "amount": service_amount,
                        "reason": random.choice(["Мини-бар", "Услуги прачечной", "Room service", "Дополнительная уборка"]),
                        "created_at": actual_check_out.isoformat(),
                        "created_by": random.choice(all_users).username if all_users else "system",
                    })
                elif adjustment_type == PaymentAdjustmentType.DAMAGE_CHARGE:
                    # Damage charge
                    damage_amount = random.choice([50, 100, 150, 200])
                    payment_adjustments.append({
                        "type": adjustment_type.value,
                        "amount": damage_amount,
                        "reason": random.choice(["Повреждение мебели", "Разбитое зеркало", "Пятна на ковре", "Сломанная техника"]),
                        "created_at": actual_check_out.isoformat(),
                        "created_by": random.choice(all_users).username if all_users else "system",
                    })

        booking = Booking(
            customer_id=customer.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            status=status,
            total_amount=total_amount,
            discount=discount,
            discount_reason=discount_reason,
            payment_method=random.choice(payment_methods),
            registration_need=random.random() > 0.1,  # 90% need registration
            booking_date=check_in - timedelta(days=random.randint(1, 30)),
            actual_check_in=actual_check_in,
            actual_check_out=actual_check_out,
            payment_adjustments=payment_adjustments,
        )
        session.add(booking)
        bookings.append(booking)

    session.commit()

    # Update customer statistics
    print("📊 Updating customer statistics...")
    for customer in customers:
        customer_bookings = [b for b in bookings if b.customer_id == customer.id]
        customer.total_bookings = len(customer_bookings)
        customer.total_spent = sum(b.total_amount for b in customer_bookings if b.status != BookingStatus.CANCELLED)

        if customer_bookings:
            customer.first_booking_date = min(b.booking_date for b in customer_bookings)
            customer.last_booking_date = max(b.booking_date for b in customer_bookings)

    session.commit()
    print(f"✅ Created {len(bookings)} bookings")
    return bookings


def create_audit_logs(session: Session, users: list[User], customers: list[Customer],
                      rooms: list[Room], bookings: list[Booking]) -> None:
    """Create audit log entries for important operations."""
    print("📝 Creating audit logs...")

    # Get superuser
    superuser = session.exec(select(User).where(User.is_superuser)).first()
    all_users = users + ([superuser] if superuser else [])

    if not all_users:
        print("⚠️  No users available for audit logs")
        return

    audit_entries = []

    # Log room creations
    for room in rooms[:5]:  # Log first 5 rooms
        audit = AuditLog(
            user_id=random.choice(all_users).id,
            action="CREATE",
            entity_type="Room",
            entity_id=room.id,
            entity_name=f"Room {room.room_number}",
            description=f"Создан номер {room.room_number} на {room.floor} этаже",
            new_values={
                "room_number": room.room_number,
                "floor": room.floor,
                "room_type": room.room_type.value,
                "price_per_night": room.price_per_night,
            },
            timestamp=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 180)),
        )
        audit_entries.append(audit)

    # Log customer registrations
    for customer in customers[:10]:  # Log first 10 customers
        audit = AuditLog(
            user_id=random.choice(all_users).id,
            action="CREATE",
            entity_type="Customer",
            entity_id=customer.id,
            entity_name=f"{customer.first_name} {customer.last_name}",
            description=f"Зарегистрирован клиент {customer.first_name} {customer.last_name}",
            new_values={
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "phone": customer.phone,
                "district": customer.district.value if customer.district else None,
            },
            timestamp=customer.created_at,
        )
        audit_entries.append(audit)

    # Log booking status changes
    checked_in_bookings = [b for b in bookings if b.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]]
    for booking in checked_in_bookings[:20]:  # Log first 20 check-ins
        # Check-in log
        audit = AuditLog(
            user_id=random.choice(all_users).id,
            action="UPDATE",
            entity_type="Booking",
            entity_id=booking.id,
            entity_name=f"Booking #{str(booking.id)[:8]}",
            description=f"Гость заселен в номер",
            old_values={"status": BookingStatus.CONFIRMED.value},
            new_values={"status": BookingStatus.CHECKED_IN.value},
            timestamp=booking.actual_check_in or booking.check_in,
        )
        audit_entries.append(audit)

        # Check-out log if applicable
        if booking.status == BookingStatus.CHECKED_OUT:
            audit = AuditLog(
                user_id=random.choice(all_users).id,
                action="UPDATE",
                entity_type="Booking",
                entity_id=booking.id,
                entity_name=f"Booking #{str(booking.id)[:8]}",
                description=f"Гость выселен из номера",
                old_values={"status": BookingStatus.CHECKED_IN.value},
                new_values={"status": BookingStatus.CHECKED_OUT.value},
                timestamp=booking.actual_check_out or booking.check_out,
            )
            audit_entries.append(audit)

    # Add audit entries to session
    for audit in audit_entries:
        session.add(audit)

    session.commit()
    print(f"✅ Created {len(audit_entries)} audit log entries")


def main() -> None:
    """Main function to seed the database."""
    print("🌱 Starting database seeding...")
    print(f"📊 Database: {settings.POSTGRES_DB}")
    print(f"🔗 Server: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}")

    with Session(engine) as session:
        # Clear existing data (optional - comment out if you want to append)
        clear_existing_data(session)

        # Create data in order
        users = create_users(session)
        rooms = create_rooms(session)
        customers = create_customers(session)
        bookings = create_bookings(session, rooms, customers, users)
        create_audit_logs(session, users, customers, rooms, bookings)

        print("\n" + "="*50)
        print("✅ Database seeding completed successfully!")
        print("="*50)
        print("\n📊 Summary:")
        print(f"  👤 Users: {len(users)}")
        print(f"  🏨 Rooms: {len(rooms)}")
        print(f"  👥 Customers: {len(customers)}")
        print(f"  📅 Bookings: {len(bookings)}")

        # Show some statistics
        status_counts: dict[str, int] = {}
        for booking in bookings:
            status = booking.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        print("\n📈 Booking Status Distribution:")
        for status, count in status_counts.items():
            print(f"  - {status}: {count}")

        room_status_counts: dict[str, int] = {}
        for room in rooms:
            status = room.status.value
            room_status_counts[status] = room_status_counts.get(status, 0) + 1

        print("\n🏨 Room Status Distribution:")
        for status, count in room_status_counts.items():
            print(f"  - {status}: {count}")


if __name__ == "__main__":
    main()