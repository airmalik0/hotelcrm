#!/usr/bin/env python3
"""Comprehensive test of all new functionality"""

import requests
import json
import time
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def get_token():
    """Get authentication token"""
    resp = requests.post(
        f"{BASE_URL}/login/access-token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"username": "admin", "password": "hope228_"}
    )
    return resp.json()["access_token"]

def check_existing_data(headers):
    """Check what data exists"""
    print("\n=== CHECKING EXISTING DATA ===")
    
    # Get bookings
    resp = requests.get(f"{BASE_URL}/bookings?limit=1000", headers=headers)
    bookings = resp.json()
    print(f"Bookings count: {bookings.get('count', 0)}")
    
    # Get rooms  
    resp = requests.get(f"{BASE_URL}/rooms?limit=1000", headers=headers)
    rooms = resp.json()
    print(f"Rooms count: {rooms.get('count', 0)}")
    
    # Get customers
    resp = requests.get(f"{BASE_URL}/customers?limit=1000", headers=headers)
    customers = resp.json()
    print(f"Customers count: {customers.get('count', 0)}")
    
    return bookings, rooms, customers

def create_comprehensive_test_data(headers):
    """Create test data for 2024"""
    print("\n=== CREATING TEST DATA FOR 2024 ===")
    
    # Get existing rooms and customers
    rooms_resp = requests.get(f"{BASE_URL}/rooms?limit=100", headers=headers)
    rooms = rooms_resp.json().get("data", [])
    
    customers_resp = requests.get(f"{BASE_URL}/customers?limit=100", headers=headers)  
    customers = customers_resp.json().get("data", [])
    
    if not rooms or not customers:
        print("ERROR: No rooms or customers available!")
        return []
    
    print(f"Using {len(rooms)} rooms and {len(customers)} customers")
    
    # Create bookings for each month of 2024
    created_bookings = []
    payment_methods = ["cash", "terminal", "transfer"]
    
    for month in range(1, 13):
        print(f"Creating bookings for month {month}/2024...")
        
        # Create 10-20 bookings per month
        num_bookings = random.randint(10, 20)
        
        for _ in range(num_bookings):
            customer = random.choice(customers)
            room = random.choice(rooms)
            
            # Random day in the month
            day = random.randint(1, 28)
            duration = random.randint(1, 5)
            
            check_in = datetime(2024, month, day, 14, 0)
            check_out = check_in + timedelta(days=duration)
            
            # Calculate total
            total = room["price_per_night"] * duration
            
            # Sometimes add discount
            discount = 0
            discount_reason = None
            if random.random() < 0.3:  # 30% chance
                discount = random.randint(5, 25)
                discount_reason = "Regular customer"
                total = total * (1 - discount/100)
            
            booking_data = {
                "customer_id": customer["id"],
                "room_id": room["id"],
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "total_amount": round(total, 2),
                "payment_method": random.choice(payment_methods),
                "status": "confirmed",
                "discount_percentage": discount,
                "discount_reason": discount_reason
            }
            
            resp = requests.post(f"{BASE_URL}/bookings", headers=headers, json=booking_data)
            if resp.status_code in [200, 201]:
                booking = resp.json()
                created_bookings.append(booking)
                
                # For past months, check in and check out
                if month <= 9:  # Up to September
                    # Check in
                    requests.post(f"{BASE_URL}/bookings/{booking['id']}/check-in", headers=headers)
                    # Check out  
                    requests.post(f"{BASE_URL}/bookings/{booking['id']}/check-out", headers=headers)
            else:
                print(f"  Failed to create booking: {resp.status_code}")
    
    print(f"Created {len(created_bookings)} bookings for 2024")
    return created_bookings

