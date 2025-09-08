#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta
import random

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgwNjI2MDMsInN1YiI6IjI2NjQ4MzljLTBlNmMtNGNmMS1iOTUyLWE2ZWYwZjBlYzdmNSJ9.Su7ixGRkgHuyUn_fmV-N3PlJpfNw0gZy6Qoq4EMe_Wk"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def check_existing_data():
    """Check what data already exists"""
    print("Checking existing data...")
    
    # Check bookings
    resp = requests.get(f"{BASE_URL}/bookings", headers=HEADERS)
    bookings = resp.json()
    print(f"Bookings: {bookings.get('count', 0)}")
    
    # Check rooms
    resp = requests.get(f"{BASE_URL}/rooms", headers=HEADERS)
    rooms = resp.json()
    print(f"Rooms: {rooms.get('count', 0)}")
    
    # Check customers
    resp = requests.get(f"{BASE_URL}/customers", headers=HEADERS)
    customers = resp.json()
    print(f"Customers: {customers.get('count', 0)}")
    
    return bookings, rooms, customers

def create_rooms():
    """Create test rooms"""
    print("\nCreating rooms...")
    room_numbers = ["101", "102", "103", "201", "202", "203", "301", "302", "303", "401"]
    room_types = ["standard", "standard", "standard", "standard", "vip", "vip", "standard", "standard", "vip", "vip"]
    prices = [100, 100, 120, 120, 250, 300, 150, 150, 350, 400]
    
    created_rooms = []
    for i, (num, rtype, price) in enumerate(zip(room_numbers, room_types, prices)):
        room_data = {
            "room_number": num,
            "room_type": rtype,
            "floor": int(num[0]),
            "price_per_night": price,
            "status": "available",
            "capacity": 2 if rtype == "standard" else 4
        }
        
        resp = requests.post(f"{BASE_URL}/rooms", headers=HEADERS, json=room_data)
        if resp.status_code in [200, 201]:
            created_rooms.append(resp.json())
            print(f"  Created room {num}")
        else:
            print(f"  Failed to create room {num}: {resp.text}")
    
    return created_rooms

def create_customers():
    """Create test customers with different districts"""
    print("\nCreating customers...")
    customers_data = [
        {"first_name": "Ivan", "last_name": "Petrov", "phone": "+79001234501", "district": "Downtown"},
        {"first_name": "Maria", "last_name": "Sidorova", "phone": "+79001234502", "district": "Uptown"},
        {"first_name": "Alex", "last_name": "Smirnov", "phone": "+79001234503", "district": "Midtown"},
        {"first_name": "Elena", "last_name": "Ivanova", "phone": "+79001234504", "district": "Downtown"},
        {"first_name": "Dmitry", "last_name": "Kozlov", "phone": "+79001234505", "district": "Westside"},
        {"first_name": "Olga", "last_name": "Novikova", "phone": "+79001234506", "district": "Eastside"},
        {"first_name": "Sergey", "last_name": "Volkov", "phone": "+79001234507", "district": "Downtown"},
        {"first_name": "Anna", "last_name": "Fedorova", "phone": "+79001234508", "district": "Uptown"},
        {"first_name": "Pavel", "last_name": "Morozov", "phone": "+79001234509", "district": "Midtown"},
        {"first_name": "Natalia", "last_name": "Popova", "phone": "+79001234510", "district": "Downtown"},
    ]
    
    created_customers = []
    for cust in customers_data:
        cust["date_of_birth"] = f"{random.randint(1960, 2000)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        resp = requests.post(f"{BASE_URL}/customers", headers=HEADERS, json=cust)
        if resp.status_code in [200, 201]:
            created_customers.append(resp.json())
            print(f"  Created customer {cust['first_name']} {cust['last_name']}")
        else:
            print(f"  Failed to create customer: {resp.text}")
    
    return created_customers

def create_bookings(rooms, customers):
    """Create various bookings across 2024"""
    print("\nCreating bookings...")
    
    if not rooms or not customers:
        print("No rooms or customers available!")
        return []
    
    payment_methods = ["cash", "terminal", "transfer"]
    created_bookings = []
    
    # Create bookings spread across the year
    for month in range(1, 13):
        num_bookings = random.randint(8, 15)  # Different activity each month
        
        for _ in range(num_bookings):
            # Random customer and room
            customer = random.choice(customers)
            room = random.choice(rooms)
            
            # Random dates within the month
            day_start = random.randint(1, 20)
            duration = random.randint(1, 7)
            
            check_in = datetime(2024, month, day_start, 14, 0, 0)
            check_out = check_in + timedelta(days=duration)
            
            # Calculate total
            total = room["price_per_night"] * duration
            
            # Sometimes add discount
            discount = 0
            discount_reason = None
            if random.random() < 0.2:  # 20% chance of discount
                discount = random.randint(5, 20)
                discount_reason = "Regular customer"
                total = total * (1 - discount / 100)
            
            booking_data = {
                "customer_id": customer["id"],
                "room_id": room["id"],
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "total_amount": total,
                "payment_method": random.choice(payment_methods),
                "status": "completed" if month < 9 else "confirmed",  # Past bookings are completed
                "discount_percentage": discount,
                "discount_reason": discount_reason
            }
            
            resp = requests.post(f"{BASE_URL}/bookings", headers=HEADERS, json=booking_data)
            if resp.status_code in [200, 201]:
                booking = resp.json()
                created_bookings.append(booking)
                
                # Check in and check out past bookings
                if month < 9:
                    # Check in
                    requests.post(f"{BASE_URL}/bookings/{booking['id']}/check-in", headers=HEADERS)
                    # Check out
                    requests.post(f"{BASE_URL}/bookings/{booking['id']}/check-out", headers=HEADERS)
                
                print(f"  Created booking for {check_in.date()} - {check_out.date()}")
    
    return created_bookings

def main():
    print("="*50)
    print("Creating comprehensive test data for Hotel CRM")
    print("="*50)
    
    # Check existing data
    bookings, rooms, customers = check_existing_data()
    
    # Create rooms if needed
    if rooms.get("count", 0) == 0:
        rooms_list = create_rooms()
    else:
        rooms_list = rooms.get("data", [])
        print(f"Using existing {len(rooms_list)} rooms")
    
    # Get customers (we already created some via CSV import)
    resp = requests.get(f"{BASE_URL}/customers?limit=100", headers=HEADERS)
    customers_list = resp.json().get("data", [])
    
    # Create more customers if needed
    if len(customers_list) < 10:
        new_customers = create_customers()
        customers_list.extend(new_customers)
    else:
        print(f"Using existing {len(customers_list)} customers")
    
    # Create bookings
    if bookings.get("count", 0) == 0:
        bookings_list = create_bookings(rooms_list, customers_list)
        print(f"\nCreated {len(bookings_list)} bookings")
    else:
        print(f"Already have {bookings.get('count', 0)} bookings")
    
    print("\n" + "="*50)
    print("Test data creation completed!")
    print("="*50)

if __name__ == "__main__":
    main()