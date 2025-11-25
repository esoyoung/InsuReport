#!/bin/bash

# Cloudflare Workers POC - Local Test Script

echo "🧪 Testing Cloudflare Workers POC locally..."
echo ""

# Test 1: Health Check
echo "1️⃣ Health Check"
echo "-----------------------------------"
curl -s http://localhost:8787/health | jq .
echo ""
echo ""

# Test 2: AI Validation with mock data
echo "2️⃣ AI Validation (Mock Data)"
echo "-----------------------------------"
cat > /tmp/test-payload.json << 'EOF'
{
  "fileKey": "pdfs/test-mock.pdf",
  "parsedData": {
    "계약리스트": [
      {
        "번호": 1,
        "보험사": "메리츠화재",
        "상품명": "(무) Test Insurance",
        "계약일": "2024-01-01",
        "월보험료": 50000
      }
    ],
    "진단현황": [
      {
        "담보명": "일반사망",
        "권장금액": "1억원",
        "가입금액": "5000만원"
      }
    ]
  }
}
EOF

echo "Request payload:"
cat /tmp/test-payload.json | jq .
echo ""
echo "Sending request to /api/validate-contracts-r2..."
echo "(Note: This will fail if R2 PDF doesn't exist, but we can see the structure)"
echo ""

curl -s -X POST http://localhost:8787/api/validate-contracts-r2 \
  -H "Content-Type: application/json" \
  -d @/tmp/test-payload.json | jq .

echo ""
echo ""
echo "✅ Test completed!"
echo ""
echo "📝 Notes:"
echo "  - If you see '404 PDF not found', that's expected (we don't have the PDF in R2 yet)"
echo "  - The structure shows how the API works"
echo "  - Next step: Deploy to Cloudflare and test with real PDF"
