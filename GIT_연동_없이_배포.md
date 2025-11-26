# 🚀 Git 연동 없이 Cloudflare Pages 배포하기

## 📊 **현재 상황 분석**

### ✅ **설정 완료된 항목**
- ✅ Cloudflare Pages 프로젝트 생성: `insureport`
- ✅ R2 Bucket 바인딩: `PDF_BUCKET` → `insurance-pdfs`
- ✅ 환경변수 설정: `GEMINI_API_KEY` (Secret), `VITE_USE_AI_VALIDATION` (Text)
- ✅ `vite.config.js`에 AI 검증 강제 활성화 설정 추가 (commit `b0b17eb`)

### ❌ **문제점**
- ❌ Dashboard에 **"Builds & deployments"** 섹션이 없음
- ❌ Git 연동이 안 되어 있음
- ❌ 자동 배포가 불가능함

### 💡 **해결 방법**
**Git 연동 없이 수동 배포**를 진행합니다!

---

## 🔑 **1단계: Cloudflare API Token 준비**

### API Token이 이미 있는 경우
이전에 생성한 Cloudflare API Token이 있다면 그것을 사용하세요.

### API Token이 없는 경우

1. **Cloudflare Dashboard 접속**
   - URL: https://dash.cloudflare.com/profile/api-tokens

2. **"Create Token" 클릭**

3. **템플릿 선택: "Edit Cloudflare Workers"**
   - 또는 "Use template" 클릭

4. **Permission 설정 확인**
   ```
   Account → Cloudflare Pages → Edit
   ```

5. **"Continue to summary" → "Create Token"**

6. **⚠️ 중요: 토큰 복사**
   - 생성된 토큰은 **한 번만** 표시됩니다
   - 복사해서 안전한 곳에 보관하세요

---

## 🚀 **2단계: 수동 배포 실행**

### Option A: 자동 스크립트 사용 (권장)

```bash
# 1. API Token 설정 (복사한 토큰으로 대체)
export CLOUDFLARE_API_TOKEN='your-cloudflare-api-token-here'

# 2. 배포 스크립트 실행
cd /home/user/webapp
./deploy-without-git.sh
```

**스크립트가 자동으로 수행하는 작업**:
1. ✅ `vite.config.js`에 AI 검증 설정 확인
2. ✅ `npm run build` 실행
3. ✅ 빌드 결과 검증 (VITE_USE_AI_VALIDATION='true' 확인)
4. ✅ `npx wrangler pages deploy` 실행
5. ✅ Production URL 출력

---

### Option B: 수동 명령어 실행

```bash
# 1. API Token 설정
export CLOUDFLARE_API_TOKEN='your-cloudflare-api-token-here'

# 2. 프로젝트 디렉토리로 이동
cd /home/user/webapp

# 3. 빌드 실행
npm run build

# 4. 배포 실행
npx wrangler pages deploy dist --project-name=insureport --branch=main
```

---

## 📝 **3단계: 배포 결과 확인**

### 예상 출력

```
⛅️ wrangler 4.45.0
─────────────────────────────────────────────

Uploading... (5 files)
✨ Success! Uploaded 5 files (2.53 sec)

✨ Deployment complete! Take a peek over at
   https://xxxxxxxx.insureport.pages.dev
```

### Production URL
- **프로덕션**: https://insureport.pages.dev
- **이번 배포**: https://xxxxxxxx.insureport.pages.dev (고유 ID)

---

## 🧪 **4단계: AI 검증 테스트**

### 1. 브라우저 접속
```
https://insureport.pages.dev
```

### 2. 개발자 도구 열기
- **Windows/Linux**: `F12` 또는 `Ctrl+Shift+I`
- **Mac**: `Cmd+Option+I`

### 3. Console 탭으로 이동

### 4. PDF 업로드
- `강민재_kb보장분석.pdf` (6.93MB) 업로드

### 5. 콘솔 로그 확인

