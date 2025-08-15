#!/bin/bash

# HackRX Submission Verification Script
echo "🔍 HackRX Submission Verification"
echo "=================================="

# Configuration
BASE_URL="https://d7bd59f04ef8.ngrok-free.app"  # Your deployed URL
HACKRX_ENDPOINT="/api/hackrx/run"
AUTH_TOKEN="Bearer f52031c67a78585014ed3ea516573de21ad4a25e79074c2be81d7632f31b24ce"

echo "📋 Testing HackRX endpoint: ${BASE_URL}${HACKRX_ENDPOINT}"
echo ""

# Test 1: Health Check
echo "1️⃣ Health Check..."
curl -s "${BASE_URL}/api/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test 2: HackRX Endpoint Compliance
echo "2️⃣ HackRX Compliance Test..."
curl -s "${BASE_URL}/api/test-hackrx" | jq '.' || echo "❌ Compliance test failed"
echo ""

# Test 3: Sample HackRX Request
echo "3️⃣ Sample HackRX Request..."
curl -X POST "${BASE_URL}${HACKRX_ENDPOINT}" \
  -H "Authorization: ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": "https://hackrx.blob.core.windows.net/assets/policy.pdf?sv=2023-01-03&st=2025-07-04T09%3A11%3A24Z&se=2027-07-05T09%3A11%3A00Z&sr=b&sp=r&sig=N4a9OU0w0QXO6AOIBiu4bpl7AXvEZogeT%2FjUHNO7HzQ%3D",
    "questions": [
      "What is the grace period for premium payment under the National Parivar Mediclaim Plus Policy?",
      "What is the waiting period for pre-existing diseases (PED) to be covered?"
    ]
  }' | jq '.'

echo ""
echo "✅ If all tests pass, your system is ready for submission!"
echo ""
echo "📋 Submission Checklist:"
echo "✓ API is live & accessible"
echo "✓ HTTPS enabled (for production)"
echo "✓ Handles POST requests"
echo "✓ Returns JSON response"
echo "✓ Response time < 30s"
echo "✓ Bearer token authentication working"
echo ""
echo "🚀 Submit this URL: ${BASE_URL}${HACKRX_ENDPOINT}"
