# 🚀 PDF 분할 병렬 처리 설계

## 🎯 **목표**

21페이지 PDF를 7페이지씩 3개로 분할 → 병렬 AI 검증 → 결과 병합

**예상 속도**: 15초 → **5-8초** (2-3배 향상!)

---

## 📐 **아키텍처**

### 1단계: PDF 분할
```javascript
// Functions function: /api/split-pdf
export async function onRequestPost(context) {
  const { fileKey } = await context.request.json();
  
  // R2에서 PDF 가져오기
  const pdfObject = await context.env.PDF_BUCKET.get(fileKey);
  const pdfBuffer = await pdfObject.arrayBuffer();
  
  // PDF 분할 (pdf-lib 사용)
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount(); // 21
  const chunkSize = Math.ceil(totalPages / 3); // 7
  
  const chunks = [];
  for (let i = 0; i < 3; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, totalPages);
    
    const chunkDoc = await PDFDocument.create();
    const pages = await chunkDoc.copyPages(pdfDoc, 
      Array.from({length: end - start}, (_, j) => start + j)
    );
    
    pages.forEach(page => chunkDoc.addPage(page));
    
    const chunkBytes = await chunkDoc.save();
    const chunkBase64 = arrayBufferToBase64(chunkBytes);
    
    chunks.push({
      index: i,
      pages: `${start + 1}-${end}`,
      base64: chunkBase64,
      size: chunkBytes.byteLength
    });
  }
  
  return new Response(JSON.stringify({ chunks }));
}
```

---

### 2단계: 병렬 AI 검증
```javascript
// Functions function: /api/validate-chunks
export async function onRequestPost(context) {
  const { chunks, parsedData } = await context.request.json();
  
  // 3개 청크 병렬 검증
  const validationPromises = chunks.map(chunk => 
    validateChunkWithGemini(chunk.base64, parsedData, context.env)
      .then(result => ({
        index: chunk.index,
        pages: chunk.pages,
        ...result
      }))
  );
  
  const results = await Promise.all(validationPromises);
  
  // 결과 병합
  const mergedData = mergeChunkResults(results);
  
  return new Response(JSON.stringify(mergedData));
}

async function validateChunkWithGemini(pdfBase64, parsedData, env) {
  const prompt = `다음 보장분석 PDF의 일부를 분석하세요.
독립적으로 추출 가능한 정보만 반환하세요:
- 계약 리스트
- 진단 현황
- 담보 현황

JSON 형식으로 반환:
{
  "contracts": [...],
  "diagnoses": [...],
  "coverages": [...]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    }
  );
  
  const result = await response.json();
  return JSON.parse(result.candidates[0].content.parts[0].text);
}

function mergeChunkResults(results) {
  // 결과를 index 순으로 정렬
  results.sort((a, b) => a.index - b.index);
  
  // 배열 병합
  const merged = {
    contracts: [],
    diagnoses: [],
    coverages: []
  };
  
  results.forEach(result => {
    if (result.contracts) merged.contracts.push(...result.contracts);
    if (result.diagnoses) merged.diagnoses.push(...result.diagnoses);
    if (result.coverages) merged.coverages.push(...result.coverages);
  });
  
  // 중복 제거 (선택사항)
  merged.contracts = deduplicateContracts(merged.contracts);
  
  return merged;
}
```

---

### 3단계: Frontend 통합
```javascript
// src/utils/parallelValidator.js
export async function validateWithParallelProcessing(fileKey, parsedData) {
  console.log('🚀 병렬 AI 검증 시작...');
  
  // 1. PDF 분할
  const splitResponse = await fetch('/api/split-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileKey })
  });
  
  const { chunks } = await splitResponse.json();
  console.log(`📄 ${chunks.length}개 청크로 분할 완료`);
  
  // 2. 병렬 검증
  const validateResponse = await fetch('/api/validate-chunks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunks, parsedData })
  });
  
  const validatedData = await validateResponse.json();
  console.log('✅ 병렬 AI 검증 완료');
  
  return validatedData;
}
```

---

## ⚡ **성능 예측**

### 현재 (순차 처리)
```
PDF 전체 (6.93MB, 21 pages)
  ↓
Gemini API (1회 호출)
  ↓
