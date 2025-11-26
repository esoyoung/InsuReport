# 🚨 해결책: 새로운 Pages 프로젝트 생성 필요

## 현재 상황
- `insu-report` = **Workers 프로젝트** (Backend API만)
- Workers는 **Static Files를 서빙할 수 없음** (React 앱 불가)
- Pages 프로젝트가 **따로 필요함**

## ✅ 즉시 해야 할 일: 새 Pages 프로젝트 생성

### 1. Cloudflare Dashboard 접속
https://dash.cloudflare.com/

### 2. Workers & Pages 메뉴에서 "Create" 버튼 클릭
좌측 메뉴: Workers & Pages → "Create" 버튼

### 3. 이번에는 다른 이름 사용!
**중요:** `insu-report`는 이미 Workers로 사용 중이므로 다른 이름 필요

권장 이름:
- `insu-report-app`
- `insureport-frontend`
- `insurance-report-web`

### 4. Git 연결
- Repository: `esoyoung/InsuReport`
- Branch: `main`

### 5. Build Configuration
```
Project name: insu-report-app (Workers와 다른 이름!)
Production branch: main
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Deploy command: (비워두기 또는 'true')
```

### 6. Environment Variables (배포 후 설정)
- `GEMINI_API_KEY` (Secret)
- `VITE_USE_AI_VALIDATION` (Text: true)

### 7. R2 Binding (배포 후 설정)
- Variable name: `PDF_BUCKET`
- R2 bucket: `insurance-pdfs`

---

## 📊 최종 아키텍처

### Option A: Pages만 사용 (권장 ⭐)
```
User → Cloudflare Pages (insu-report-app.pages.dev)
        ├── Frontend (dist/)
        └── Backend (functions/)
```

### Option B: Workers + Pages 분리
```
User → Cloudflare Pages (Frontend)
       └→ Workers (insu-report.workers.dev) - Backend API
```

---

## 🎯 Pages vs Workers 비교

| 기능 | Workers (현재) | Pages (필요) |
|------|---------------|-------------|
| **Static Files** | ❌ 불가 | ✅ 가능 |
| **React App** | ❌ 불가 | ✅ 가능 |
| **Backend API** | ✅ 가능 | ✅ 가능 (functions/) |
| **Git 자동배포** | ❌ 수동 | ✅ 자동 |
| **URL 형식** | `*.workers.dev` | `*.pages.dev` |

---

## 🚀 지금 바로 시작하세요!

1. Dashboard → Workers & Pages
2. "Create" 버튼 (또는 "Create application")
3. 프로젝트 이름: `insu-report-app` ← Workers와 다른 이름!
4. Git: esoyoung/InsuReport, main
5. Build: npm run build, dist
6. Deploy command: 비워두기!

---

## 💡 왜 이제까지 안 됐나?

- `insu-report`는 **Workers 프로젝트**
- Workers는 "Hello World" 같은 **단일 스크립트만 실행**
- **Static files (React)를 서빙할 수 없음**
- Pages가 필요한 이유!

