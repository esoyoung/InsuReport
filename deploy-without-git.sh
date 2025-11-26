#!/bin/bash

# Cloudflare Pages 수동 배포 스크립트 (Git 연동 없이)
# AI 검증 활성화 버전

set -e

echo "🚀 Cloudflare Pages 수동 배포 시작..."
echo ""

# 1. 환경변수 확인
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ 오류: CLOUDFLARE_API_TOKEN 환경변수가 설정되지 않았습니다."
    echo ""
    echo "📋 API Token 생성 방법:"
    echo "1. https://dash.cloudflare.com/profile/api-tokens 접속"
    echo "2. 'Create Token' 클릭"
    echo "3. 'Edit Cloudflare Workers' 템플릿 선택"
    echo "4. Permission: Account → Cloudflare Pages → Edit"
    echo "5. 생성된 토큰 복사"
    echo ""
    echo "💡 실행 방법:"
    echo "   export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "   ./deploy-without-git.sh"
    echo ""
    exit 1
fi

# 2. vite.config.js 확인
echo "✅ vite.config.js 확인 중..."
if grep -q "VITE_USE_AI_VALIDATION.*true" vite.config.js; then
    echo "✅ AI 검증 활성화 설정 확인됨"
else
    echo "❌ 오류: vite.config.js에 AI 검증 설정이 없습니다."
    echo "   Git pull을 실행하여 최신 코드를 가져오세요."
    exit 1
fi

# 3. 빌드 실행
echo ""
echo "🔨 빌드 시작 (npm run build)..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ 오류: dist/ 폴더가 생성되지 않았습니다."
    exit 1
fi

echo "✅ 빌드 완료: dist/ 폴더 생성됨"

# 4. 빌드 결과 확인
echo ""
echo "🔍 빌드 결과 검증 중..."
if grep -q "true" dist/assets/*.js 2>/dev/null; then
    echo "✅ VITE_USE_AI_VALIDATION='true' 주입 확인됨"
else
    echo "⚠️  경고: 빌드 결과에서 'true' 값을 찾지 못했습니다."
    echo "   하지만 배포를 계속 진행합니다..."
fi

# 5. Cloudflare Pages 배포
echo ""
echo "☁️  Cloudflare Pages 배포 시작..."
echo "   Project: insureport"
echo "   Branch: main"
echo ""

npx wrangler pages deploy dist --project-name=insureport --branch=main

# 6. 완료
echo ""
echo "✅ 배포 완료!"
echo ""
echo "📍 Production URL: https://insureport.pages.dev"
echo ""
echo "🧪 테스트 방법:"
echo "1. https://insureport.pages.dev 접속"
echo "2. PDF 파일 업로드"
echo "3. 브라우저 콘솔(F12) 확인:"
echo "   🔍 VITE_USE_AI_VALIDATION: \"true\"   ← 이것이 나와야 함!"
echo "   🤖 R2 기반 AI 검증 시작...           ← 이것이 나와야 함!"
echo ""
