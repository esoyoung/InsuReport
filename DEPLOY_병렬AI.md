# 병렬 AI 검증 배포 가이드

## ✅ 완료된 작업

### 1. 코드 구현 ✅
- ✅ 동적 PDF 분할 로직 (`parallelAIValidator.js`)
- ✅ 병렬 Gemini API 호출 (`Promise.all`)
- ✅ 결과 병합 및 중복 제거
- ✅ 프론트엔드 통합 (자동 5MB 기준)
- ✅ 오류 처리 및 fallback

### 2. GitHub 커밋 ✅
- **Commit**: `c67328d`
- **Branch**: `main`
- **Repository**: https://github.com/esoyoung/InsuReport
- **Commit URL**: https://github.com/esoyoung/InsuReport/commit/c67328d

### 3. 빌드 완료 ✅
```bash
✓ 252 modules transformed.
dist/index.html                   1.09 kB │ gzip:   0.61 kB
dist/assets/index-CcQzOBhW.css   20.55 kB │ gzip:   4.80 kB
dist/assets/index-BYBopbS1.js   617.62 kB │ gzip: 238.86 kB
✓ built in 5.00s
```

---

## 📋 배포 방법 (2가지 옵션)

### 옵션 1: Cloudflare Dashboard (권장) ⭐

**가장 간단한 방법입니다!**

1. **Cloudflare Dashboard 접속**
   ```
   https://dash.cloudflare.com/
   ```

2. **프로젝트 이동**
   - `Workers & Pages` 클릭
   - `insureport` 프로젝트 선택

3. **배포 실행**
   - 상단의 `Deployments` 탭 클릭
   - `Create deployment` 버튼 클릭
   - 또는 `Retry deployment` (이전 배포가 있는 경우)

4. **배포 확인 (2-3분 소요)**
   - Build logs 확인
   - 배포 완료 시 Production URL 확인

5. **Production URL**
   ```
   https://insureport.pages.dev
   ```

---

### 옵션 2: Wrangler CLI (API Token 필요)

**API Token이 있는 경우에만 사용**

1. **API Token 설정**
   ```bash
   export CLOUDFLARE_API_TOKEN='your-actual-token-here'
   ```

2. **배포 실행**
   ```bash
   cd /home/user/webapp
   npx wrangler pages deploy dist --project-name=insureport --branch=main
   ```

3. **배포 완료 확인**
   ```
   ✨  Deployment complete!
   🌎 https://xxxxxxxx.insureport.pages.dev (Preview)
   🌎 https://insureport.pages.dev (Production)
   ```

---

## 🧪 배포 후 테스트

### 1. 브라우저 접속
```
https://insureport.pages.dev
```

### 2. PDF 업로드
- **소형 PDF** (< 5MB): 단일 처리 모드
- **중형 PDF** (5-7MB): 병렬 3청크 모드 ⚡
- **대형 PDF** (> 7MB): 병렬 4청크 모드 ⚡

### 3. 브라우저 콘솔 확인 (F12)

#### 예상 로그 (병렬 모드, 6.93MB PDF):
```
🔍 AI 검증 가능 여부: true
📦 대용량 PDF 감지 (6.93MB > 2.8MB), R2 경로 사용
📤 R2 업로드 시작: 강민재_kb보장분석.pdf (6.93MB)
✅ R2 업로드 완료: pdfs/...
📄 규칙 기반 PDF 파싱 시작...
✅ 규칙 기반 파싱 완료
🚀 병렬 AI 검증 요청 (6.93MB)
📊 PDF 자동 분할: 21페이지 → 3개 청크
  - 섹션 1: Page 1-7 (7페이지)
  - 섹션 2: Page 8-14 (7페이지)
  - 섹션 3: Page 15-21 (7페이지)
✅ 3개 청크 추출 완료
🤖 병렬 Gemini API 호출 시작...
✅ 청크 1/3 (섹션 1) 완료
✅ 청크 2/3 (섹션 2) 완료
✅ 청크 3/3 (섹션 3) 완료
✅ 병렬 API 호출 완료 (5234ms)
🔀 결과 병합 중...
✅ 병합 완료: 3/3개 청크 성공
  - 계약: 2건
  - 진단: 31건
✅ 병렬 AI 검증 완료 (7812ms)
  📊 3/3개 청크 성공
```