**✅ 성공 시 예상 로그:**
```
✅ 대용량 PDF 감지: 6.93MB > 2.8MB, R2 스토리지 사용
✅ R2 업로드 완료: pdfs/1764183449503-xxxxx-강민재_kb보장분석.pdf
✅ PDF 파싱 완료 (21 pages)

🔍 AI 검증 가능 여부: true              ← TRUE가 나와야 함!
🔍 VITE_USE_AI_VALIDATION: "true"      ← "true"가 나와야 함!
🔍 skipAIForLarge: false

🤖 R2 기반 AI 검증 시작...              ← 새로 추가!
📤 R2 파일 키를 사용한 AI 검증 요청 중...
✅ R2 기반 AI 검증 완료 (수정사항: 0건)  ← Gemini AI 검증 완료!
✅ 전체 파싱 완료
```

**❌ 실패 시 (이전과 동일):**
```
🔍 AI 검증 가능 여부: false
🔍 VITE_USE_AI_VALIDATION: undefined
```

---

## 🔧 **문제 해결**

### 문제 1: API Token 오류
```
Error: In a non-interactive environment, it's necessary to set 
a CLOUDFLARE_API_TOKEN environment variable
```

**해결**:
```bash
export CLOUDFLARE_API_TOKEN='your-token-here'
```

---

### 문제 2: 프로젝트를 찾을 수 없음
```
Error: Could not find project with name 'insureport'
```

**해결**: 프로젝트 이름 확인
```bash
# 프로젝트 목록 확인
npx wrangler pages project list

# 올바른 프로젝트 이름으로 배포
npx wrangler pages deploy dist --project-name=올바른이름 --branch=main
```

---

### 문제 3: 빌드 실패
```
Error: Build failed
```

**해결**:
```bash
# 캐시 삭제 후 재빌드
rm -rf node_modules dist .vite
npm install
npm run build
```

---

### 문제 4: AI 검증 여전히 undefined

**원인**: 이전 빌드 캐시 사용 중

**해결**:
```bash
# 1. 완전히 클린 빌드
rm -rf dist .vite
npm run build

# 2. 빌드 결과 확인
grep -r "VITE_USE_AI_VALIDATION" dist/

# 3. 재배포
npx wrangler pages deploy dist --project-name=insureport --branch=main
```

---

## 📊 **배포 전후 비교**

| 항목 | 배포 전 | 배포 후 (예상) |
|------|---------|---------------|
| `VITE_USE_AI_VALIDATION` | `undefined` | `"true"` ✅ |
| AI 검증 가능 여부 | `false` | `true` ✅ |
| R2 기반 AI 검증 | ❌ 실행 안됨 | ✅ 실행됨 |
| Gemini API 호출 | ❌ 없음 | ✅ 정상 호출 |

---

## 🎯 **요약**

### 현재 상황
- ❌ Git 연동 안됨 (Builds & deployments 섹션 없음)
- ✅ `vite.config.js`에 AI 검증 강제 활성화 설정 추가됨

### 해결 방법
- 🔑 Cloudflare API Token 생성
- 🚀 수동 배포: `./deploy-without-git.sh`
- 🧪 테스트: https://insureport.pages.dev

### 예상 결과
- ✅ `VITE_USE_AI_VALIDATION: "true"`
- ✅ `🤖 R2 기반 AI 검증 시작...`
- ✅ `✅ R2 기반 AI 검증 완료`

---

## 🚀 **지금 바로 실행하세요!**

```bash
# 1. API Token 설정 (Dashboard에서 복사)
export CLOUDFLARE_API_TOKEN='your-token-here'

# 2. 배포 스크립트 실행
cd /home/user/webapp
./deploy-without-git.sh
```

**배포 완료 후 브라우저 콘솔 로그를 공유해주세요!** 🎉

---

## 📚 **관련 문서**

- `/home/user/webapp/deploy-without-git.sh` - 자동 배포 스크립트
- `/home/user/webapp/URGENT_AI_FIX.md` - AI 검증 수정 상세 내역
- `/home/user/webapp/FINAL_DEPLOYMENT_STEPS.md` - 전체 배포 가이드

---

**GitHub**: https://github.com/esoyoung/InsuReport/commit/b0b17eb