def test_all_report_types(headers):
    """Test each report type"""
    print("\n=== TESTING ALL REPORT TYPES ===")
    
    test_results = {}
    
    # Define all report tests
    reports = [
        {
            "name": "Occupancy Standard (Monthly)",
            "endpoint": "occupancy_standard",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "json",
                "group_by": "month"
            }
        },
        {
            "name": "Occupancy Daily Pattern",
            "endpoint": "occupancy_daily_pattern",
            "params": {
                "start_date": "2024-07-01T00:00:00",
                "end_date": "2024-07-31T23:59:59",
                "format": "csv"
            }
        },
        {
            "name": "Occupancy Weekly Pattern",
            "endpoint": "occupancy_weekly_pattern",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "excel"
            }
        },
        {
            "name": "Occupancy Seasonal Trend",
            "endpoint": "occupancy_seasonal_trend",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "pdf",
                "include_charts": True
            }
        },
        {
            "name": "Revenue Report (VIP rooms)",
            "endpoint": "revenue",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "excel",
                "group_by": "month",
                "room_type": "vip"
            }
        },
        {
            "name": "Top Customers",
            "endpoint": "top_customers",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "csv",
                "limit": 10,
                "sort_by": "revenue"
            }
        },
        {
            "name": "Repeat Guest Rate",
            "endpoint": "repeat_guest_rate",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "json",
                "group_by": "month"
            }
        },
        {
            "name": "Payment Methods",
            "endpoint": "payment_methods",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "pdf",
                "group_by": "month",
                "include_charts": True
            }
        },
        {
            "name": "Geographic Analysis",
            "endpoint": "geographic_analysis",
            "params": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "excel"
            }
        }
    ]
    
    for report in reports:
        print(f"\nTesting: {report['name']}")
        
        # Generate report
        resp = requests.post(
            f"{BASE_URL}/reports/{report['endpoint']}/generate",
            headers=headers,
            json=report['params']
        )
        
        if resp.status_code != 200:
            print(f"  ❌ Failed to generate: {resp.status_code}")
            test_results[report['name']] = "Failed to generate"
            continue
        
        job = resp.json()
        job_id = job["job_id"]
        print(f"  Job ID: {job_id}")
        
        # Wait for completion
        for i in range(30):
            time.sleep(1)
            resp = requests.get(f"{BASE_URL}/reports/jobs/{job_id}/status", headers=headers)
            if resp.status_code != 200:
                break
            
            status = resp.json()
            if status["status"] == "completed":
                print(f"  ✓ Completed in {i+1} seconds")
                
                # Try to download
                resp = requests.get(f"{BASE_URL}/reports/jobs/{job_id}/download", headers=headers)
                if resp.status_code == 200:
                    file_size = len(resp.content)
                    print(f"  ✓ Downloaded: {file_size} bytes")
                    
                    # Check content
                    if file_size > 100:
                        test_results[report['name']] = f"Success ({file_size} bytes)"
                    else:
                        test_results[report['name']] = f"Empty file ({file_size} bytes)"
                else:
                    test_results[report['name']] = f"Download failed: {resp.status_code}"
                break
            elif status["status"] == "failed":
                error = status.get("error", "Unknown error")
                print(f"  ❌ Failed: {error}")
                test_results[report['name']] = f"Failed: {error}"
                break
        else:
            test_results[report['name']] = "Timeout"
    
    return test_results

def test_import_functionality(headers):
    """Test CSV import with edge cases"""
    print("\n=== TESTING IMPORT FUNCTIONALITY ===")
    
    # Test 1: Valid CSV
    print("\n1. Testing valid CSV import...")
    csv_content = """first_name,last_name,phone,date_of_birth,district
TestImport,User1,+79990000001,1990-01-01,TestDistrict1
TestImport,User2,+79990000002,1991-02-02,TestDistrict2"""
    
    files = {'file': ('test.csv', csv_content, 'text/csv')}
    resp = requests.post(f"{BASE_URL}/import/customers/import", headers=headers, files=files)
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        result = resp.json()
        if result.get("success"):
            print(f"  ✓ Imported {result.get('imported', 0)} customers")
        else:
            print(f"  Message: {result.get('message')}")
    
    # Test 2: Duplicate phone numbers
    print("\n2. Testing duplicate detection...")
    csv_content = """first_name,last_name,phone,date_of_birth,district
TestDup,User1,+79990000001,1990-01-01,TestDistrict1
TestDup,User2,+79990000001,1991-02-02,TestDistrict2"""
    
    files = {'file': ('test.csv', csv_content, 'text/csv')}
    resp = requests.post(f"{BASE_URL}/import/customers/import", headers=headers, files=files)
    if resp.status_code == 200:
        result = resp.json()
        if not result.get("success"):
            print(f"  ✓ Correctly rejected duplicates")
        else:
            print(f"  ❌ Should have rejected duplicates")

def test_report_filters(headers):
    """Test reports with different filters"""
    print("\n=== TESTING REPORT FILTERS ===")
    
    # Test with different groupings
    groupings = ["day", "week", "month", "year"]
    for group_by in groupings:
        print(f"\nTesting grouping by: {group_by}")
        resp = requests.post(
            f"{BASE_URL}/reports/revenue/generate",
            headers=headers,
            json={
                "start_date": "2024-06-01T00:00:00",
                "end_date": "2024-08-31T23:59:59",
                "format": "json",
                "group_by": group_by
            }
        )
        if resp.status_code == 200:
            print(f"  ✓ {group_by} grouping works")
        else:
            print(f"  ❌ {group_by} grouping failed")

def main():
    print("="*60)
    print("COMPREHENSIVE FUNCTIONALITY TEST")
    print("="*60)
    
    # Get token
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print(f"✓ Authenticated")
    
    # Check existing data
    bookings, rooms, customers = check_existing_data(headers)
    
    # Create test data if needed
    if bookings.get("count", 0) < 50:
        create_comprehensive_test_data(headers)
    
    # Test all report types
    test_results = test_all_report_types(headers)
    
    # Test import functionality
    test_import_functionality(headers)
    
    # Test filters
    test_report_filters(headers)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    print("\nReport Test Results:")
    for name, result in test_results.items():
        status = "✓" if "Success" in result else "❌"
        print(f"  {status} {name}: {result}")
    
    # Count successes
    successes = sum(1 for r in test_results.values() if "Success" in r)
    total = len(test_results)
    
    print(f"\nOverall: {successes}/{total} reports working correctly")
    
    if successes == total:
        print("✅ ALL TESTS PASSED!")
    else:
        print(f"⚠️ {total - successes} reports have issues")

if __name__ == "__main__":
    main()