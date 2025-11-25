# 🚀 Cloudflare Workers 배포 가이드

## ⚠️ 중요: 샌드박스 환경 제약

이 샌드박스 환경에서는 브라우저 로그인이 불가능하므로, 
**로컬 환경에서 배포**해야 합니다.

---

## 📦 배포 방법 (로컬 환경)

### Option 1: 로컬 머신에서 배포 (권장)

#### 1. 프로젝트 다운로드
```bash
# GitHub에서 클론 (또는 파일 복사)
git clone https://github.com/esoyoung/InsuReport.git
cd InsuReport

# POC 폴더로 이동
cd cloudflare-poc
```

#### 2. 의존성 설치
```bash
npm install
```

#### 3. Wrangler 로그인
```bash
npx wrangler login
```
- 브라우저가 열리면 Cloudflare 계정으로 로그인
- 권한 승인

#### 4. R2 버킷 생성
```bash
npx wrangler r2 bucket create insurance-pdfs
```

**출력 예시:**
```
✅ Created bucket 'insurance-pdfs' with default storage class set.
```

#### 5. Gemini API 키 등록
```bash
npx wrangler secret put GEMINI_API_KEY
```
- 프롬프트에 Gemini API 키 입력
- API 키는 안전하게 Cloudflare에 저장됨

**Gemini API 키 발급:**
https://aistudio.google.com/app/apikey

#### 6. Workers 배포
```bash
npm run deploy
# 또는
npx wrangler deploy
```

**출력 예시:**
```
⛅️ wrangler 4.50.0
-------------------
Total Upload: 8.xx KiB / gzip: 2.xx KiB
Uploaded insu-report-ai-validator (1.23 sec)
Published insu-report-ai-validator (0.45 sec)
  https://insu-report-ai-validator.YOUR_SUBDOMAIN.workers.dev
```

**🎉 배포 완료!** URL을 복사해두세요.

---

### Option 2: GitHub Actions 자동 배포 (추후)

#### 1. GitHub Secrets 설정
- `CLOUDFLARE_API_TOKEN`: Cloudflare API 토큰
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 계정 ID
- `GEMINI_API_KEY`: Gemini API 키

#### 2. GitHub Actions 워크플로우
```yaml
# .github/workflows/deploy-workers.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
    paths:
      - 'cloudflare-poc/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./cloudflare-poc
        run: npm ci
      
      - name: Deploy to Cloudflare
        working-directory: ./cloudflare-poc
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## 🧪 배포 후 테스트

### 1. Health Check
```bash
curl https://YOUR_WORKER_URL/health
```

**예상 응답:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T16:45:00.000Z",
  "cpuLimit": "300000ms (5 minutes)",
  "environment": "production"
}
```

### 2. PDF 업로드 (R2)
```bash
curl -X POST https://YOUR_WORKER_URL/api/upload-pdf \
  -F "file=@/path/to/강민재_kb보장분석.pdf"
```

**예상 응답:**
```json
{
  "success": true,
  "fileKey": "pdfs/1764088117932-djr3qd-강민재_kb보장분석.pdf",
  "size": 7266304,
  "contentType": "application/pdf"
}
```

### 3. AI 검증 (R2 경로)
```bash
curl -X POST https://YOUR_WORKER_URL/api/validate-contracts-r2 \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "pdfs/1764088117932-djr3qd-강민재_kb보장분석.pdf",
    "parsedData": {
      "계약리스트": [...],
      "진단현황": [...]
    }
  }'
```

**예상 응답:**
```json
{
  "계약리스트": [...],
  "실효해지계약": [...],
  "진단현황": [...],
  "상품별담보": [...],
  "수정사항": [...],
  "총보험료": 456171,
  "활성월보험료": 319821,
  "_metadata": {
    "processingTime": 45230,
    "pdfSize": "6.93MB",
    "cpuLimit": "300000ms (5 minutes)"
  }
}
```

