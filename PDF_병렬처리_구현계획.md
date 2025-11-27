# PDF 병렬 처리 구현 계획 (동적 분할 기반)

## 📋 개요

**목표**: KB 보장분석 PDF의 페이지 제목을 기반으로 동적 분할 후, 각 섹션을 병렬로 Gemini API에 전송하여 처리 속도 2-3배 향상

**핵심 전략**: 
- 페이지 제목 감지 기반 동적 분할 (고정 페이지 범위 X)
- 섹션별 독립적 파싱 후 병합
- Gemini API 동일 Key로 병렬 호출 (Promise.all)

---

## 🎯 KB 보장분석 PDF 구조 분석

### 섹션 구조 (페이지 제목 기반)

```
[Page 1-2] 고객 정보 섹션
  - "안영균 (61세, 남자) 님의 전체 보장현황"
  - 고객명, 나이, 성별, 총 계약수, 월보험료

[Page 3-N1] 계약 리스트 섹션
  - "님의 보유 계약 리스트" 또는 "님의 전체 계약리스트"
  - 계약 목록 테이블 (번호, 보험사, 상품명, 계약일, 납입주기, 월보험료)

[Page N1+1 - N2] 담보별 현황 섹션
  - "님의 담보별 가입 현황" 또는 "님의 상품별 가입현황"
  - 담보별 가입 상황

[Page N2+1 - End] 진단 현황 섹션
  - "님의 전체 담보 진단 현황"
  - 31개 담보별 권장금액/가입금액/부족금액/상태
```

### 동적 분할 키워드 (정규식)

```javascript
const SECTION_KEYWORDS = {
  CUSTOMER_INFO: /님의 전체 (?:보장현황|계약리스트)/,
  CONTRACT_LIST: /님의 (?:보유|전체)\s*계약\s*리스트/,
  COVERAGE_STATUS: /님의 (?:담보별 가입 현황|상품별 가입현황|상품별담보)/,
  DIAGNOSIS_STATUS: /님의 전체 담보 진단 현황/
};
```

---

## 🔧 구현 아키텍처

### 1. **PDF 페이지 분석기 (pdfSectionAnalyzer.js)**

```javascript
export async function analyzePDFSections(pdfArrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
  const sections = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    
    // 섹션 제목 감지
    if (SECTION_KEYWORDS.CUSTOMER_INFO.test(pageText)) {
      sections.push({ type: 'CUSTOMER_INFO', startPage: pageNum });
    } else if (SECTION_KEYWORDS.CONTRACT_LIST.test(pageText)) {
      sections.push({ type: 'CONTRACT_LIST', startPage: pageNum });
    } else if (SECTION_KEYWORDS.COVERAGE_STATUS.test(pageText)) {
      sections.push({ type: 'COVERAGE_STATUS', startPage: pageNum });
    } else if (SECTION_KEYWORDS.DIAGNOSIS_STATUS.test(pageText)) {
      sections.push({ type: 'DIAGNOSIS_STATUS', startPage: pageNum });
    }
  }
  
  // endPage 계산
  for (let i = 0; i < sections.length; i++) {
    sections[i].endPage = sections[i + 1]?.startPage - 1 || pdf.numPages;
  }
  
  return sections;
}
```

**결과 예시:**
```json
[
  { "type": "CUSTOMER_INFO", "startPage": 1, "endPage": 2 },
  { "type": "CONTRACT_LIST", "startPage": 3, "endPage": 10 },
  { "type": "COVERAGE_STATUS", "startPage": 11, "endPage": 11 },
  { "type": "DIAGNOSIS_STATUS", "startPage": 12, "endPage": 21 }
]
```

---

### 2. **PDF 청크 추출기 (pdfChunkExtractor.js)**

