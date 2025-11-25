# Cloudflare Workers POC - Insurance Report AI Validator

## 🎯 목적

Vercel의 60초 제한을 극복하기 위한 Cloudflare Workers POC

## 🚀 핵심 기능

### 1. **5분 CPU Time**
- Vercel Hobby: 10초 ❌
- Vercel Pro: 60초 ⚠️
- **Cloudflare Paid: 300초 (5분)** ✅

### 2. **R2 직접 통합**
- 같은 플랫폼에서 스토리지 + 컴퓨팅
- 지연 없는 PDF 접근
- 저렴한 비용 ($0.015/GB/월)

### 3. **Gemini API 통합**
- PDF 직접 처리 (multimodal)
- 4개 섹션 동시 추출
  - 보유 계약 리스트
  - 실효/해지계약현황
  - 담보별 진단현황
  - 상품별 가입담보상세

## 📦 프로젝트 구조

```
cloudflare-poc/
├── wrangler.toml          # Cloudflare 설정
├── src/
│   └── index.js           # Workers 엔트리포인트
├── package.json
└── README.md
```

## 🛠️ 로컬 개발

### 1. 환경 변수 설정

```bash
# Gemini API Key 등록
npx wrangler secret put GEMINI_API_KEY
# 프롬프트에 API 키 입력
```

### 2. 로컬 실행

```bash
npm run dev
# 또는
npx wrangler dev
```

서버가 http://localhost:8787 에서 실행됩니다.

### 3. 테스트

```bash
# Health check
curl http://localhost:8787/health

# AI Validation (R2 경로)
curl -X POST http://localhost:8787/api/validate-contracts-r2 \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "pdfs/1234567890-abc123-test.pdf",
    "parsedData": {
      "계약리스트": [...],
      "진단현황": [...]
    }
  }'
```

## 🚀 배포

### 1. Cloudflare 계정 연결

```bash
npx wrangler login
```

### 2. R2 버킷 생성

```bash
npx wrangler r2 bucket create insurance-pdfs
```

### 3. Workers 배포

```bash
npm run deploy
# 또는
npx wrangler deploy
```

배포 후 URL: `https://insu-report-ai-validator.YOUR_SUBDOMAIN.workers.dev`

## 📊 성능 비교

| 항목 | Vercel Pro | Cloudflare Paid |
|------|------------|-----------------|
| Max Duration | 60초 | **5분 (300초)** |
| 가격 | $20/월 | **$5/월** |
| R2 통합 | HTTP 요청 | 직접 바인딩 |
| Cold Start | 느림 | **매우 빠름** |

## 🔧 API 엔드포인트

### 1. Health Check
```http
GET /health
```

**응답:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T16:00:00.000Z",
  "cpuLimit": "300000ms (5 minutes)",
  "environment": "development"
}
```

### 2. AI Validation (R2)
```http
POST /api/validate-contracts-r2
Content-Type: application/json

{
  "fileKey": "pdfs/1234567890-abc123-강민재_kb보장분석.pdf",
  "parsedData": {
    "계약리스트": [...],
    "진단현황": [...]
  }
}
```

**응답:**
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
    "processingTime": 45000,
    "pdfSize": "6.93MB",
    "cpuLimit": "300000ms (5 minutes)"
  }
}
```

### 3. Upload PDF to R2
```http
POST /api/upload-pdf
Content-Type: multipart/form-data

file: (PDF file)
```

**응답:**
```json
{
  "success": true,
  "fileKey": "pdfs/1764088117932-djr3qd-강민재_kb보장분석.pdf",
  "size": 7266304,
  "contentType": "application/pdf"
}
```

## 💰 비용 계산

### Cloudflare Workers Paid ($5/월)
- 요청: 10M 포함 (초과 시 $0.30/M)
- CPU Time: 30초 무료, 초과 시 $0.02/M ms
- R2: $0.015/GB/월 + $4.50/M 쓰기 + $0.36/M 읽기

### 예상 월간 비용 (1,000 PDF 처리)
- Workers: $5 (기본)
- R2 Storage: ~$0.10 (7GB)
- R2 Operations: ~$0.005
- **총 예상: $5.11/월**

vs Vercel Pro: $20/월 → **75% 절감**

## ⚠️ 주의사항

### CPU Time 제한
- Free Plan: 10ms (AI 불가능)
- **Paid Plan: 5분 (충분!)**
- wrangler.toml에서 `limits.cpu_ms = 300000` 설정

### Node.js API 제한
- Workers는 V8 isolate 사용
- 일부 Node.js API 미지원
- `pdfjs-dist` 등 브라우저 전용 라이브러리 사용 불가

### 해결책
- PDF 파싱: 브라우저(클라이언트)에서 수행
- Workers: AI 검증만 담당
- Gemini API가 PDF 직접 읽음 (multimodal)

## 🎯 다음 단계

1. ✅ POC 테스트 (로컬)
2. ✅ Cloudflare 배포
3. ✅ 프론트엔드 연동
4. ✅ 성능 측정 (60초 vs 300초)
5. ✅ 프로덕션 마이그레이션

## 📚 참고 자료

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [R2 Storage](https://developers.cloudflare.com/r2/)
- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)

---

**Created:** 2025-11-25  
**Status:** POC Ready for Testing  
**Author:** InsuReport Team