**처리 시간 확인:**
- `processingTime`: 45230ms (45.2초) ✅
- Vercel 제한: 60초
- Cloudflare 제한: 300초 (5분)
- **여유: 254초 (4분 14초)**

---

## 🔧 문제 해결

### 1. "Not authenticated" 오류
```bash
npx wrangler whoami
```
- 로그인 안 되어 있으면: `npx wrangler login`

### 2. "Bucket not found" 오류
```bash
# R2 버킷 목록 확인
npx wrangler r2 bucket list

# 버킷 생성
npx wrangler r2 bucket create insurance-pdfs
```

### 3. "Secret not found" 오류
```bash
# 시크릿 등록
npx wrangler secret put GEMINI_API_KEY

# 시크릿 목록 확인
npx wrangler secret list
```

### 4. CORS 오류
- `src/index.js`에서 CORS 헤더 확인:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // 또는 특정 도메인
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

---

## 📊 배포 후 모니터링

### 1. 로그 확인 (실시간)
```bash
npm run tail
# 또는
npx wrangler tail
```

### 2. Cloudflare 대시보드
- https://dash.cloudflare.com
- Workers & Pages → insu-report-ai-validator
- Metrics 탭에서 성능 모니터링

### 3. 주요 메트릭
- **Requests**: 요청 수
- **Errors**: 오류 비율
- **CPU Time**: CPU 사용량 (5분 제한 체크)
- **Duration**: 실제 처리 시간

---

## 💰 비용 예상 (Cloudflare Paid)

### 기본 요금: $5/월
- 10M 요청 포함
- 30초 CPU Time 무료
- 추가 CPU Time: $0.02/M ms

### 예상 사용량 (1,000 PDF/월)
- 요청: 3,000 (업로드 + 검증 + 기타)
- CPU Time: 45초 × 1,000 = 45,000초 = 45M ms
- 추가 CPU: (45M - 30M) = 15M ms × $0.02 = **$0.30**

### R2 비용
- Storage: 7GB × $0.015 = **$0.11**
- Write: 1,000 × $0.0000045 = **$0.005**
- Read: 3,000 × $0.00000036 = **$0.001**

### 총 예상 비용: **$5.42/월**

vs Vercel Pro: **$20/월** → **73% 절감**

---

## 🎯 다음 단계

### 1. Vercel 프론트엔드 연동
`/home/user/webapp/src/utils/storageUploader.js` 수정:

```javascript
// Cloudflare Workers URL로 변경
const CLOUDFLARE_WORKER_URL = 'https://YOUR_WORKER_URL';

// R2 기반 AI 검증
const response = await fetch(`${CLOUDFLARE_WORKER_URL}/api/validate-contracts-r2`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileKey, parsedData })
});
```

### 2. A/B 테스트
- 50% 트래픽 → Vercel API
- 50% 트래픽 → Cloudflare Workers
- 성능/안정성 비교

### 3. 완전 전환
- Cloudflare 안정성 확인
- Vercel API 제거
- Vercel Pro 플랜 해지

---

## 📝 체크리스트

배포 전:
- [ ] Cloudflare 계정 생성
- [ ] Gemini API 키 발급
- [ ] 로컬 환경 준비 (Node.js 18+)

배포 중:
- [ ] `npx wrangler login` 성공
- [ ] R2 버킷 생성 완료
- [ ] Gemini API 키 등록 완료
- [ ] `npm run deploy` 성공
- [ ] 배포 URL 확인

배포 후:
- [ ] Health check 테스트 성공
- [ ] PDF 업로드 테스트 성공
- [ ] AI 검증 테스트 성공
- [ ] 처리 시간 측정 (60초 미만 확인)
- [ ] Vercel 프론트엔드 연동

---

**배포 완료 후 이 문서를 업데이트하세요!**
- 배포 URL: `_______________`
- 배포 일시: `_______________`
- 첫 테스트 결과: `_______________`
