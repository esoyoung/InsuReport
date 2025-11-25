# GitHub 커밋 요약 - Gemini AI 검증 시스템

## 📋 변경 사항 요약

이번 커밋에서는 **Gemini 2.5 Flash를 사용한 AI 검증 시스템**을 백엔드 프록시 방식으로 구현했습니다.

---

## 📂 파일 변경 내역

### ✅ 신규 파일 (3개)

1. **`server.js`** - Express 백엔드 서버
   - Gemini API 프록시 역할
   - `/api/validate-contracts` 엔드포인트
   - PDF 파일 + 파싱 데이터 수신 → Gemini 검증 → 결과 반환

2. **`src/utils/aiValidator.js`** - AI 검증 유틸리티
   - 백엔드 API 호출 로직
   - PDF를 FormData로 전송
   - 검증 결과 처리

3. **`GEMINI_SETUP.md`** - 설정 가이드
   - API 키 발급 방법
   - 백엔드 프록시 아키텍처 설명
   - 개발/배포 가이드

### 📝 수정 파일 (9개)

1. **`.env.example`**
   - `VITE_GEMINI_API_KEY` 제거 (보안)
   - `GEMINI_API_KEY` 추가 (백엔드용, VITE_ 없음)
   - `VITE_API_URL` 추가 (프론트엔드용)

2. **`package.json`**
   - 의존성 추가: `express`, `cors`, `dotenv`, `multer`, `@google/generative-ai`
   - 스크립트 추가:
     - `dev:server`: 백엔드만 실행
     - `dev:all`: 프론트+백엔드 동시 실행
     - `start`: 프로덕션 백엔드

3. **`src/components/FileUploader.jsx`**
   - AI 검증 로직 통합
   - 2단계 파싱 (규칙 기반 → AI 검증)
   - 검증 상태 UI 추가

4. **`src/components/ReportViewer.jsx`**
   - 헤더 레이아웃 개선
   - 고객 정보 표시 방식 변경

5. **`src/components/tables/ContractListTable.jsx`**
   - 제목 스타일 통일
   - 설명 문구 폰트 축소
   - 월보험료 합계 강조 (볼드, 폰트 증가)

6. **`src/components/tables/DiagnosisTable.jsx`**
   - 요약 카드 3개로 축소 (추가필요보장금액 제거)
   - 카드 레이아웃 개선 (패딩 최소화, 폰트 크기 조정)
   - 부족금액 계산 로직 수정

7. **`src/index.css`**
   - 프린트용 스타일 클래스 추가
   - `premium-total-value`, `diagnosis-card-label`, `diagnosis-card-value`

8. **`src/utils/pdfParser.js`**
   - 보험사 목록 확장 (`메리츠`, `메리츠생명`)
   - `extractCompanyAndProduct` 알고리즘 개선
     - 전체 토큰 범위에서 보험사 탐색
     - `—` (em dash) 토큰 전처리
     - 보험사 위치 제약 제거

9. **`package-lock.json`**
   - 자동 업데이트 (의존성 추가로 인함)

---

## 🔒 보안 개선

### 이전 (취약)
```bash
VITE_GEMINI_API_KEY=AIzaSy...  # 브라우저에 노출됨 ❌
```

### 현재 (안전)
```bash
# 백엔드 (.env)
GEMINI_API_KEY=AIzaSy...  # 서버에만 존재, VITE_ 제거 ✅

# 프론트엔드 (.env)
VITE_API_URL=http://localhost:3001  # 백엔드 주소만 노출
```

---

## 🏗️ 아키텍처

```
┌──────────────┐         ┌──────────────┐         ┌─────────────┐
│   브라우저    │  PDF   │   백엔드      │  PDF   │  Gemini API │
│ (React/Vite) │───────▶│  (Express)   │───────▶│   (Google)  │
│              │◀───────│  server.js   │◀───────│             │
└──────────────┘  결과   └──────────────┘  결과   └─────────────┘
  No API Key            Has API Key             Secure
```

---

## 🚀 실행 방법

### 개발 환경
```bash
# 1. 환경 변수 설정 (.env)
GEMINI_API_KEY=your-key-here
PORT=3001
VITE_USE_AI_VALIDATION=true
VITE_API_URL=http://localhost:3001

# 2. 의존성 설치
npm install

# 3. 동시 실행
npm run dev:all
```

### 프로덕션 배포
```bash
# 백엔드 환경 변수 (서버)
GEMINI_API_KEY=your-key-here
PORT=3001

# 프론트엔드 환경 변수 (Vercel)
VITE_USE_AI_VALIDATION=true
VITE_API_URL=https://your-backend.com
```

---

## 📊 주요 기능

### 1. AI 검증
- ✅ 보험사명 정확도 향상
- ✅ 상품명 정확도 향상
- ✅ 납입 상태 자동 추론 (`진행중` / `완료`)
- ✅ 월보험료 검증
- ✅ 수정 사항 로그 제공

### 2. 파싱 개선
- ✅ 전체 토큰 범위 보험사 탐색
- ✅ `—` (em dash) 전처리
- ✅ `(무)` 접두사 처리
- ✅ 보험사 목록 확장

### 3. UI 개선
- ✅ 제목/카드 레이아웃 통일
- ✅ 폰트 크기 최적화
- ✅ 프린트 스타일 보강

---

## ⚠️ 중요 사항

### 환경 변수 설정 필수
서버에 다음 환경 변수를 설정해야 합니다:
```bash
GEMINI_API_KEY=your-actual-key-here
```

### API 키 발급
1. https://aistudio.google.com/app/apikey 접속
2. API 키 생성
3. 서버 환경 변수에 설정
4. 유료 결제 권장 (일 1,500건 무료 티어 초과 시)

---

## 📝 커밋 메시지 제안

```
feat: implement Gemini AI validation with backend proxy

- Add Express backend server (server.js) for secure API key handling
- Remove VITE_ prefix from Gemini API key to prevent client exposure
- Implement AI validation endpoint (/api/validate-contracts)
- Update FileUploader with 2-stage parsing (rule-based + AI validation)
- Improve contract parsing algorithm (company detection, em dash handling)
- Enhance UI layouts (titles, cards, fonts)
- Add GEMINI_SETUP.md for configuration guide
- Update package.json with backend dependencies and scripts

Security: API key now stored only on server, not exposed to client
```

---

## 📦 변경 파일 최종 목록

**신규 (3):**
- `server.js`
- `src/utils/aiValidator.js`
- `GEMINI_SETUP.md`

**수정 (9):**
- `.env.example`
- `package.json`
- `package-lock.json`
- `src/components/FileUploader.jsx`
- `src/components/ReportViewer.jsx`
- `src/components/tables/ContractListTable.jsx`
- `src/components/tables/DiagnosisTable.jsx`
- `src/index.css`
- `src/utils/pdfParser.js`

**삭제 (0)**

---

## 🔗 관련 문서

- 설정 가이드: `GEMINI_SETUP.md`
- 환경 변수 예시: `.env.example`