15초

CPU 사용: ~8-10초
네트워크: ~3-5초
AI 처리: ~2-5초
```

### 병렬 처리 (제안)
```
PDF 분할 (3개, 각 2.3MB, 7 pages)
  ↓
Gemini API × 3 (병렬 호출)
  ↓
5-8초

PDF 분할: ~1초
CPU 사용: ~3초 (청크당)
네트워크: ~1-2초 (동시)
AI 처리: ~1-2초 (청크당)
병합: ~0.5초

총: 5-8초 (최대 2-3배 빠름!)
```

---

## 💰 **비용 분석**

### Gemini API (Free Tier)
```
단일 호출 (21 pages):
- Input tokens: ~30,000
- Output tokens: ~5,000
- 비용: $0

병렬 호출 (7 pages × 3):
- Input tokens: ~10,000 × 3 = 30,000
- Output tokens: ~2,000 × 3 = 6,000
- 비용: $0

결론: 비용 동일!
```

### 제한사항
```
Free Tier:
- RPM: 15 requests/min
  → 3개 동시 호출 OK (3 < 15)
  
- RPD: 1,500 requests/day
  → 하루 500 PDFs 가능 (500 × 3 = 1,500)

- TPM: 1M tokens/min
  → 30K tokens × 3 = 90K < 1M OK
```

---

## 🔧 **구현 난이도**

### 필요한 작업
1. ✅ PDF 분할 API (`/api/split-pdf`)
   - pdf-lib 라이브러리 사용
   - 난이도: ⭐⭐ (보통)
   - 시간: 2-3시간

2. ✅ 병렬 검증 API (`/api/validate-chunks`)
   - Promise.all 사용
   - 난이도: ⭐ (쉬움)
   - 시간: 1-2시간

3. ✅ 결과 병합 로직
   - 배열 합치기
   - 난이도: ⭐ (쉬움)
   - 시간: 1시간

4. ✅ Frontend 통합
   - 기존 코드 수정
   - 난이도: ⭐⭐ (보통)
   - 시간: 2-3시간

**총 개발 시간**: 6-9시간 (1일)

---

## ⚠️ **주의사항**

### 1. CPU Time 제한
```
Paid Plan: 30초 CPU time

분할 시:
- PDF 분할: ~1초
- 병렬 검증: ~3초 × 3 = 9초
- 병합: ~0.5초

총: ~10.5초 < 30초 OK ✅
```

### 2. Memory 제한
```
Pages Functions: 128MB

단일 호출 시:
- PDF: 6.93MB
- Base64: ~9MB
- 처리: ~20MB
총: ~30MB

분할 시:
- PDF × 3: 2.3MB × 3 = 6.9MB
- Base64 × 3: ~3MB × 3 = 9MB
- 처리 × 3: ~10MB × 3 = 30MB (동시)
총: ~45MB (동시 처리 시)

결론: 문제 없음 ✅
```

### 3. Rate Limiting
```
동시에 3개 요청:
- 같은 API Key 사용
- Gemini API는 허용함
- 하지만 너무 많은 동시 요청은 제한될 수 있음

권장: 청크 개수는 3-4개로 제한
```

---

## 📊 **기대 효과**

| 항목 | 현재 | 병렬 처리 | 개선 |
|------|------|-----------|------|
| 속도 | 15초 | **5-8초** | **2-3배** |
| 비용 | $0 | $0 | 동일 |
| 정확도 | 95% | 95% | 동일 |
| CPU Time | 8-10초 | 3-4초 | 절약 |

---

## 🎯 **결론**

### ✅ 추천합니다!

**이유**:
1. ✅ **2-3배 속도 향상** (15초 → 5-8초)
2. ✅ **비용 동일** ($0)
3. ✅ **정확도 유지** (페이지별 독립 파싱)
4. ✅ **구현 간단** (1일 개발)
5. ✅ **Paid Plan 활용** (30초 CPU time)

### 다음 단계

구현을 원하시면:
1. `/api/split-pdf` 생성
2. `/api/validate-chunks` 수정
3. Frontend 통합
4. 테스트 및 최적화

---

**지금 바로 구현할까요?** 🚀

예상 작업 시간: 6-9시간 (오늘 완료 가능!)
