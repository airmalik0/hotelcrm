#!/bin/bash

# Get admin token
echo "Getting admin token..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=admin&password=hope228_" \
  | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to get admin token"
    exit 1
fi

echo "Token obtained successfully"

# Create manager user
echo -e "\nCreating manager user..."
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manager1",
    "password": "hope228_",
    "full_name": "John Manager",
    "role": "manager",
    "is_active": true,
    "is_superuser": false
  }' | jq

# Create host user
echo -e "\nCreating host user..."
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "host1",
    "password": "hope228_",
    "full_name": "Alice Host",
    "role": "host",
    "is_active": true,
    "is_superuser": false
  }' | jq

# Create another host user
echo -e "\nCreating second host user..."
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "host2",
    "password": "hope228_",
    "full_name": "Bob Host",
    "role": "host",
    "is_active": true,
    "is_superuser": false
  }' | jq

echo -e "\n✅ Users created successfully!"
echo "You can now login with:"
echo "  - manager1 / hope228_ (Manager role)"
echo "  - host1 / hope228_ (Host role)"
echo "  - host2 / hope228_ (Host role)"