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
DAYS=${1:-3}

echo "Sending reminders to users inactive for $DAYS days..."
curl -X GET "$APP_URL/api/admin/notifications/reminders?days=$DAYS" \
     -H "x-admin-key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json"
