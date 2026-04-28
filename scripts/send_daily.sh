#!/bin/bash

# Load environment variables if .env file exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$ADMIN_API_KEY" ]; then
  echo "Error: ADMIN_API_KEY is not set"
  exit 1
fi

APP_URL=${NEXT_PUBLIC_APP_URL:-"http://localhost:3000"}

echo "Sending daily notifications..."
curl -X GET "$APP_URL/api/admin/notifications/daily" \
     -H "x-admin-key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json"
