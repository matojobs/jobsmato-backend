#!/bin/bash

API_URL="http://localhost:5001"
TEST_URL="https:/drive.google.com/file/d/1DRZ2fAKR0zzKbA66QspY3Hf0dgmZeYkC/view%3Fusp=drivesdk"

echo "🧪 Testing Resume Download API"
echo "=============================="
echo ""

# Try to login
echo "1. Attempting to login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE" | head -5
  echo ""
  echo "💡 You may need to create a test user first"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Test the download endpoint
echo "2. Testing download endpoint..."
ENCODED_URL=$(echo "$TEST_URL" | sed 's/:/%3A/g' | sed 's/\//%2F/g' | sed 's/?/%3F/g' | sed 's/&/%26/g' | sed 's/=/%3D/g')

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/files/download/resume/$ENCODED_URL")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Download successful!"
  echo "Response size: $(echo "$BODY" | wc -c) bytes"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ File not found"
  echo "Response: $BODY"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Unauthorized"
  echo "Response: $BODY"
else
  echo "Response: $BODY"
fi
