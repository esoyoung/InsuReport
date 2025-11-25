#!/bin/bash

# Multi-Model A/B Test Script
# Usage: ./test-models.sh <WORKER_URL> <PDF_KEY>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WORKER_URL="${1:-https://insu-report-ai-validator.YOUR_SUBDOMAIN.workers.dev}"
PDF_KEY="${2:-pdfs/test-document.pdf}"
PARSED_DATA='{"계약리스트":[],"진단현황":[]}'

echo -e "${GREEN}🧪 Multi-Model A/B Test${NC}"
echo "Worker URL: $WORKER_URL"
echo "PDF Key: $PDF_KEY"
echo ""

# Create results directory
mkdir -p test-results
cd test-results

# Test 1: Gemini
echo -e "${YELLOW}1️⃣ Testing Gemini 2.0 Flash...${NC}"
START_TIME=$(date +%s)
curl -s -X POST "$WORKER_URL/api/validate-contracts-r2" \
  -H "Content-Type: application/json" \
  -d "{\"fileKey\":\"$PDF_KEY\",\"parsedData\":$PARSED_DATA,\"model\":\"gemini\"}" \
  > gemini-result.json
END_TIME=$(date +%s)
GEMINI_TIME=$((END_TIME - START_TIME))
echo -e "${GREEN}✅ Completed in ${GEMINI_TIME}s${NC}"
echo ""

# Test 2: GPT-4o (if API key is set)
echo -e "${YELLOW}2️⃣ Testing GPT-4o...${NC}"
START_TIME=$(date +%s)
curl -s -X POST "$WORKER_URL/api/validate-contracts-r2" \
  -H "Content-Type: application/json" \
  -d "{\"fileKey\":\"$PDF_KEY\",\"parsedData\":$PARSED_DATA,\"model\":\"gpt-4o\"}" \
  > gpt4o-result.json 2>&1
END_TIME=$(date +%s)
GPT4O_TIME=$((END_TIME - START_TIME))

if grep -q "error" gpt4o-result.json; then
  echo -e "${RED}⚠️ GPT-4o failed (API key not set?)${NC}"
  echo -e "${YELLOW}To enable: npx wrangler secret put OPENAI_API_KEY${NC}"
else
  echo -e "${GREEN}✅ Completed in ${GPT4O_TIME}s${NC}"
fi
echo ""

# Test 3: Claude (if API key is set)
echo -e "${YELLOW}3️⃣ Testing Claude 3.5 Sonnet...${NC}"
START_TIME=$(date +%s)
curl -s -X POST "$WORKER_URL/api/validate-contracts-r2" \
  -H "Content-Type: application/json" \
  -d "{\"fileKey\":\"$PDF_KEY\",\"parsedData\":$PARSED_DATA,\"model\":\"claude\"}" \
  > claude-result.json 2>&1
END_TIME=$(date +%s)
CLAUDE_TIME=$((END_TIME - START_TIME))

if grep -q "error" claude-result.json; then
  echo -e "${RED}⚠️ Claude failed (API key not set?)${NC}"
  echo -e "${YELLOW}To enable: npx wrangler secret put ANTHROPIC_API_KEY${NC}"
else
  echo -e "${GREEN}✅ Completed in ${CLAUDE_TIME}s${NC}"
fi
echo ""

# Test 4: Auto (Ensemble)
echo -e "${YELLOW}4️⃣ Testing Auto (Ensemble)...${NC}"
START_TIME=$(date +%s)
curl -s -X POST "$WORKER_URL/api/validate-contracts-r2" \
  -H "Content-Type: application/json" \
  -d "{\"fileKey\":\"$PDF_KEY\",\"parsedData\":$PARSED_DATA,\"model\":\"auto\"}" \
  > auto-result.json
END_TIME=$(date +%s)
AUTO_TIME=$((END_TIME - START_TIME))
echo -e "${GREEN}✅ Completed in ${AUTO_TIME}s${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}📊 Test Results Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "Gemini:  ${GEMINI_TIME}s"
echo -e "GPT-4o:  ${GPT4O_TIME}s"
echo -e "Claude:  ${CLAUDE_TIME}s"
echo -e "Auto:    ${AUTO_TIME}s"
echo ""

echo -e "${GREEN}Results saved in: test-results/${NC}"
echo ""

# Quick comparison
echo -e "${YELLOW}🔍 Quick Comparison:${NC}"
echo ""

echo "Gemini 계약 수:"
jq '.계약리스트 | length' gemini-result.json 2>/dev/null || echo "N/A"

if ! grep -q "error" gpt4o-result.json 2>/dev/null; then
  echo "GPT-4o 계약 수:"
  jq '.계약리스트 | length' gpt4o-result.json 2>/dev/null || echo "N/A"
fi

if ! grep -q "error" claude-result.json 2>/dev/null; then
  echo "Claude 계약 수:"
  jq '.계약리스트 | length' claude-result.json 2>/dev/null || echo "N/A"
fi

echo "Auto 계약 수:"
jq '.계약리스트 | length' auto-result.json 2>/dev/null || echo "N/A"
echo ""

echo "Auto 사용 모델:"
jq '._metadata.aiModel' auto-result.json 2>/dev/null || echo "N/A"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}💡 Tip: Use 'jq' to analyze JSON results in detail${NC}"
echo -e "${YELLOW}Example: jq '.계약리스트' gemini-result.json${NC}"
echo -e "${GREEN}========================================${NC}"
