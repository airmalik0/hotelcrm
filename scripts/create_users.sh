#!/bin/bash

# Check required environment variables
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "Error: ADMIN_PASSWORD environment variable is required"
    echo "Usage: ADMIN_PASSWORD=your_password USERS_PASSWORD=users_password $0"
    exit 1
fi

if [ -z "$USERS_PASSWORD" ]; then
    echo "Error: USERS_PASSWORD environment variable is required"
    echo "Usage: ADMIN_PASSWORD=your_password USERS_PASSWORD=users_password $0"
    exit 1
fi

# Set API URL (can be overridden with environment variable)
API_URL="${API_URL:-http://localhost:8000/api/v1}"

# Get admin token
echo "Getting admin token..."
TOKEN=$(curl -s -X POST "$API_URL/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=admin&password=$ADMIN_PASSWORD" \
  | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to get admin token"
    exit 1
fi

echo "Token obtained successfully"

# Create manager user
echo -e "\nCreating manager user..."
curl -X POST "$API_URL/users/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager1",
    "password": "$USERS_PASSWORD",
    "full_name": "John Manager",
    "role": "manager",
    "is_active": true,
    "is_superuser": false
  }' | jq

# Create host user
echo -e "\nCreating host user..."
curl -X POST "$API_URL/users/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "host1",
    "password": "$USERS_PASSWORD",
    "full_name": "Alice Host",
    "role": "host",
    "is_active": true,
    "is_superuser": false
  }' | jq

# Create another host user
echo -e "\nCreating second host user..."
curl -X POST "$API_URL/users/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "host2",
    "password": "$USERS_PASSWORD",
    "full_name": "Bob Host",
    "role": "host",
    "is_active": true,
    "is_superuser": false
  }' | jq

echo -e "\n✅ Users created successfully!"
echo "You can now login with:"
echo "  - manager1 / $USERS_PASSWORD (Manager role)"
echo "  - host1 / $USERS_PASSWORD (Host role)"
echo "  - host2 / $USERS_PASSWORD (Host role)"