# 🎯 Final Deployment Steps for AI Validation

## ✅ Problem Solved!

**Issue**: `VITE_USE_AI_VALIDATION: undefined`
**Root Cause**: Vite requires environment variables at **build time**, but `wrangler.toml` variables only apply at **runtime**
**Solution**: Created `.env.production` file with `VITE_USE_AI_VALIDATION=true`

---

## 📋 Current Status

### ✅ Completed
- ✅ `.env.production` created with `VITE_USE_AI_VALIDATION=true`
- ✅ Committed and pushed to GitHub: commit `2e2a89a`
- ✅ Build completed successfully (dist/ generated)
- ✅ R2 bucket binding configured: `PDF_BUCKET` → `insurance-pdfs`
- ✅ `GEMINI_API_KEY` set as Secret in Dashboard

### 🔄 Next Steps (Choose One)

---

## Option A: Git Auto-Deployment (Recommended)

If the Cloudflare Dashboard has Git integration enabled:

1. **Go to Cloudflare Dashboard**
   - URL: https://dash.cloudflare.com/
   - Navigate to: Workers & Pages → `insureport` → Deployments

2. **Trigger New Deployment**
   - Click "Retry deployment" button
   - OR: Wait for automatic deployment (if Git webhook is configured)

3. **Expected Result**
   - New deployment will pull latest code from GitHub
   - `.env.production` will be used during build
   - `VITE_USE_AI_VALIDATION=true` will be injected into the app

---

## Option B: Manual Deployment via Wrangler CLI

If Git auto-deployment is not set up:

### Prerequisites
You need the Cloudflare API Token from earlier. If you don't have it:
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Use the existing `insureport` token, or create a new one with:
   - Template: "Edit Cloudflare Workers"
   - Permission: Account → Cloudflare Pages → Edit

### Deploy Command
```bash
export CLOUDFLARE_API_TOKEN='your-api-token-here'
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist --project-name=insureport --branch=main
```

---

## 🧪 Testing After Deployment

### 1. Access New Deployment
- Production URL: https://insureport.pages.dev
- OR: Latest deployment URL from Dashboard

### 2. Upload Test PDF
- Upload `강민재_kb보장분석.pdf` (6.93MB)

### 3. Expected Logs in Browser Console
```
✅ 대용량 PDF 감지: 6.93MB > 2.8MB, R2 스토리지 사용
✅ R2 업로드 완료: pdfs/1234567890123-xxxxx-강민재_kb보장분석.pdf
✅ PDF 파싱 완료 (21 pages)

🔍 AI 검증 가능 여부: true                    ← Should be TRUE now!
🔍 VITE_USE_AI_VALIDATION: "true"            ← Should be "true" now!
🔍 skipAIForLarge: false

🤖 R2 기반 AI 검증 시작...                     ← AI validation starts!
📤 R2 파일 키를 사용한 AI 검증 요청 중...
✅ R2 기반 AI 검증 완료 (수정사항: 0건)         ← AI validation completes!
✅ 전체 파싱 완료
```

### 4. Verify AI Validation Result
- Check for "수정사항: X건" in logs
- Verify contracts and diagnoses are validated by Gemini AI

---

## 📊 Architecture Flow

```
User uploads PDF (6.93MB)
  ↓
Frontend detects: size > 2.8MB → use R2 path
  ↓
Upload to R2: /api/upload-pdf
  ↓
Rule-based parsing (21 pages) → 2 contracts, 31 diagnoses
  ↓
Check: isAIValidationAvailable()
  ↓ (NOW TRUE!)
Call: /api/validate-contracts-r2 with R2 fileKey
  ↓
Cloudflare Pages Function fetches PDF from R2
  ↓
Convert to Base64 → Send to Gemini 2.0 Flash
  ↓
AI validates contracts & diagnoses → corrections
  ↓
Frontend displays: "수정사항: X건"
```

---

## 🔧 If AI Validation Still Doesn't Work

### Debug Checklist
1. **Check browser console**: Look for `VITE_USE_AI_VALIDATION: "true"`
2. **Verify Dashboard Secrets**:
   - Go to: insureport → Settings → Variables and Secrets
   - Confirm: `GEMINI_API_KEY` is set (encrypted)
3. **Check deployment logs**:
   - Go to: Deployments → Latest deployment → View logs
   - Look for: `✓ Build completed successfully`
4. **Verify R2 binding**:
   - Go to: Settings → Functions → R2 bucket bindings
   - Confirm: `PDF_BUCKET` → `insurance-pdfs`

### Manual Fix
If still not working, try:
```bash
# Clear build cache
rm -rf dist .vite

# Rebuild with explicit env file
NODE_ENV=production npm run build

# Check built files for VITE_USE_AI_VALIDATION
grep -r "VITE_USE_AI_VALIDATION" dist/
```

---

## 📈 Expected Outcome

### Before (Current Issue)
```
🔍 AI 검증 가능 여부: false
🔍 VITE_USE_AI_VALIDATION: undefined
❌ AI 검증을 건너뜁니다
```

### After (Fixed)
```
🔍 AI 검증 가능 여부: true
🔍 VITE_USE_AI_VALIDATION: "true"
🤖 R2 기반 AI 검증 시작...
✅ R2 기반 AI 검증 완료 (수정사항: 0건)
```

---

## 🎯 Summary

**What We Fixed**:
- ❌ `wrangler.toml` `[vars]` only applies at runtime (Pages Functions)
- ✅ `.env.production` injects variables at build time (Vite frontend)

**What Happens Now**:
- Vite build reads `.env.production`
- `VITE_USE_AI_VALIDATION=true` is injected into `dist/assets/index-*.js`
- Frontend `isAIValidationAvailable()` returns `true`
- AI validation with Gemini 2.0 Flash is enabled

**GitHub Commit**: https://github.com/esoyoung/InsuReport/commit/2e2a89a

---

## 🚀 Next Action

**Please choose one**:
- **Option A**: Go to Dashboard → Deployments → "Retry deployment"
- **Option B**: Provide API Token, and I'll deploy via CLI

Then test PDF upload and share the browser console logs! 🎉
