# Gemini 2.5 Flash AI 검증 시스템 설정 가이드 (백엔드 프록시)

## 📋 개요

이 프로젝트는 **Gemini 2.5 Flash**를 사용하여 KB 보험 보장분석 PDF의 파싱 결과를 자동으로 검증하고 수정합니다.

### 🔒 보안 아키텍처
- **백엔드 프록시**: API 키는 Node.js 서버에만 저장 (클라이언트 노출 방지)
- **VITE_ 제거**: 클라이언트 환경 변수에 API 키 없음

### 작동 방식
1. **규칙 기반 파싱**: `pdfParser.js`가 PDF를 텍스트로 추출하고 구조화
2. **백엔드 전송**: 프론트엔드가 PDF와 파싱 데이터를 백엔드 API로 전송
3. **AI 검증**: 백엔드가 Gemini API를 호출하여 검증
4. **결과 반환**: 검증된 데이터를 프론트엔드로 반환

---

## 🔑 API 키 발급 (유료 결제 권장)

### 1. Google AI Studio 접속
- URL: https://aistudio.google.com/app/apikey
- Google 계정으로 로그인

### 2. API 키 생성
1. "Create API Key" 버튼 클릭
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. API 키 복사 (예: `AIzaSyA...`)

### 3. 유료 결제 설정 (중단 없는 개발을 위해 필수)
1. Google Cloud Console 접속: https://console.cloud.google.com/
2. 프로젝트 선택
3. "결제" 메뉴로 이동
4. 결제 계정 연결 및 신용카드 등록

**💡 무료 티어:**
- 일일 1,500 요청 (충분히 테스트 가능)
- 분당 15 요청 제한

**💰 유료 요금 (Gemini 2.0 Flash):**
- Input: $0.075 / 1M 토큰
- Output: $0.30 / 1M 토큰
- 예상 비용: 1000건 처리 시 약 $0.30

---

## ⚙️ 프로젝트 설정

### 1. 환경 변수 파일 생성

프로젝트 루트에 `.env` 파일 생성:

\`\`\`bash
# .env
# 백엔드 환경 변수 (server.js)
GEMINI_API_KEY=AIzaSy...your-actual-key-here
PORT=3001

# 프론트엔드 환경 변수 (Vite)
VITE_USE_AI_VALIDATION=true
VITE_API_URL=http://localhost:3001
\`\`\`

**🔒 보안 강화:**
- `GEMINI_API_KEY`는 `VITE_` 접두사 없음 → 클라이언트에 노출되지 않음
- 백엔드 서버만 API 키에 접근 가능
- `.env`는 `.gitignore`에 포함되어 Git에 커밋되지 않음

### 2. 패키지 설치

\`\`\`bash
npm install
\`\`\`

필요한 패키지:
- `@google/generative-ai`: Gemini AI SDK
- `express`: 백엔드 서버
- `cors`: CORS 처리
- `multer`: 파일 업로드
- `dotenv`: 환경 변수 로드
- `concurrently`: 동시 서버 실행

### 3. 개발 서버 실행

**방법 1: 프론트엔드 + 백엔드 동시 실행 (권장)**
\`\`\`bash
npm run dev:all
\`\`\`

**방법 2: 별도 터미널에서 실행**
\`\`\`bash
# 터미널 1: 백엔드
npm run dev:server

# 터미널 2: 프론트엔드
npm run dev
\`\`\`

백엔드는 `http://localhost:3001`에서 실행됩니다.

---

## 🧪 테스트

### AI 검증 활성화 상태 확인

1. PDF 파일 업로드
2. 브라우저 콘솔 확인:
   ```
   📄 1단계: 규칙 기반 PDF 파싱 시작...
   ✅ 규칙 기반 파싱 완료
   🤖 2단계: AI 검증 시작...
   🤖 Gemini 2.5 Flash로 계약 리스트 검증 시작...
   ✅ Gemini 검증 완료
   ✅ AI 검증 완료
   📝 AI 수정 사항: ['2번 계약: 보험사 추가', ...]
   ```

3. 화면 상단에 "AI 검증 완료: N건 수정" 메시지 확인

### AI 검증 비활성화 (규칙 기반만 사용)

