# 대용량 PDF 처리 솔루션

## 🚨 문제 상황

Vercel Serverless Function의 **4.5MB 페이로드 제한은 플랜과 무관하게 고정**되어 있습니다.
- Hobby 플랜: 4.5MB
- Pro 플랜: 4.5MB (동일)
- Enterprise 플랜: 4.5MB (동일)

## ✅ 해결 방안

### Option 1: 외부 스토리지 + Pre-signed URL (가장 권장)

#### 아키텍처
```
클라이언트
    ↓ (1) PDF 업로드
외부 스토리지 (S3/Supabase/Cloudflare R2)
    ↓ (2) 업로드 URL 반환
클라이언트
    ↓ (3) URL만 전송 (< 1KB)
Vercel Function
    ↓ (4) URL로 PDF 다운로드
Gemini API (PDF 분석)
    ↓ (5) 결과 반환
클라이언트
```

#### 비용 비교

| 서비스 | 무료 한도 | 초과 시 비용 |
|--------|-----------|--------------|
| **Cloudflare R2** | 10GB 저장 / 월 | $0.015/GB |
| **Supabase Storage** | 1GB 저장 / 월 | $0.021/GB |
| **AWS S3** | 5GB 저장 / 12개월 | $0.023/GB |
| **Vercel Blob** | 0.5GB / 월 | $0.15/GB (비쌈) |

#### 구현 예시: Cloudflare R2

**1. 클라이언트: PDF를 R2에 직접 업로드**
```javascript
// src/utils/storageUploader.js
async function uploadToR2(file) {
  // Pre-signed URL 요청
  const { uploadUrl, fileKey } = await fetch('/api/get-upload-url', {
    method: 'POST',
    body: JSON.stringify({ 
      fileName: file.name,
      contentType: file.type 
    })
  }).then(r => r.json());

  // R2에 직접 업로드 (Vercel 거치지 않음!)
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });

  return fileKey;
}
```

**2. Serverless Function: URL로 PDF 다운로드 후 처리**
```javascript
// api/validate-contracts-large.js
export default async function handler(req, res) {
  const { fileKey, parsedData } = req.body;

  // R2에서 PDF 다운로드 (내부 네트워크, 빠름)
  const pdfUrl = `https://your-bucket.r2.cloudflarestorage.com/${fileKey}`;
  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();

  // Gemini API 호출 (기존 로직)
  const result = await validateWithGemini(pdfBuffer, parsedData);
  
  res.json(result);
}
```

**장점:**
- ✅ 무제한 PDF 크기 지원 (10MB, 50MB, 100MB 모두 가능)
- ✅ Vercel 페이로드 제한 회피
- ✅ 저렴한 비용 (Cloudflare R2는 egress 무료)
- ✅ 빠른 업로드 (클라이언트 → R2 직접)

**단점:**
- ❌ 추가 서비스 설정 필요
- ❌ 약간의 복잡도 증가

---

### Option 2: Vercel Blob Storage

#### 아키텍처
Vercel이 제공하는 자체 스토리지 사용 (Option 1과 유사)

```javascript
// api/upload-to-blob.js
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  const blob = await put(req.body.fileName, req.body.file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  res.json({ blobUrl: blob.url });
}
```

**장점:**
- ✅ Vercel 생태계 통합
- ✅ 간단한 설정

**단점:**
- ❌ 비싼 가격 ($0.15/GB, R2의 10배)
- ❌ 무료 한도 적음 (0.5GB)

---

### Option 3: 스트리밍 업로드 (복잡)

HTTP 스트리밍으로 청크 분할 전송

**장점:**
- ✅ 외부 스토리지 불필요

**단점:**
- ❌ 구현 복잡
- ❌ Gemini API가 스트리밍 지원 안함
- ❌ 실질적으로 불가능

---

### Option 4: PDF 페이지 분할

10MB PDF를 2MB씩 5개로 분할하여 순차 처리

**장점:**
- ✅ 외부 서비스 불필요

**단점:**
- ❌ 사용자 경험 저하
- ❌ 분석 품질 저하 (전체 문맥 손실)
- ❌ 비추천

---

## 🎯 권장 솔루션

### ⭐ Cloudflare R2 (가장 추천)

#### 비용 분석
```
월 100회 업로드 (평균 5MB PDF)
- 저장: 0.5GB × $0.015 = $0.0075/월
- 업로드: 무료
- 다운로드: 무료 (egress 무료!)
- 총 비용: ~$0.01/월
```

#### 설정 단계

**1. Cloudflare R2 버킷 생성**
```bash
# Cloudflare 대시보드에서
1. R2 → Create Bucket
2. 버킷 이름: "insu-report-pdfs"
3. API 토큰 생성 (읽기/쓰기 권한)
```

**2. Pre-signed URL 생성 API**
```javascript
// api/get-upload-url.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  const { fileName, contentType } = req.body;
  const fileKey = `pdfs/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  res.json({ uploadUrl, fileKey });
}
```

**3. 클라이언트 수정**
```javascript
// src/utils/storageUploader.js
export async function uploadLargePDF(file) {
  // 1. Pre-signed URL 받기
  const { uploadUrl, fileKey } = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  }).then(r => r.json());

  // 2. R2에 직접 업로드
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  return fileKey;
}
```

**4. AI 검증 API 수정**
```javascript
// api/validate-contracts-r2.js
export default async function handler(req, res) {
  const { fileKey, parsedData } = req.body;

  // R2에서 PDF 다운로드
  const pdfUrl = `https://${process.env.R2_PUBLIC_URL}/${fileKey}`;
  const pdfResponse = await fetch(pdfUrl);
  const pdfBuffer = await pdfResponse.arrayBuffer();

  // Base64 변환
  const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

  // 기존 AI 검증 로직
  const result = await validateWithGemini(pdfBase64, parsedData);

  res.json(result);
}
```

**5. 환경 변수 설정**
```env
# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=insu-report-pdfs
R2_PUBLIC_URL=your-public-url
```

---

## 🆚 솔루션 비교

| 솔루션 | 최대 크기 | 비용/월 | 구현 난이도 | 추천도 |
|--------|-----------|---------|-------------|--------|
| **현재 (압축)** | ~5MB | $0 | ⭐ | ⭐⭐⭐ |
| **Cloudflare R2** | 무제한 | ~$0.01 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Vercel Blob** | 무제한 | ~$0.75 | ⭐⭐ | ⭐⭐⭐ |
| **Supabase** | 무제한 | ~$0.10 | ⭐⭐ | ⭐⭐⭐⭐ |
| **스트리밍** | 무제한 | $0 | ⭐⭐⭐⭐⭐ | ⭐ |

---

## 💡 결론

### 현재 상황
- ✅ 5MB 이하 PDF: 현재 압축 방식으로 충분
- ⚠️ 5-10MB PDF: 압축으로 해결 가능하나 불안정
- ❌ 10MB 이상 PDF: 외부 스토리지 필수

### 권장 조치
1. **단기**: 현재 압축 방식 유지
2. **중기**: Cloudflare R2 도입 (5MB 이상 PDF만)
3. **장기**: 모든 PDF를 R2로 처리 (일관성)

### 구현 우선순위
```
Phase 1: 현재 압축 방식 (완료) ✅
Phase 2: R2 Pre-signed URL API 구축
Phase 3: 5MB 이상 시 자동 R2 업로드
Phase 4: 전체 PDF를 R2로 마이그레이션
```

---

## 📚 참고 자료

- [Cloudflare R2 문서](https://developers.cloudflare.com/r2/)
- [Vercel Blob 문서](https://vercel.com/docs/storage/vercel-blob)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