```javascript
import { PDFDocument } from 'pdf-lib';

export async function extractPDFChunk(pdfArrayBuffer, startPage, endPage) {
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const newPdfDoc = await PDFDocument.create();
  
  // 지정된 페이지 범위만 복사
  const pages = await newPdfDoc.copyPages(
    pdfDoc, 
    Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i - 1)
  );
  
  pages.forEach(page => newPdfDoc.addPage(page));
  
  const pdfBytes = await newPdfDoc.save();
  const base64 = arrayBufferToBase64(pdfBytes);
  
  return {
    base64,
    pageRange: `${startPage}-${endPage}`,
    size: pdfBytes.byteLength
  };
}
```

---

### 3. **병렬 AI 검증기 (parallelAIValidator.js)**

```javascript
import { analyzePDFSections } from './pdfSectionAnalyzer.js';
import { extractPDFChunk } from './pdfChunkExtractor.js';
import { validateWithGemini } from '../../cloudflare-workers/src/ai-models.js';

export async function validateWithParallelGemini(pdfArrayBuffer, parsedData, env) {
  const startTime = Date.now();
  
  // 1단계: 섹션 감지
  console.log('📊 PDF 섹션 분석 중...');
  const sections = await analyzePDFSections(pdfArrayBuffer);
  console.log(`✅ ${sections.length}개 섹션 감지:`, sections);
  
  // 2단계: 각 섹션을 PDF 청크로 추출
  const chunks = await Promise.all(
    sections.map(section => 
      extractPDFChunk(pdfArrayBuffer, section.startPage, section.endPage)
        .then(chunk => ({ ...chunk, type: section.type }))
    )
  );
  
  console.log('✅ PDF 청크 추출 완료:', chunks.map(c => `${c.type}(${c.pageRange})`));
  
  // 3단계: 병렬 Gemini API 호출
  console.log('🚀 병렬 AI 검증 시작...');
  const results = await Promise.all(
    chunks.map((chunk, index) => {
      const chunkParsedData = filterParsedDataBySection(parsedData, chunk.type);
      
      return validateWithGemini(chunk.base64, chunkParsedData, env)
        .then(result => ({ 
          ...result, 
          _chunk: chunk.type, 
          _pageRange: chunk.pageRange 
        }))
        .catch(error => {
          console.error(`❌ 청크 ${index} (${chunk.type}) 실패:`, error.message);
          return { error: error.message, _chunk: chunk.type };
        });
    })
  );
  
  const duration = Date.now() - startTime;
  console.log(`✅ 병렬 검증 완료 (${duration}ms)`);
  
  // 4단계: 결과 병합
  const mergedResult = mergeValidationResults(results);
  
  return {
    ...mergedResult,
    _metadata: {
      processingTime: duration,
      parallelChunks: chunks.length,
      chunkDetails: results.map(r => ({ 
        chunk: r._chunk, 
        pageRange: r._pageRange,
        success: !r.error 
      }))
    }
  };
}

// 섹션 타입에 맞는 parsedData 필터링
function filterParsedDataBySection(parsedData, sectionType) {
  switch (sectionType) {
    case 'CUSTOMER_INFO':
      return { 고객정보: parsedData.고객정보 };
    case 'CONTRACT_LIST':
      return { 계약리스트: parsedData.계약리스트 };
    case 'COVERAGE_STATUS':
      return { 담보현황: parsedData.담보현황 };
    case 'DIAGNOSIS_STATUS':
      return { 진단현황: parsedData.진단현황 };
    default:
      return parsedData;
  }
}

// 청크별 결과 병합
function mergeValidationResults(results) {
  const merged = {
    계약리스트: [],
    실효해지계약: [],
    진단현황: [],
    상품별담보: [],
    수정사항: [],
    총보험료: 0,
    활성월보험료: 0
  };
  
  for (const result of results) {
    if (result.error) continue; // 실패한 청크는 스킵
    
    // 배열 병합
    if (result.계약리스트) {
      merged.계약리스트.push(...result.계약리스트);
    }
    if (result.진단현황) {
      merged.진단현황.push(...result.진단현황);
    }
    if (result.실효해지계약) {
      merged.실효해지계약.push(...result.실효해지계약);
    }
    if (result.상품별담보) {
      merged.상품별담보.push(...result.상품별담보);
    }
    if (result.수정사항) {
      merged.수정사항.push(...result.수정사항);
    }
    
    // 금액 합산
    merged.총보험료 += result.총보험료 || 0;
    merged.활성월보험료 += result.활성월보험료 || 0;
  }
  
  return merged;
}
```