`.env.local` 수정:
\`\`\`bash
VITE_USE_AI_VALIDATION=false
\`\`\`

또는 API 키를 제거하면 자동으로 비활성화됩니다.

---

## 📊 AI 검증 로직

### 검증 항목

1. **보험사명 정확성**
   - 원본 PDF에서 정확한 보험사명 추출
   - "(무)" 접두사는 상품명으로 분류
   - "—" 기호 무시

2. **상품명 정확성**
   - 보험사명과 중복 제거
   - 전체 상품명 추출

3. **납입 상태 추론**
   - "납입완료", "완납" 표시 확인
   - 납입기간 만료 여부 확인
   - "진행중" / "완료" 분류

4. **월보험료 검증**
   - 원본 PDF 값과 비교
   - 납입 완료 시 0으로 수정

5. **기타 필드**
   - 계약일, 납입주기, 납입기간, 만기, 금리

### 출력 형식

\`\`\`json
{
  "계약리스트": [...],
  "수정사항": [
    "2번 계약: 보험사 '메리츠화재' 추가",
    "8번 계약: 납입상태를 '완료'로 변경"
  ],
  "총보험료": 456171,
  "활성월보험료": 319821
}
\`\`\`

---

## 🔧 커스터마이징

### 프롬프트 수정

`src/utils/aiValidator.js`의 `prompt` 변수를 수정하여 검증 규칙을 변경할 수 있습니다.

### 모델 변경

다른 Gemini 모델 사용:
\`\`\`javascript
const model = ai.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',  // 또는 'gemini-1.5-pro'
  // ...
});
\`\`\`

사용 가능한 모델:
- `gemini-2.0-flash-exp`: 최신, 빠름, 저렴 (권장)
- `gemini-1.5-flash`: 안정적
- `gemini-1.5-pro`: 높은 정확도 (더 비쌈)

---

## 🐛 문제 해결

### API 키 오류
\`\`\`
⚠️ VITE_GEMINI_API_KEY가 설정되지 않았습니다.
\`\`\`
- `.env.local` 파일 생성 확인
- API 키 형식 확인 (`AIzaSy...` 로 시작)
- 개발 서버 재시작

### 할당량 초과
\`\`\`
Error: 429 Resource has been exhausted
\`\`\`
- 무료 티어 한도 초과 (일 1,500건)
- 유료 결제 활성화 또는 다음 날 재시도

### 검증 실패
\`\`\`
⚠️ AI 검증 실패, 규칙 기반 결과 사용
\`\`\`
- 네트워크 연결 확인
- API 키 유효성 확인
- 브라우저 콘솔에서 상세 오류 확인

---

## 📈 비용 예측

### 예상 토큰 사용량 (계약 8건 기준)
- Input: ~3,000 토큰 (PDF 페이지 + 프롬프트)
- Output: ~1,000 토큰 (검증 결과)

### 월간 비용 (1,000건 처리)
- Input: 3M 토큰 × $0.075 = **$0.225**
- Output: 1M 토큰 × $0.30 = **$0.30**
- **총 약 $0.525/월**

무료 티어로 하루 1,500건까지 무료 처리 가능.

---

## 🚀 배포 시 주의사항

### Vercel 배포 (권장)

**1. 프론트엔드 배포**
- Vercel에 프로젝트 연결
- 환경 변수 설정:
  - `VITE_USE_AI_VALIDATION=true`
  - `VITE_API_URL=https://your-backend-url.com`

**2. 백엔드 배포 (별도 프로젝트)**
- `server.js`만 별도 저장소에 배포 (Vercel Serverless 또는 Railway/Render)
- 환경 변수 설정:
  - `GEMINI_API_KEY=your-key`
  - `PORT=3001`

**3. CORS 설정**
- `server.js`에서 프론트엔드 도메인 허용:
  \`\`\`javascript
  app.use(cors({
    origin: 'https://your-frontend.vercel.app'
  }));
  \`\`\`

### API 키 보안 (✅ 해결됨)
- ✅ **백엔드 프록시 사용**: API 키가 서버에만 저장됨
- ✅ **클라이언트 노출 방지**: `VITE_` 접두사 제거로 브라우저에 키 없음
- ✅ **Git 보안**: `.env` 파일은 `.gitignore`에 포함

---

## 📚 참고 자료

- Gemini API 문서: https://ai.google.dev/docs
- Google AI Studio: https://aistudio.google.com/
- Gemini 요금: https://ai.google.dev/pricing
- SDK 문서: https://github.com/google/generative-ai-js

---

## 🆘 지원

문제가 있으면 아래 순서로 확인하세요:
1. 브라우저 콘솔 로그 확인
2. `.env.local` 파일 설정 확인
3. Google Cloud Console에서 API 활성화 상태 확인
4. 결제 정보 등록 확인 (유료 사용 시)
