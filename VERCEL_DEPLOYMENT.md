# Vercel 배포 가이드

## 📋 개요

이 프로젝트는 **Vercel Serverless Functions**을 사용하여 Gemini AI 검증 기능을 제공합니다.

## 🚀 Vercel 배포 단계

### 1. GitHub 연동

Vercel 대시보드에서 GitHub 저장소를 연동합니다:

```
https://vercel.com/new
```

### 2. 환경 변수 설정

Vercel 프로젝트 설정에서 **Environment Variables**를 추가합니다:

| Key | Value | 설명 |
|-----|-------|------|
| `GEMINI_API_KEY` | `AIzaSy...` | Gemini API 키 ([발급 링크](https://aistudio.google.com/app/apikey)) |
| `VITE_USE_AI_VALIDATION` | `true` | AI 검증 활성화 |
| `VITE_API_URL` | *(빈 문자열)* | 프로덕션에서는 동일 도메인 사용 |

**중요:** `VITE_` 프리픽스는 **반드시 유지**해야 합니다. Vite는 이 프리픽스가 있는 환경변수만 클라이언트에 노출합니다.

### 3. Vercel 프로젝트 설정

#### Build & Development Settings

```
Build Command:     npm run build
Output Directory:  dist
Install Command:   npm install
Development:       npm run dev
```

#### Serverless Functions

- **Location**: `/api` 폴더
- **Runtime**: Node.js 20.x
- **Max Duration**: 60초 (Pro 플랜 필요)

### 4. 배포

```bash
# GitHub에 push하면 자동 배포
git push origin main
```

## 🔧 로컬 개발 환경

### 1. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# AI 검증 활성화
VITE_USE_AI_VALIDATION=true

# 로컬 API URL (빈 문자열 또는 생략)
VITE_API_URL=
```

### 2. 로컬 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

로컬에서는 Vite가 `/api/*` 요청을 자동으로 처리하지 않으므로, Vercel CLI를 사용하거나 프록시 설정이 필요합니다.

#### Option 1: Vercel CLI 사용 (권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 로컬 개발 서버 실행 (Serverless Functions 포함)
vercel dev
```

#### Option 2: Vite 프록시 설정

`vite.config.js`에 프록시 추가:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

그리고 별도 터미널에서 로컬 서버 실행:

```bash
node server.js
```

## 📦 Serverless Functions 구조

```
api/
├── parse.js              # 텍스트 기반 PDF 파싱 (기존)
└── validate-contracts.js # AI 계약 검증 (신규)

src/utils/
├── pdfParser.js          # 규칙 기반 PDF 파싱
├── pdfCompressor.js      # PDF 자동 압축 (신규)
└── aiValidator.js        # AI 검증 클라이언트
```

### `/api/validate-contracts`

**Method**: `POST`

**Request Body**:
```json
{
  "pdfBase64": "JVBERi0xLjQK...",
  "parsedData": {
    "계약리스트": [...]
  }
}
```

**Response**:
```json
{
  "계약리스트": [...],
  "수정사항": ["..."],
  "총보험료": 456171,
  "활성월보험료": 319821
}
```

## 🔐 보안

- ✅ **API 키는 서버에서만 사용**: `GEMINI_API_KEY`는 Serverless Function 내부에서만 접근 가능
- ✅ **클라이언트에 노출되지 않음**: `process.env.GEMINI_API_KEY`는 클라이언트 번들에 포함되지 않음
- ✅ **CORS 설정**: API 엔드포인트에 CORS 헤더 적용
- ✅ **환경 변수 분리**: `VITE_` 프리픽스로 클라이언트/서버 변수 명확히 구분

## 💰 비용

### Vercel

- **Hobby 플랜**: 무료
  - 빌드: 100시간/월
  - Serverless Functions: 100GB-Hours
  - **제한**: Function 실행 시간 10초

- **Pro 플랜**: $20/월
  - 빌드: 무제한
  - Serverless Functions: 1,000GB-Hours
  - **Function 실행 시간: 60초** (필수)

### Gemini API

- **무료**: 하루 1,500회 요청
- **유료**: 
  - Input: $0.075 / 1M 토큰
  - Output: $0.30 / 1M 토큰
  - **예상 비용**: 문서당 ~$0.0005 (1,000건 = $0.50)

## 🧪 테스트

### 로컬 테스트

```bash
# Vercel CLI로 로컬 실행
vercel dev

# 브라우저에서 PDF 업로드 테스트
# http://localhost:3000
```

### 프로덕션 테스트

```bash
# 배포 후 URL 확인
https://your-project.vercel.app

# PDF 업로드하고 콘솔 로그 확인:
# - "📦 0단계: PDF 크기가 큽니다. 압축 시도..." (3MB 이상일 경우)
# - "✅ 압축 완료: 5.2MB → 2.3MB (55.8% 감소)"
# - "📄 1단계: 규칙 기반 PDF 파싱 시작..."
# - "🤖 2단계: AI 검증 시작..."
# - "✅ AI 검증 완료"
# - "📝 AI 수정 사항: [...]"
```

### PDF 압축 기능 테스트

- **작은 PDF (< 3MB)**: 압축 없이 바로 처리
- **중간 PDF (3-5MB)**: 자동 압축 후 처리 (보통 50-60% 감소)
- **큰 PDF (> 5MB)**: 압축 시도, 실패 시 규칙 기반 파싱만 사용

## ❓ 트러블슈팅

### 1. "GEMINI_API_KEY가 설정되지 않았습니다"

➡️ Vercel 프로젝트 설정에서 환경 변수 `GEMINI_API_KEY` 추가 후 재배포

### 2. "Function execution timed out"

➡️ Vercel Pro 플랜으로 업그레이드 (60초 실행 시간 필요)

### 3. "AI 검증이 비활성화되어 있습니다"

➡️ Vercel 환경 변수에 `VITE_USE_AI_VALIDATION=true` 추가

### 4. "413 Content Too Large"

➡️ **자동 해결됨**: 3MB 이상 PDF는 자동으로 2.5MB로 압축됩니다
➡️ 압축 후에도 3.5MB 초과 시 규칙 기반 파싱만 사용

### 5. 로컬에서 `/api/validate-contracts` 404

➡️ `vercel dev` 사용 또는 `server.js` 실행

## 📚 관련 문서

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Gemini API](https://ai.google.dev/gemini-api/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
