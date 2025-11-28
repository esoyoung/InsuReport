# 🤖 AI API 설정 가이드

## 📋 개요

InsuReport는 **Google Gemini**와 **Anthropic Claude**를 사용하여 KB 보장분석 PDF를 정확하게 검증합니다.

---

## 🎯 지원 AI 모델

### ✅ Google Gemini 2.0 Flash (Primary - 권장)
- **모델명**: `gemini-2.0-flash-exp`
- **비용**: **FREE** (속도 제한) 또는 ~$0.075 per 1M tokens
- **API Key**: `GEMINI_API_KEY`
- **특징**:
  - PDF 직접 처리 ✓
  - 한국어 지원 우수 ✓
  - Native JSON 출력 ✓
  - 비용 효율적 ✓
  - **추천 이유**: 무료 또는 저렴, 빠른 속도, 정확

### 🔄 Anthropic Claude Sonnet 4.5 (Alternative)
- **모델명**: `claude-sonnet-4-5-20250929`
- **비용**: ~$0.10/검증 (4페이지 PDF)
- **API Key**: `ANTHROPIC_API_KEY`
- **특징**:
  - PDF 직접 처리 ✓
  - 한국어 지원 우수 ✓
  - JSON 출력 안정적 ✓
  - 항목 누락 없음 ✓
  - **사용 시기**: 최대 정확도 필요 시, 중요한 검증

---

## 🔑 API Key 발급

### Google Gemini API Key (권장)

1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. **Get API Key** 또는 **Create API Key** 클릭
3. 프로젝트 선택 또는 새 프로젝트 생성
4. API Key 복사

**비용 정보**:
- **Free tier**: 무료 (속도 제한 있음)
  - 분당 15 requests
  - 일일 1,500 requests
  - 월 100만 tokens
