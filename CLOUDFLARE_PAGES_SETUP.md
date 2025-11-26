# Cloudflare Pages 프로젝트 생성 가이드

## 🎯 목표
**InsuReport** 프론트엔드를 Cloudflare Pages에 배포

---

## 📋 새 프로젝트 생성 단계

### 1. Workers & Pages 접속
- URL: https://dash.cloudflare.com/
- 메뉴: Workers & Pages

### 2. Create application
- 버튼: "Create application" 클릭
- 선택: **Pages** (Workers 아님!)
- 방법: **Connect to Git**

### 3. Git Repository 선택
```plaintext
Provider: GitHub
Repository: esoyoung/InsuReport
```

### 4. Build Configuration
```plaintext
Project name: insu-report-frontend (또는 insu-report-app)

Production branch: main

Framework preset: Vite (또는 None)

Build command: npm run build

Build output directory: dist

Root directory: / (비워두기)

Deploy command: (비워두기)
```

### 5. Environment Variables (나중에 설정 가능)
```plaintext
Skip for now (배포 후 Settings에서 설정)
```

### 6. Save and Deploy
- 버튼: "Save and Deploy" 클릭
- 대기: 2-3분 (빌드 완료까지)

---

## ✅ 배포 완료 확인

### Production URL
```plaintext
https://insu-report-frontend.pages.dev
(또는 설정한 프로젝트 이름)
```

### 브라우저 테스트
1. Production URL 접속
2. React 앱 로딩 확인
3. UI 정상 표시 확인

---

## 🔧 배포 후 필수 설정

### 1. 환경 변수 설정
```plaintext
Settings → Environment variables → Add variable

변수 1:
Name: GEMINI_API_KEY
Type: Secret (암호화)
Value: [Gemini API Key]
Environment: Production & Preview

변수 2:
Name: VITE_USE_AI_VALIDATION
Type: Text
Value: true
Environment: Production & Preview
```

**Gemini API Key 발급**: https://aistudio.google.com/app/apikey

### 2. R2 바인딩 설정
```plaintext
Settings → Functions → R2 bucket bindings → Add binding

Variable name: PDF_BUCKET
R2 bucket: insurance-pdfs
```

### 3. R2 버킷 생성 (아직 안 한 경우)
```bash
npx wrangler r2 bucket create insurance-pdfs
```

또는 Dashboard:
```plaintext
R2 메뉴 → Create bucket → insurance-pdfs
```

### 4. 재배포 (환경 변수 적용)
```plaintext
Deployments → Retry deployment
```

---

## 🧪 통합 테스트

### 1. Frontend 접속
```plaintext
https://insu-report-frontend.pages.dev
```

### 2. PDF 업로드 테스트
- 보험 리포트 PDF 업로드
- 규칙 기반 파싱 확인
- 계약 리스트 추출 확인

### 3. AI 검증 테스트 (환경 변수 설정 후)
- AI 모델 호출 (Gemini/Auto)
- 검증 결과 확인
- 수정사항 표시 확인

### 4. R2 업로드 테스트 (대용량 파일)
- >2.8MB PDF 업로드
- R2 저장 확인
- AI 검증 (R2 기반)

---

## 📊 최종 아키텍처

```plaintext
User (Browser)
    ↓
🌐 Cloudflare Pages (Frontend)
   https://insu-report-frontend.pages.dev
    ↓
⚙️ Cloudflare Pages Functions (Backend API)
   - /api/upload-pdf
   - /api/validate-contracts
   - /api/validate-contracts-r2
    ↓
🤖 Multi-Model AI
   - Gemini 2.0 Flash
   - GPT-4o (optional)
   - Claude 3.5 (optional)
   - Ensemble (auto)
    ↓
📦 Cloudflare R2 Storage
   - insurance-pdfs bucket
```

---

## 🎯 체크리스트

### 배포 전
- [ ] GitHub Repository: esoyoung/InsuReport
- [ ] main 브랜치 확인
- [ ] 최신 커밋 push 완료

### 배포 중
- [ ] Pages 프로젝트 생성
- [ ] Git 연동
- [ ] Build settings 설정
- [ ] 빌드 성공 확인

### 배포 후
- [ ] Production URL 접속 확인
- [ ] GEMINI_API_KEY 설정
- [ ] VITE_USE_AI_VALIDATION 설정
- [ ] R2 바인딩 (PDF_BUCKET → insurance-pdfs)
- [ ] R2 버킷 생성
- [ ] 재배포 (환경 변수 적용)
- [ ] PDF 업로드 테스트
- [ ] AI 검증 테스트
- [ ] R2 업로드 테스트

---

## 🔗 참고 링크

- Cloudflare Dashboard: https://dash.cloudflare.com/
- GitHub Repository: https://github.com/esoyoung/InsuReport
- Gemini API Key: https://aistudio.google.com/app/apikey
- OpenAI API Key: https://platform.openai.com/api-keys
- Anthropic API Key: https://console.anthropic.com/

---

## 💡 트러블슈팅

### 배포 실패
- Build log 확인
- npm install 에러 → package.json 확인
- Build 에러 → 로컬 테스트 (npm run build)

### URL 접속 안 됨
- Production branch 설정 확인 (main)
- Deployments 탭에서 배포 상태 확인
- DNS 전파 대기 (최대 5분)

### AI 기능 작동 안 함
- GEMINI_API_KEY 설정 확인
- Environment variables → Production 체크
- 재배포 후 테스트

### R2 업로드 실패
- PDF_BUCKET 바인딩 확인
- insurance-pdfs 버킷 존재 확인
- Functions 로그 확인

---

**생성일**: 2025-11-26
**최종 커밋**: a4d9ba2 (Cloudflare-only architecture)
