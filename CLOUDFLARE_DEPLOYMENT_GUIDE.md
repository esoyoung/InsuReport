# 🚀 Cloudflare 완전 배포 가이드

**목표:** Vercel 대신 Cloudflare로 단일화 (Pages + Workers + R2)

---

## 🎯 **아키텍처**

```
Cloudflare Pages (Frontend)
  ↓ dist/
  ↓
Cloudflare Workers (Backend API via Pages Functions)
  ↓ functions/api/*.js
  ↓
Cloudflare R2 (PDF Storage)
  ↓ insurance-pdfs bucket
```

---

## 📦 **배포 방법: 2가지 옵션**

### **Option 1: Pages + Workers 분리 배포** (현재 구조)

#### **장점:**
- ✅ Workers와 Pages 독립적 관리
- ✅ Workers CPU time 제한 적용 가능 (5분)
- ✅ 복잡한 API 로직에 적합

#### **배포 단계:**

**Step 1: Workers 배포 (API)**
```bash
cd cloudflare-workers
npx wrangler login
npx wrangler r2 bucket create insurance-pdfs
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy

# 결과: https://insu-report-ai-validator.YOUR_SUBDOMAIN.workers.dev
```

**Step 2: Pages 배포 (Frontend)**
```bash
# Cloudflare Dashboard
1. Pages → Create a project
2. Connect Git → github.com/esoyoung/InsuReport
3. Build settings:
   - Framework: Vite
   - Build command: npm run build
   - Build output: dist
   - Root directory: (leave blank)
4. Environment variables:
   VITE_CLOUDFLARE_WORKER_URL=https://insu-report-ai-validator.YOUR_SUBDOMAIN.workers.dev
5. Save and Deploy

# 결과: https://insu-report.pages.dev
```

---

### **Option 2: Pages Functions (통합 배포)** ⭐ 추천

#### **장점:**
- ✅ 단일 배포 (간단)
- ✅ 자동 라우팅 (`/api/*` → Functions)
- ✅ Git push로 자동 배포
- ✅ 무료 플랜 가능

#### **단점:**
- ❌ CPU time 제한 (Free: 30초, Paid: 2분)
  - **해결:** 긴 작업은 별도 Workers로

#### **배포 단계:**

**Step 1: GitHub 푸시**
```bash
cd /home/user/webapp
git add functions/ wrangler.toml
git commit -m "feat: add Cloudflare Pages Functions for unified deployment"
git push origin main
```

**Step 2: Cloudflare Pages 설정**
```bash
# Cloudflare Dashboard
1. Pages → Create a project
2. Connect to Git → InsuReport
3. Build settings:
   - Build command: npm run build
   - Build output: dist
4. Environment variables:
   GEMINI_API_KEY=<your-key>
   OPENAI_API_KEY=<optional>
   ANTHROPIC_API_KEY=<optional>
5. R2 Bindings:
   - Variable name: PDF_BUCKET
   - Bucket name: insurance-pdfs
6. Save and Deploy
```

**Step 3: R2 버킷 생성**
```bash
npx wrangler r2 bucket create insurance-pdfs
```

---

## 🔧 **현재 프로젝트 구조**

```
webapp/
├── dist/                      # Vite build output (Pages)
├── functions/                 # Cloudflare Pages Functions (NEW)
│   ├── _middleware.js         # CORS + 공통 설정
│   └── api/
│       └── validate-contracts-r2.js  # AI 검증 API
├── cloudflare-workers/        # Standalone Workers (Option 1용)
│   ├── src/
│   │   ├── index.js           # Workers 엔트리포인트
│   │   └── ai-models.js       # Multi-Model AI
│   └── wrangler.toml          # Workers 설정
├── wrangler.toml              # Pages 설정 (NEW)
├── src/                       # React 소스
├── api/                       # Vercel Functions (삭제 예정)
└── package.json
```

---

## 🚀 **추천 배포 전략**