- **Pay-as-you-go**: $0.075 per 1M input tokens
- **청구서**: [Google Cloud Console](https://console.cloud.google.com/)

**무료 플랜으로도 충분한 이유**:
- 월 1,500회 검증 가능 (일 50회)
- 대부분의 개인/소규모 팀에 충분

### Anthropic Claude API Key (대안)

1. [Anthropic Console](https://console.anthropic.com/) 접속
2. **API Keys** 메뉴 클릭
3. **Create Key** 클릭
4. 키 이름 입력 (예: "InsuReport Production")
5. API Key 복사 (한 번만 표시됨!)

**비용 정보**:
- Free tier: $5 크레딧 (약 50회 검증)
- Pay-as-you-go: 사용한 만큼만 과금
- 청구서: https://console.anthropic.com/settings/billing

---

## ⚙️ 환경 변수 설정

### Cloudflare Pages (Production)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 로그인
2. **Workers & Pages** → **insureport** 선택
3. **Settings** → **Environment variables**
4. 아래 변수 추가:

| Variable Name | Value | 설명 |
|--------------|-------|------|
| `GEMINI_API_KEY` | `AIzaSy...` | Gemini API Key (권장) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude API Key (선택) |
| `VITE_USE_AI_VALIDATION` | `true` | AI 검증 활성화 |

5. **Save** → **Redeploy** 클릭

### 로컬 개발 환경

1. `.env.example`을 `.env.local`로 복사:
```bash
cp .env.example .env.local
```

2. `.env.local` 파일 편집:
```bash
# Google Gemini API (권장)
GEMINI_API_KEY=AIzaSyYour-Actual-Key-Here

# Anthropic Claude API (선택)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# AI 검증 활성화
VITE_USE_AI_VALIDATION=true
```

3. 개발 서버 재시작:
```bash
npm run dev
```

---

## 🔄 모델 전환 방법

`functions/api/validate-contracts.js` 파일에서 간단히 주석 변경:

### Gemini 사용 (기본값 - 권장)
```javascript
// ✅ ACTIVE
console.log('🤖 Using Google Gemini 2.0 Flash');
return await validateWithGemini(pdfBase64, parsedData, env);

// ❌ INACTIVE
// console.log('🤖 Using Anthropic Claude Sonnet 4.5');
// return await validateWithClaude(pdfBase64, parsedData, env);
```

### Claude로 전환 (최대 정확도 필요 시)
```javascript
// ❌ INACTIVE
// console.log('🤖 Using Google Gemini 2.0 Flash');
// return await validateWithGemini(pdfBase64, parsedData, env);

// ✅ ACTIVE
console.log('🤖 Using Anthropic Claude Sonnet 4.5');
return await validateWithClaude(pdfBase64, parsedData, env);
```

---

## 💰 비용 비교 및 최적화

### 월 100회 검증 기준

| 모델 | 월 비용 | 검증당 비용 | 특징 |
|-----|--------|-----------|------|
| **Gemini (무료)** | **$0** | **$0** | ⭐ 권장! 무료, 빠름 |
| Gemini (유료) | ~$0.75 | ~$0.0075 | 매우 저렴 |
| Claude Sonnet | ~$10 | ~$0.10 | 최고 정확도 |
| 규칙 기반 (AI 미사용) | $0 | $0 | 정확도 낮음 |

### 권장 사용 전략

#### 1. **기본 설정: Gemini 무료 플랜** ⭐
```bash
# 대부분의 경우 충분
GEMINI_API_KEY=your_key
VITE_USE_AI_VALIDATION=true
```
- **장점**: 무료, 빠름, 정확
- **제한**: 분당 15회, 일 1,500회
- **적합**: 개인, 소규모 팀

#### 2. **높은 정확도 필요: Claude**
```javascript
// validate-contracts.js에서 Claude로 전환
return await validateWithClaude(pdfBase64, parsedData, env);
```
- **장점**: 최고 정확도, 항목 누락 없음
- **비용**: ~$0.10/검증
- **적합**: 중요한 계약, 정확도가 핵심인 경우

#### 3. **개발 중: AI 비활성화**
```bash
# .env.local
VITE_USE_AI_VALIDATION=false
```
- **비용**: $0
- **적합**: 로컬 테스트, 디버깅

---

## 🧪 테스트

### Gemini API Key 테스트
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

### Claude API Key 테스트
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'
```

### 앱에서 테스트
1. 개발 서버 실행
2. KB 보장분석 PDF 업로드
3. 브라우저 콘솔에서 로그 확인:
   - `🤖 Using Google Gemini 2.0 Flash` 또는
   - `🤖 Using Anthropic Claude Sonnet 4.5`
   - `✅ AI 검증 완료`

---

## 🐛 트러블슈팅

### "GEMINI_API_KEY not configured"
- Cloudflare Pages 환경변수 확인
- 로컬: `.env.local` 파일 확인
- API Key 형식: `AIzaSy...`

### "Gemini API error: 429 (Too Many Requests)"
- 무료 플랜 속도 제한 초과
- 옵션 1: 잠시 대기 (1분 후 재시도)
- 옵션 2: Claude로 전환
- 옵션 3: 유료 플랜 전환

### "ANTHROPIC_API_KEY not configured"
- Claude 사용 시에만 필요
- Gemini 사용 중이면 무시 가능

### PDF 크기 제한
- Cloudflare Pages Functions: 10MB 제한
- 코드에서 2.8MB 이상은 자동 건너뜀
- 큰 PDF는 규칙 기반 파싱 사용

---

## 📊 실제 사용 시나리오

### 시나리오 1: 개인 보험설계사 (일 5-10회)
- **추천**: Gemini 무료 플랜
- **비용**: $0/월
- **설정**: `GEMINI_API_KEY` + `VITE_USE_AI_VALIDATION=true`

### 시나리오 2: 소규모 팀 (일 30-50회)
- **추천**: Gemini 무료 플랜
- **비용**: $0/월
- **제한**: 분당 15회 속도 제한 (충분)

### 시나리오 3: 대량 처리 (일 100회+)
- **추천**: Gemini 유료 플랜
- **비용**: ~$2/월
- **장점**: 속도 제한 없음, 여전히 매우 저렴

### 시나리오 4: 중요 계약 검증
- **추천**: Claude Sonnet
- **비용**: ~$10/월 (100회)
- **장점**: 최고 정확도, 항목 누락 없음

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
   - Gemini: [Google AI Studio](https://aistudio.google.com/)
   - Claude: [Anthropic Console](https://console.anthropic.com/)
   - 비정상적인 사용 패턴 감지 시 즉시 키 삭제

---

## 📞 문의

API 설정 관련 문제가 있으면:
1. 브라우저 콘솔 로그 확인
2. Cloudflare Pages Functions 로그 확인
3. API 제공사 문서 참고:
   - [Google Gemini Docs](https://ai.google.dev/docs)
   - [Anthropic Docs](https://docs.anthropic.com/)

---

## 🎯 요약

- **권장 설정**: Gemini 무료 플랜 (대부분의 경우 충분)
- **고정확도 필요**: Claude로 간단히 전환
- **비용**: Gemini 무료 > Gemini 유료 ($0.0075/회) > Claude ($0.10/회)
- **전환**: `validate-contracts.js`에서 주석 3줄만 변경
