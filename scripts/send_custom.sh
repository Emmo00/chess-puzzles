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

TITLE=$1
DESCRIPTION=$2
DESTINATION_URL=$3

if [ -z "$TITLE" ] || [ -z "$DESCRIPTION" ] || [ -z "$DESTINATION_URL" ]; then
  echo "Usage: ./send_custom.sh \"Title\" \"Description\" \"https://destination.url\""
  exit 1
fi

echo "Sending custom notification: $TITLE"
curl -X POST "$APP_URL/api/admin/notifications/custom" \
     -H "x-admin-key: $ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d "{\"title\": \"$TITLE\", \"description\": \"$DESCRIPTION\", \"destinationUrl\": \"$DESTINATION_URL\"}"
