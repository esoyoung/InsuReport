# 🤖 AI API 설정 가이드

## 📋 개요

InsuReport는 **Anthropic Claude**와 **OpenAI GPT-4o**를 사용하여 KB 보장분석 PDF를 정확하게 검증합니다.

---

## 🎯 지원 AI 모델

### ✅ Claude Sonnet 4.5 (Primary)
- **모델명**: `claude-sonnet-4-5-20250929`
- **비용**: ~$100/1000 검증 (4페이지 PDF)
- **API Key**: `ANTHROPIC_API_KEY`
- **특징**:
  - PDF 직접 처리 ✓
  - 한국어 지원 우수 ✓
  - JSON 출력 안정적 ✓
  - 항목 누락 없음 ✓

### 🔄 GPT-4o (Alternative)
- **모델명**: `gpt-4o`
- **비용**: ~$10/1000 검증 (4페이지 PDF)
- **API Key**: `OPENAI_API_KEY`
- **특징**:
  - PDF 직접 처리 ✓
  - 한국어 지원 우수 ✓
  - 비용 효율적 ✓
  - 균형잡힌 정확도/비용 ✓

---

## 🔑 API Key 발급

### Anthropic Claude API Key

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. **API Keys** 메뉴 클릭
3. **Create Key** 클릭
4. 키 이름 입력 (예: "InsuReport Production")
5. API Key 복사 (한 번만 표시됨!)

**비용 정보**:
- Free tier: $5 크레딧 (약 50회 검증)
- Pay-as-you-go: 사용한 만큼만 과금
- 청구서: https://console.anthropic.com/settings/billing

### OpenAI GPT-4o API Key

1. [OpenAI Platform](https://platform.openai.com/api-keys) 접속
2. **Create new secret key** 클릭
3. 키 이름 입력 (예: "InsuReport")
4. API Key 복사

**비용 정보**:
- Free tier: 없음 (즉시 과금)
- Pay-as-you-go: 사용한 만큼만 과금
- 청구서: https://platform.openai.com/usage

---

## ⚙️ 환경 변수 설정

### Cloudflare Pages (Production)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 로그인
2. **Workers & Pages** → **insureport** 선택
3. **Settings** → **Environment variables**
4. 아래 변수 추가:

| Variable Name | Value | 설명 |
|--------------|-------|------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude API Key (필수) |
| `OPENAI_API_KEY` | `sk-proj-...` | GPT-4o API Key (선택) |
| `VITE_USE_AI_VALIDATION` | `true` | AI 검증 활성화 |

5. **Save** → **Redeploy** 클릭

### 로컬 개발 환경

1. `.env.example`을 `.env.local`로 복사:
```bash
cp .env.example .env.local
```

2. `.env.local` 파일 편집:
```bash
# Anthropic Claude API (필수)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# OpenAI GPT-4o API (선택)
OPENAI_API_KEY=sk-proj-your-actual-key-here

# AI 검증 활성화
VITE_USE_AI_VALIDATION=true
```

3. 개발 서버 재시작:
```bash
npm run dev
```

---

## 🔄 모델 전환 방법

`functions/api/validate-contracts.js` 파일에서 활성 모델 변경:

### Claude 사용 (기본값)
```javascript
// ✅ ACTIVE
console.log('🤖 Using Claude 3.5 Sonnet');
return await validateWithClaude(pdfBase64, parsedData, env);

// ❌ INACTIVE
// console.log('🤖 Using GPT-4o');
// return await validateWithGPT4o(pdfBase64, parsedData, env);
```

### GPT-4o로 전환
```javascript
// ❌ INACTIVE
// console.log('🤖 Using Claude 3.5 Sonnet');
// return await validateWithClaude(pdfBase64, parsedData, env);

// ✅ ACTIVE
console.log('🤖 Using GPT-4o');
return await validateWithGPT4o(pdfBase64, parsedData, env);
```

---

## 💰 비용 최적화 팁

### 1. 개발 중에는 AI 검증 비활성화
```bash
# .env.local
VITE_USE_AI_VALIDATION=false
```
→ 규칙 기반 파싱만 사용 (비용 $0)

### 2. 작은 PDF만 AI 검증
코드에서 자동 체크:
```javascript
// 2.8MB 이상은 자동으로 AI 검증 건너뜀
if (pdfFile.size > 2.8 * 1024 * 1024) {
  // 규칙 기반 파싱 사용
}
```

### 3. 배치 처리 고려
- 여러 PDF를 한 번에 검증하여 API 호출 최소화
- 캐싱 활용 (동일 PDF 재검증 방지)

---

## 🧪 테스트

### API Key 테스트
```bash
# Anthropic 테스트
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'

# OpenAI 테스트
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'
```

### 앱에서 테스트
1. 개발 서버 실행
2. KB 보장분석 PDF 업로드
3. 브라우저 콘솔에서 로그 확인:
   - `🤖 Cloudflare Pages Function으로 AI 검증 요청...`
   - `✅ AI 검증 완료`

---

## 🐛 트러블슈팅

### "ANTHROPIC_API_KEY not configured"
- Cloudflare Pages 환경변수 확인
- 로컬: `.env.local` 파일 확인
- API Key 형식: `sk-ant-...`

### "OpenAI API error: 401"
- API Key 유효성 확인
- OpenAI 계정 결제 정보 등록 확인
- API Key 형식: `sk-proj-...` (새 형식) 또는 `sk-...`

### "AI 검증 중 오류 발생"
- 네트워크 연결 확인
- API 사용량 한도 확인
- 브라우저 콘솔에서 상세 에러 메시지 확인

### PDF 크기 제한
- Cloudflare Pages Functions: 10MB 제한
- 코드에서 2.8MB 이상은 자동 건너뜀
- 큰 PDF는 규칙 기반 파싱 사용

---

## 📊 비용 예상

### 월 100회 검증 기준

| 모델 | 월 비용 | 검증당 비용 |
|-----|--------|-----------|
| Claude Sonnet 4.5 | ~$10 | ~$0.10 |
| GPT-4o | ~$1 | ~$0.01 |
| 규칙 기반 (AI 미사용) | $0 | $0 |

### 권장 사항
- **개발/테스트**: AI 비활성화 ($0)
- **프로덕션**: GPT-4o 사용 (비용 효율적)
- **높은 정확도 필요시**: Claude Sonnet 4.5

---

## 🔐 보안 주의사항

1. **API Key는 절대 Git에 커밋하지 마세요**
   - `.env.local`은 `.gitignore`에 포함됨
   - 환경변수로만 관리

2. **프론트엔드에 노출하지 마세요**
   - API Key는 서버사이드 (Cloudflare Pages Functions)에서만 사용
   - `VITE_` prefix가 없는 변수는 빌드에 포함되지 않음

3. **정기적으로 API Key 갱신**
   - 3-6개월마다 새 키 발급
   - 이전 키 삭제

4. **사용량 모니터링**
   - Anthropic Console에서 사용량 확인
   - OpenAI Platform에서 사용량 확인
   - 비정상적인 사용 패턴 감지 시 즉시 키 삭제

---

## 📞 문의

API 설정 관련 문제가 있으면:
1. 브라우저 콘솔 로그 확인
2. Cloudflare Pages Functions 로그 확인
3. API 제공사 문서 참고:
   - [Anthropic Docs](https://docs.anthropic.com/)
   - [OpenAI Docs](https://platform.openai.com/docs/)
