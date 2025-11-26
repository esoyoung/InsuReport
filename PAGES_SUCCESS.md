# 🎉 Cloudflare Pages 배포 성공!

## ✅ 배포된 정보

**프로젝트 이름**: `insureport`
**Production URL**: https://insureport.pages.dev
**현재 배포**: https://ccf99bfc.insureport.pages.dev

---

## 🔗 Git 자동 배포 설정

### 1. Dashboard 접속
https://dash.cloudflare.com/

### 2. 프로젝트 찾기
Workers & Pages → **insureport** 클릭

### 3. Git 연결
Settings 탭 → Builds & deployments → **Connect to Git**
- Repository: `esoyoung/InsuReport`
- Production branch: `main`

### 4. Build 설정
- Build command: `npm run build`
- Build output directory: `dist`
- Deploy command: (비워두기)

---

## 🔧 Environment Variables 설정 (필수!)

Settings → Environment variables → Add variable

**필수 변수:**
1. `GEMINI_API_KEY` (Secret)
   - https://aistudio.google.com/app/apikey

2. `VITE_USE_AI_VALIDATION` (Text)
   - Value: `true`

**선택 변수 (AI 모델 추가 시):**
3. `OPENAI_API_KEY` (Secret)
4. `ANTHROPIC_API_KEY` (Secret)

---

## 📦 R2 Binding 설정

Settings → Functions → R2 bucket bindings

**추가:**
- Variable name: `PDF_BUCKET`
- R2 bucket: `insurance-pdfs`

**R2 버킷 생성 (아직 없다면):**
```bash
npx wrangler r2 bucket create insurance-pdfs
```

---

## 🧪 테스트

### 1. Frontend 접속
https://insureport.pages.dev

### 2. API 테스트
- `/api/upload-pdf`
- `/api/validate-contracts`
- `/api/validate-contracts-r2`

---

## 📊 최종 아키텍처

```
User (Browser)
    ↓
Cloudflare Pages: https://insureport.pages.dev
    ├── Frontend (React App)
    └── Backend (Pages Functions)
        ├── /api/upload-pdf
        ├── /api/validate-contracts
        └── /api/validate-contracts-r2
            ↓
        R2 Storage (insurance-pdfs)
            ↓
        Multi-Model AI
        (Gemini / GPT-4o / Claude)
```

---

## 🎯 다음 단계

1. ✅ Pages 프로젝트 생성 완료
2. ✅ 첫 배포 완료
3. ⏳ Git 연결 (Dashboard에서)
4. ⏳ Environment variables 설정
5. ⏳ R2 binding 설정
6. ⏳ 통합 테스트

---

## 💡 수동 배포 명령어 (Git 연결 전)

```bash
npm run build
npx wrangler pages deploy dist --project-name=insureport --branch=main
```