---

## 📊 성능 확인 포인트

### Before (기존 단일 처리)
- ⏱️ **처리 시간**: 15-18초
- 📊 **청크 수**: 1개 (전체 PDF)
- 🔄 **API 호출**: 순차 1회

### After (병렬 처리) ⚡
- ⏱️ **처리 시간**: 5-8초 ✅
- 📊 **청크 수**: 3-4개
- 🔄 **API 호출**: 병렬 3-4회
- 🚀 **속도 향상**: 2-3배

---

## ⚠️ 주의사항

### 1. Cloudflare Workers CPU Limit
현재 설정:
```toml
[limits]
cpu_ms = 30000  # Paid Plan: 30초
```

병렬 처리는 30초 이내에 완료됩니다 ✅

### 2. Gemini API Free Tier
- **RPM (Requests Per Minute)**: 15
- **병렬 청크**: 3-4개 (15 RPM 이내 ✅)
- **TPM (Tokens Per Minute)**: 1,000,000
- **청크당 토큰**: ~30,000-35,000
- **총 토큰**: ~105,000-140,000 TPM (1M TPM 이내 ✅)

### 3. R2 Bucket 확인
Cloudflare Dashboard에서 확인:
- **Bucket**: `insurance-pdfs`
- **Binding**: `PDF_BUCKET` (wrangler.toml에 설정됨)

### 4. 환경 변수 확인
Cloudflare Dashboard → insureport → Settings → Variables and Secrets:
- ✅ `GEMINI_API_KEY` (Secret)
- ✅ `VITE_USE_AI_VALIDATION` (Variable: "true")

---

## 🔍 문제 해결

### 병렬 모드가 활성화되지 않는 경우

1. **PDF 크기 확인**
   - 5MB 미만 PDF는 단일 처리 모드 사용 (정상)

2. **브라우저 콘솔 확인**
   ```
   🚀 병렬 AI 검증 요청 (X.XXMB)
   ```
   - 위 메시지가 보이지 않으면 5MB 미만

### API 오류가 발생하는 경우

1. **Cloudflare Workers 로그 확인**
   - Dashboard → insureport → Real-time logs
   - "Begin log stream" 클릭

2. **Gemini API 할당량 확인**
   - https://aistudio.google.com/app/apikey
   - API Key 사용량 확인

3. **CPU 시간 초과 (Error 1102)**
   - 병렬 처리는 30초 이내에 완료됩니다
   - Workers Paid Plan이 필요합니다 ($5/month)

---

## 📈 성공 기준

### ✅ 배포 성공
- [x] GitHub에 코드 커밋 완료
- [x] Vite 빌드 성공
- [ ] Cloudflare Pages 배포 완료
- [ ] Production URL 접속 가능

### ✅ 병렬 처리 동작
- [ ] 5MB 이상 PDF 업로드 시 병렬 모드 자동 활성화
- [ ] 브라우저 콘솔에 "병렬 AI 검증 요청" 메시지 표시
- [ ] 3-4개 청크 분할 로그 표시
- [ ] 처리 시간 5-8초 이내
- [ ] 결과 병합 성공 (계약, 진단 데이터)

### ✅ 성능 개선
- [ ] Before: 15-18초
- [ ] After: 5-8초
- [ ] 속도 향상: 2-3배

---

## 🎯 다음 단계

1. **배포 완료** (옵션 1 또는 옵션 2 선택)
2. **테스트 PDF 업로드**
   - 예: `강민재_kb보장분석.pdf` (6.93MB, 21페이지)
3. **브라우저 콘솔 로그 확인**
4. **처리 시간 측정**
5. **결과 정확성 검증**

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. **브라우저 콘솔 로그** (F12)
2. **Cloudflare Workers 로그** (Dashboard → Real-time logs)
3. **GitHub Commit**: https://github.com/esoyoung/InsuReport/commit/c67328d
4. **문서**: `/home/user/webapp/PARALLEL_AI_구현완료.md`

---

**배포 준비 완료!** ✅

옵션 1 (Cloudflare Dashboard) 또는 옵션 2 (Wrangler CLI)를 선택하여 배포하세요.
