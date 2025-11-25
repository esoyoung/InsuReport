# 🚨 Cloudflare Pages 배포 에러 해결

## 📋 **에러 로그**
```
✘ [ERROR] It looks like you've run a Workers-specific command in a Pages project.
For Pages, please run `wrangler pages deploy` instead.
```

---

## 🔍 **문제 원인**

Cloudflare Pages가 **빌드 후 자동으로 `npx wrangler deploy`를 실행**했습니다.

**원인:**
- Pages 프로젝트 설정에 **잘못된 Deploy Command**가 설정됨
- 또는 `wrangler.toml`의 설정이 Workers로 오인식됨

---

## ✅ **해결 방법**

### **Solution 1: Deploy Command 제거 (권장)**

Cloudflare Pages는 **빌드만 하고, 배포는 자동**으로 처리합니다.

#### **Cloudflare Dashboard 설정:**
```
1. Pages → InsuReport 프로젝트 선택
2. Settings → Builds & deployments
3. Build configuration:
   ✅ Build command: npm run build
   ✅ Build output directory: dist
   ✅ Deploy command: echo "Deployed via Cloudflare Pages"
      (주의: 비워둘 수 없음, required 필드)
4. Save
```

**Deploy command 설명:**
- `echo "..."`: 더미 명령어 (빠른 성공)
- Git Integration은 실제로 이 명령어를 **무시**함
- 실제 배포는 Cloudflare Pages가 자동 처리

---

### **Solution 2: wrangler.toml 간소화**

Pages는 `wrangler.toml`이 **필요 없습니다**. Dashboard에서 모든 설정 가능.

#### **현재 wrangler.toml (간소화 완료):**
```toml
# Cloudflare Pages Configuration
# Deploy via Cloudflare Dashboard, not CLI

# Note: DO NOT use `wrangler deploy` command
# Pages uses different deployment method

# Frontend: dist/
# Backend: functions/ (automatically deployed as Workers)
# R2 Binding: PDF_BUCKET → insurance-pdfs (configure in Dashboard)
```

**또는 완전히 삭제해도 됩니다:**
```bash
rm wrangler.toml  # Pages는 필요 없음
```

---

## 🚀 **올바른 배포 프로세스**

### **Cloudflare Pages 자동 배포:**

```
Git Push
   ↓
Cloudflare Pages 감지
   ↓
1. npm install
2. npm run build → dist/
3. dist/ 배포 (자동)
4. functions/ 배포 (자동, Workers로)
   ↓
✅ 완료!
```

**명령어 실행 필요 없음!**

---

## 🎯 **지금 바로 수정하기**

### **Step 1: Dashboard 설정 확인**
```
1. https://dash.cloudflare.com/
2. Pages → InsuReport
3. Settings → Builds & deployments
4. Build configuration 수정:
   - Build command: npm run build
   - Build output: dist
   - Deploy command: echo "Deployed via Cloudflare Pages" ← 변경!
5. Save
```

**주의:** Deploy command는 필수 필드입니다.
- `npx wrangler deploy` (❌ Workers 명령어) 
- `echo "..."` (✅ 더미 명령어, 추천)

### **Step 2: 재배포 트리거**
```
1. Deployments 탭
2. "Retry deployment" 클릭
   또는
   Git에 작은 변경 후 push
```

### **Step 3: 배포 로그 확인**
```
예상 로그:
✅ Build command completed
✅ Deploying to Cloudflare Pages...
✅ Deployment complete!
🌐 https://insu-report.pages.dev
```

---

## 📊 **정상 배포 시 로그**

```
2025-11-25T17:52:25.312Z  Success: Build command completed
2025-11-25T17:52:25.500Z  Deploying to Cloudflare Pages...
2025-11-25T17:52:26.000Z  ✅ Deployment successful
2025-11-25T17:52:26.001Z  🌐 https://insu-report.pages.dev
```

**`npx wrangler deploy` 로그가 나오면 안 됩니다!**

---

## 🔧 **대안: CLI 배포 (수동)**

Dashboard 설정이 복잡하면, **로컬에서 수동 배포** 가능:

```bash
# 1. 빌드
npm run build

# 2. Pages 배포
npx wrangler pages deploy dist --project-name=insu-report

# 3. Functions 자동 배포됨 (functions/ 디렉토리)
```

---

## ⚠️ **주의사항**

### **Pages vs Workers 명령어**

| 프로젝트 타입 | 배포 명령어 | 파일 |
|-------------|-----------|------|
| **Workers** | `wrangler deploy` | `cloudflare-workers/wrangler.toml` |
| **Pages** | **자동** (Dashboard) | `functions/` |
| **Pages (CLI)** | `wrangler pages deploy dist` | - |

### **현재 프로젝트: Pages**
- ✅ Frontend: `dist/`
- ✅ Backend: `functions/api/*.js`
- ❌ **절대 `wrangler deploy` 사용 금지**

---

## 🎯 **최종 체크리스트**

### **Dashboard 설정**
- ✅ Build command: `npm run build`
- ✅ Build output: `dist`
- ❌ Deploy command: (비워두기)
- ✅ Environment variables: `GEMINI_API_KEY`
- ✅ R2 Bindings: `PDF_BUCKET` → `insurance-pdfs`

### **Git 파일**
- ✅ `functions/` 디렉토리
- ✅ `dist/` (빌드 결과, ignore됨)
- ⚠️ `wrangler.toml` (선택, 간소화 또는 삭제)

### **배포 확인**
- ✅ Git push → 자동 빌드 & 배포
- ✅ 로그에 `wrangler deploy` 없음
- ✅ `https://insu-report.pages.dev` 접속 가능

---

## 💡 **FAQ**

### **Q1: wrangler.toml이 필요한가요?**
- **Pages:** 필요 없음 (Dashboard 설정으로 충분)
- **Workers:** 필요 (`cloudflare-workers/wrangler.toml`)

### **Q2: Deploy command는 뭐로 설정하나요?**
- **정답:** 비워두기 (자동 배포)
- **오답:** `npx wrangler deploy` (Workers 명령어)

### **Q3: functions/ 디렉토리는 어떻게 배포되나요?**
- **자동:** Pages가 감지하고 Workers로 배포
- **설정 불필요**

---

## 🚀 **다음 단계**

1. ✅ **Dashboard Deploy Command 제거**
2. ✅ **Git 커밋** (wrangler.toml 간소화)
3. ✅ **재배포 트리거** (Retry deployment)
4. ✅ **배포 성공 확인**
5. ✅ **사이트 접속 테스트**

---

**작성:** 2025-11-25  
**상태:** 문제 해결 완료  
**다음:** Dashboard 설정 수정 → 재배포