### **Phase 1: 테스트 (지금)**
✅ **Option 2 (Pages Functions)로 배포**
- 간단하고 빠름
- 무료 플랜 테스트 가능
- 30초 CPU time으로 충분한지 확인

### **Phase 2: 성능 확인 (1주)**
🔄 **CPU time 측정**
- 21페이지 PDF: 12-18초 (OK)
- 50페이지 PDF: 30-40초 (초과?)

### **Phase 3: 전환 (필요시)**
🎯 **Option 1로 전환 (CPU time 초과 시)**
- Workers 독립 배포 (5분 제한)
- Pages는 Frontend만

---

## 📊 **비용 비교**

### **Cloudflare Pages + Functions**

| 항목 | Free | Paid ($20/월) |
|------|------|---------------|
| **Requests** | 100K/일 | 무제한 |
| **CPU Time** | 30초/요청 | 120초/요청 |
| **Builds** | 500/월 | 5,000/월 |
| **R2 Storage** | 10GB | 무제한 |

### **Cloudflare Workers (독립)**

| 항목 | Free | Paid ($5/월) |
|------|------|-------------|
| **Requests** | 100K/일 | 10M/월 |
| **CPU Time** | 10ms/요청 | 300초/요청 (5분) |

### **권장:**
1. **테스트:** Pages Functions (Free) → 30초로 충분한지 확인
2. **프로덕션:** 
   - 30초 OK → Pages Functions (Free 또는 $20/월)
   - 30초 초과 → Workers 독립 ($5/월)

---

## ⚠️ **현재 에러 해결**

### **에러 로그:**
```
✘ [ERROR] Missing entry-point to Worker script or to assets directory
```

### **원인:**
- 프로젝트 루트에서 `npx wrangler deploy` 실행
- 하지만 `wrangler.toml`이 Workers 설정이 아님

### **해결:**

#### **Option 1: Workers 배포 (독립)**
```bash
cd cloudflare-workers
npx wrangler deploy
```

#### **Option 2: Pages 배포 (통합)**
```bash
# Cloudflare Dashboard에서 배포 (CLI 아님)
# 또는
npx wrangler pages deploy dist --project-name=insu-report
```

---

## 🎯 **지금 바로 배포하기**

### **Option 2 (Pages Functions) - 추천**

```bash
# 1. Git 커밋
cd /home/user/webapp
git add functions/ wrangler.toml CLOUDFLARE_DEPLOYMENT_GUIDE.md
git commit -m "feat: Cloudflare Pages Functions for unified deployment"
git push origin main

# 2. Cloudflare Dashboard
# - Pages → Create project → Connect Git
# - Build command: npm run build
# - Build output: dist
# - Environment variables: GEMINI_API_KEY
# - R2 Bindings: PDF_BUCKET → insurance-pdfs

# 3. R2 버킷 생성
npx wrangler r2 bucket create insurance-pdfs

# 4. 배포 완료!
# https://insu-report.pages.dev
```

---

## 🔗 **다음 단계**

1. ✅ **Pages Functions 배포** (지금)
2. 🔄 **성능 테스트** (30초 충분한지)
3. 🎯 **결정:**
   - 30초 OK → Pages Functions 유지
   - 30초 초과 → Workers 독립 배포

---

## 💡 **FAQ**

### **Q1: Pages Functions vs Workers 차이?**
- **Pages Functions:** 
  - `functions/` 디렉토리 자동 배포
  - CPU time: 30-120초
  - 간단한 API에 적합
- **Workers (독립):**
  - `wrangler.toml` 수동 배포
  - CPU time: 최대 5분
  - 복잡한 AI 처리에 적합

### **Q2: Vercel은 어떻게 하나요?**
- **유지:** 백업/테스트용
- **삭제:** Cloudflare 안정화 후

### **Q3: 비용은 얼마?**
- **테스트:** Free (30초 제한)
- **프로덕션:** 
  - Pages Functions: $20/월 (120초)
  - Workers 독립: $5/월 (300초)

---

**작성:** 2025-11-25  
**상태:** 배포 준비 완료  
**작성자:** InsuReport Team
