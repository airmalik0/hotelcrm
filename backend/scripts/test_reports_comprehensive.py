#!/usr/bin/env python3
"""Comprehensive testing of all report functionality"""

import json
import os
import time

import requests

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgwNjI2MDMsInN1YiI6IjI2NjQ4MzljLTBlNmMtNGNmMS1iOTUyLWE2ZWYwZjBlYzdmNSJ9.Su7ixGRkgHuyUn_fmV-N3PlJpfNw0gZy6Qoq4EMe_Wk"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def test_report(report_type, endpoint, params, description):
    """Test a single report generation"""
    print(f"\n{description}")
    print("-" * 40)

    # Generate report
    resp = requests.post(f"{BASE_URL}/reports/{endpoint}/generate", headers=HEADERS, json=params)
    if resp.status_code != 200:
        print(f"❌ Failed to generate: {resp.status_code} - {resp.text}")
        return False

    job = resp.json()
    job_id = job["job_id"]
    print(f"✓ Job created: {job_id}")

    # Wait for completion
    max_attempts = 30
    for i in range(max_attempts):
        resp = requests.get(f"{BASE_URL}/reports/jobs/{job_id}/status", headers=HEADERS)
        if resp.status_code != 200:
            print(f"❌ Failed to check status: {resp.text}")
            return False

        status = resp.json()
        if status["status"] == "completed":
            print(f"✓ Report completed in {i+1} seconds")

            # Download report
            resp = requests.get(f"{BASE_URL}/reports/jobs/{job_id}/download", headers=HEADERS)
            if resp.status_code == 200:
                # Save file
                format_ext = params.get("format", "json")
                filename = f"/tmp/test_{report_type}_{job_id[:8]}.{format_ext}"

                with open(filename, "wb") as f:
                    f.write(resp.content)

                file_size = os.path.getsize(filename)
                print(f"✓ Downloaded: {filename} ({file_size} bytes)")

                # Check if file has content
                if file_size > 100:  # More than just empty JSON
                    print("✓ Report has content")

                    # For JSON reports, show a preview
                    if format_ext == "json":
                        with open(filename) as f:
                            data = json.load(f)
                            if isinstance(data, list) and len(data) > 0:
                                print(f"  Preview: {len(data)} records")
                                print(f"  First record: {json.dumps(data[0], indent=2)[:200]}...")
                            else:
                                print(f"  Report data: {json.dumps(data)[:200]}...")
                else:
                    print(f"⚠️  Report seems empty ({file_size} bytes)")

                return True
            else:
                print(f"❌ Failed to download: {resp.status_code}")
                return False

        elif status["status"] == "failed":
            print(f"❌ Job failed: {status.get('error', 'Unknown error')}")
            return False

        time.sleep(1)

    print("❌ Timeout waiting for report")
    return False

def main():
    print("="*60)
    print("COMPREHENSIVE REPORT TESTING")
    print("="*60)

    results = []

    # Test 1: Occupancy Standard with monthly grouping
    results.append(test_report(
        "occupancy_standard",
        "occupancy_standard",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "json",
            "group_by": "month"
        },
        "1. Occupancy Standard Report (Monthly)"
    ))

    # Test 2: Revenue report with room type filter
    results.append(test_report(
        "revenue_vip",
        "revenue",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "excel",
            "group_by": "month",
            "room_type": "vip"
        },
        "2. Revenue Report (VIP rooms only)"
    ))

    # Test 3: Top Customers by bookings
    results.append(test_report(
        "top_customers",
        "top_customers",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "csv",
            "limit": 5,
            "sort_by": "bookings"
        },
        "3. Top 5 Customers by Bookings"
    ))

    # Test 4: Weekly Pattern
    results.append(test_report(
        "weekly_pattern",
        "occupancy_weekly_pattern",
        {
            "start_date": "2024-06-01T00:00:00",
            "end_date": "2024-08-31T23:59:59",
            "format": "json",
            "room_type": "standard"
        },
        "4. Weekly Pattern (Summer, Standard rooms)"
    ))

    # Test 5: Payment Methods with charts
    results.append(test_report(
        "payment_methods",
        "payment_methods",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "pdf",
            "group_by": "month",
            "include_charts": True
        },
        "5. Payment Methods Report (PDF with charts)"
    ))

    # Test 6: Geographic Analysis
    results.append(test_report(
        "geographic",
        "geographic_analysis",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "excel"
        },
        "6. Geographic Analysis"
    ))

    # Test 7: Daily Pattern
    results.append(test_report(
        "daily_pattern",
        "occupancy_daily_pattern",
        {
            "start_date": "2024-07-01T00:00:00",
            "end_date": "2024-07-31T23:59:59",
            "format": "csv"
        },
        "7. Daily Pattern (July)"
    ))

    # Test 8: Seasonal Trend with different grouping
    results.append(test_report(
        "seasonal_trend",
        "occupancy_seasonal_trend",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "pdf",
            "include_charts": True
        },
        "8. Seasonal Trend (PDF with charts)"
    ))

    # Test 9: Repeat Guest Rate
    results.append(test_report(
        "repeat_guest",
        "repeat_guest_rate",
        {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T23:59:59",
            "format": "json",
            "group_by": "month"
        },
        "9. Repeat Guest Rate"
    ))

    # Test 10: Concurrent report generation
    print("\n10. Concurrent Report Generation")
    print("-" * 40)

    jobs = []
    for i in range(3):
        resp = requests.post(
            f"{BASE_URL}/reports/revenue/generate",
            headers=HEADERS,
            json={
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59",
                "format": "json",
                "group_by": "month"
            }
        )
        if resp.status_code == 200:
            jobs.append(resp.json()["job_id"])

    print(f"✓ Started {len(jobs)} concurrent jobs")

    # Wait for all to complete
    time.sleep(3)
    all_completed = True
    for job_id in jobs:
        resp = requests.get(f"{BASE_URL}/reports/jobs/{job_id}/status", headers=HEADERS)
        if resp.status_code == 200:
            status = resp.json()["status"]
            if status != "completed":
                all_completed = False
                print(f"❌ Job {job_id[:8]} status: {status}")
            else:
                print(f"✓ Job {job_id[:8]} completed")

    results.append(all_completed)

    # Test error handling
    print("\n11. Error Handling Tests")
    print("-" * 40)

    # Invalid date range
    resp = requests.post(
        f"{BASE_URL}/reports/revenue/generate",
        headers=HEADERS,
        json={
            "start_date": "2024-12-31T00:00:00",
            "end_date": "2024-01-01T00:00:00",  # End before start
            "format": "json"
        }
    )
    # This might not fail at generation but at processing
    print(f"Invalid date range: Status {resp.status_code}")

    # Invalid format
    resp = requests.post(
        f"{BASE_URL}/reports/revenue/generate",
        headers=HEADERS,
        json={
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-12-31T00:00:00",
            "format": "invalid_format"
        }
    )
    print(f"Invalid format: Status {resp.status_code}")

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(1 for r in results if r)
    total = len(results)

    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("✅ All tests passed!")
    else:
        print(f"⚠️  {total - passed} tests failed")

    # Check generated files
    print("\nGenerated test files in /tmp/:")
    os.system("ls -la /tmp/test_*.* 2>/dev/null | tail -10")

if __name__ == "__main__":
    main()
