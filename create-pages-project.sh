#!/bin/bash

# Cloudflare Pages 프로젝트 생성 스크립트

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN 환경변수가 설정되지 않았습니다"
    echo ""
    echo "사용 방법:"
    echo "  export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "  ./create-pages-project.sh"
    exit 1
fi

echo "🚀 Cloudflare Pages 프로젝트 생성 중..."
echo ""

# Pages 프로젝트 생성
npx wrangler pages project create insureport \
  --production-branch=main

echo ""
echo "✅ 프로젝트 생성 완료!"
echo ""
echo "다음 단계:"
echo "1. Dashboard에서 프로젝트 확인"
echo "2. Git repository 연결"
echo "3. Environment variables 설정"
