#!/usr/bin/env python3
"""
Test script to verify that the audit API endpoints work correctly.
"""

import json
import requests
from urllib.parse import urljoin

def test_audit_api():
    """Test the audit API endpoints"""
    base_url = "http://localhost:8000"
    api_base = urljoin(base_url, "/api/v1")
    
    # First login to get token
    login_data = {
        "username": "admin",
        "password": "hope228_"  # From .env
    }
    
    print("🔐 Logging in...")
    login_response = requests.post(
        urljoin(api_base, "/login/access-token"), 
        data=login_data
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ Login successful")
    
    # Test audit logs endpoint
    print("📊 Testing audit logs API...")
    audit_response = requests.get(
        urljoin(api_base, "/audit/"), 
        headers=headers,
        params={"limit": 5}
    )
    
    print(f"Status: {audit_response.status_code}")
    
    if audit_response.status_code == 200:
        data = audit_response.json()
        print(f"✅ Audit API works! Found {data.get('count', 0)} audit logs")
        
        if data.get('data'):
            first_log = data['data'][0]
            print(f"First log: {first_log.get('action')} by {first_log.get('username')}")
            print(f"Log keys: {list(first_log.keys())}")
        else:
            print("No audit logs found")
    else:
        print(f"❌ Audit API failed: {audit_response.status_code}")
        print(f"Response: {audit_response.text}")
    
    # Test audit stats endpoint
    print("\n📈 Testing audit stats API...")
    stats_response = requests.get(
        urljoin(api_base, "/audit/stats/summary"), 
        headers=headers
    )
    
    print(f"Stats Status: {stats_response.status_code}")
    
    if stats_response.status_code == 200:
        stats = stats_response.json()
        print(f"✅ Stats API works! Total logs: {stats.get('total_logs', 0)}")
        print(f"Actions by type: {len(stats.get('by_action', []))}")
    else:
        print(f"❌ Stats API failed: {stats_response.status_code}")
        print(f"Response: {stats_response.text}")

if __name__ == "__main__":
    test_audit_api()