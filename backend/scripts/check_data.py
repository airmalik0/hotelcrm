#!/usr/bin/env python3
"""Check what data actually exists in the database"""

import os
import sys
sys.path.append('/home/malik/hotelcrm/backend')

from sqlmodel import Session, select, func
from app.core.db import engine
from app.models import Booking, Customer, Room
from datetime import datetime

def main():
    with Session(engine) as session:
        # Count entities
        booking_count = session.exec(select(func.count(Booking.id))).first()
        customer_count = session.exec(select(func.count(Customer.id))).first()
        room_count = session.exec(select(func.count(Room.id))).first()
        
        print(f"Total bookings: {booking_count}")
        print(f"Total customers: {customer_count}")
        print(f"Total rooms: {room_count}")
        
        # Check booking date ranges
        if booking_count > 0:
            min_date = session.exec(select(func.min(Booking.check_in))).first()
            max_date = session.exec(select(func.max(Booking.check_out))).first()
            print(f"\nBooking date range:")
            print(f"  Earliest check-in: {min_date}")
            print(f"  Latest check-out: {max_date}")
            
            # Check bookings by year
            bookings = session.exec(select(Booking).limit(100)).all()
            years = {}
            for b in bookings:
                year = b.check_in.year
                years[year] = years.get(year, 0) + 1
            
            print(f"\nBookings by year:")
            for year, count in sorted(years.items()):
                print(f"  {year}: {count} bookings")
            
            # Sample some bookings
            print(f"\nSample bookings:")
            for b in bookings[:5]:
                print(f"  - {b.check_in.date()} to {b.check_out.date()} - Status: {b.status.value}")

if __name__ == "__main__":
    main()