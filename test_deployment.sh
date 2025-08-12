#!/usr/bin/env bash
# Test script to verify Render deployment

echo "🔍 Testing Digital Estate Deployment on Render..."
echo ""

# Test backend health
echo "Testing Backend Health Check..."
BACKEND_URL="$1"
if [ -z "$BACKEND_URL" ]; then
    echo "Usage: ./test_deployment.sh <backend-url>"
    echo "Example: ./test_deployment.sh https://digital-estate-backend-abcd.onrender.com"
    exit 1
fi

echo "Backend URL: $BACKEND_URL"
curl -s "$BACKEND_URL" | head -5

echo ""
echo "Testing API Endpoints..."
curl -s "$BACKEND_URL/api/properties" | head -10

echo ""
echo "✅ If you see JSON responses above, your backend is working!"
echo "🌐 Now test your frontend URL in the browser."