---

### 4. **Cloudflare Pages Function 수정**

**파일**: `functions/api/validate-contracts-r2.js`

```javascript
import { validateWithParallelGemini } from '../../src/utils/parallelAIValidator.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { fileKey, parsedData, model = 'auto', parallel = false } = await request.json();
  
  // ...기존 코드...
  
  const pdfArrayBuffer = await pdfObject.arrayBuffer();
  const pdfSizeMB = (pdfArrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  
  // 병렬 처리 활성화 시
  if (parallel && pdfSizeMB > 5) {
    console.log('🚀 병렬 처리 모드 활성화');
    const validatedData = await validateWithParallelGemini(pdfArrayBuffer, parsedData, env);
    
    return new Response(JSON.stringify({
      ...validatedData,
      _metadata: {
        ...validatedData._metadata,
        pdfSize: `${pdfSizeMB}MB`,
        mode: 'parallel'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 기존 단일 처리
  const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
  const validatedData = await callAI(pdfBase64, parsedData, model, env);
  // ...
}
```

---

## 📊 성능 예측

### 현재 (단일 처리)
- **PDF 크기**: 6.93MB (21 페이지)
- **Base64 변환**: ~2-3초
- **Gemini API 호출**: ~12-15초
- **총 처리 시간**: **~15-18초**

### 병렬 처리 후
- **섹션 분석**: ~0.5초
- **청크 추출**: ~1초 (4 청크 병렬)
- **병렬 Gemini API**: ~5-7초 (4 청크 동시 처리)
- **결과 병합**: ~0.3초
- **총 처리 시간**: **~7-9초** ✅ **2-3배 빠름**

---

## 🔒 Gemini API 제약 확인

### Free Tier 제한
- **RPM (Requests Per Minute)**: 15
- **TPM (Tokens Per Minute)**: 1,000,000
- **RPD (Requests Per Day)**: 1,500

### 병렬 처리 시 API 사용량
- **4개 청크 동시 호출** → 4 RPM 사용 ✅ (15 RPM 이내)
- **청크당 토큰**: ~30,000 (전체 150,000의 1/4)
- **총 토큰**: ~120,000 TPM ✅ (1M TPM 이내)

**결론**: 4개 청크 병렬 처리는 Free Tier에서도 안전 ✅

---

## 🛠️ 구현 순서

1. **Step 1**: `pdfSectionAnalyzer.js` 생성 (섹션 감지)
2. **Step 2**: `pdfChunkExtractor.js` 생성 (청크 추출)
3. **Step 3**: `parallelAIValidator.js` 생성 (병렬 검증)
4. **Step 4**: `validate-contracts-r2.js` 수정 (병렬 모드 지원)
5. **Step 5**: 프론트엔드 `storageUploader.js`에 `parallel: true` 옵션 추가
6. **Step 6**: 실제 PDF 테스트 및 성능 측정

---

## 📝 동적 분할의 장점

✅ **유연성**: 페이지 순서가 바뀌어도 자동 감지  
✅ **정확성**: 섹션별 독립 파싱으로 관계 혼선 없음  
✅ **확장성**: 새로운 섹션 추가 시 키워드만 추가  
✅ **속도**: 2-3배 빠른 처리 (7-9초)  
✅ **무료**: Gemini Free Tier 내에서 가능  

---

## 🎯 다음 단계

1. 위 코드들을 실제로 구현
2. 실제 PDF 파일로 테스트
3. 성능 측정 (Before/After)
4. Cloudflare Pages에 배포
5. Production 환경에서 검증

**예상 개발 시간**: 2-3 시간  
**예상 효과**: 처리 속도 2-3배 향상 (15초 → 7-9초)
