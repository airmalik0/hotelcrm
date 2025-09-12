#!/bin/bash

# Create test customers for Hotel CRM
# Run from project root: ./scripts/create_test_customers.sh

API_URL="http://localhost:8000/api/v1"

# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST "$API_URL/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=changethis123" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "Failed to get auth token. Make sure the backend is running and credentials are correct."
  exit 1
fi

echo "Token obtained successfully"

# Create customers
echo "Creating test customers..."

# Customer 1
curl -X POST "$API_URL/customers/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Smith",
    "phone": "+1234567890",
    "date_of_birth": "1985-03-15T00:00:00",
    "district": "Yunusabad",
    "notes": "VIP customer, prefers quiet rooms"
  }'
echo ""

# Customer 2
curl -X POST "$API_URL/customers/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Sarah",
    "last_name": "Johnson",
    "phone": "+1987654321",
    "date_of_birth": "1990-07-22T00:00:00",
    "district": "Mirabad",
    "notes": "Regular business traveler"
  }'
echo ""

# Customer 3
curl -X POST "$API_URL/customers/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Michael",
    "last_name": "Brown",
    "phone": "+1555666777",
    "date_of_birth": "1978-11-08T00:00:00",
    "district": "Chilanzar",
    "notes": "Family vacations, needs adjoining rooms"
  }'
echo ""

# Customer 4
curl -X POST "$API_URL/customers/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Emily",
    "last_name": "Davis",
    "phone": "+1444333222",
    "date_of_birth": "1995-01-30T00:00:00",
    "district": "Sergeli",
    "notes": "Weekend getaways"
  }'
echo ""

# Customer 5
curl -X POST "$API_URL/customers/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Robert",
    "last_name": "Wilson",
    "phone": "+1777888999",
    "date_of_birth": "1982-06-18T00:00:00",
    "district": "Yakkasaray",
    "notes": "Corporate account"
  }'
echo ""

echo "Test customers created successfully!"