/**
 * 병렬 AI 검증기 (PDF 청크 기반)
 * 여러 Gemini API 호출을 병렬로 실행하여 처리 속도 2-3배 향상
 */

import { validateWithGemini } from './ai-models.js';

// pdf-lib은 Cloudflare Workers에서 사용 가능
import { PDFDocument } from 'pdf-lib';

/**
 * PDF 섹션 감지 (Cloudflare Workers 환경용)
 * 브라우저 환경과 달리 PDF.js를 사용할 수 없으므로 단순 패턴 매칭 사용
 */
async function analyzePDFSections(pdfArrayBuffer) {
  // PDF를 텍스트로 변환 (간단한 접근법)
  // 실제로는 pdf-parse 등을 사용할 수 있지만, 여기서는 페이지 분할만 수행
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  // 기본 섹션 분할 전략: 페이지 수에 따라 자동 분할
  const sections = [];
  
  if (totalPages <= 10) {
    // 10페이지 이하: 전체를 하나로
    sections.push({
      type: 'FULL',
      title: '전체 문서',
      startPage: 1,
      endPage: totalPages
    });
  } else if (totalPages <= 21) {
    // 21페이지 이하: 3-4개 청크로 분할
    const chunkSize = Math.ceil(totalPages / 3);
    
    for (let i = 0; i < 3; i++) {
      const start = i * chunkSize + 1;
      const end = Math.min((i + 1) * chunkSize, totalPages);
      
      if (start <= totalPages) {
        sections.push({
          type: `CHUNK_${i + 1}`,
          title: `섹션 ${i + 1}`,
          startPage: start,
          endPage: end
        });
      }
    }
  } else {
    // 21페이지 초과: 4개 청크로 분할
    const chunkSize = Math.ceil(totalPages / 4);
    
    for (let i = 0; i < 4; i++) {
      const start = i * chunkSize + 1;
      const end = Math.min((i + 1) * chunkSize, totalPages);
      
      if (start <= totalPages) {
        sections.push({
          type: `CHUNK_${i + 1}`,
          title: `섹션 ${i + 1}`,
          startPage: start,
          endPage: end
        });
      }
    }
  }
  
  console.log(`📊 PDF 자동 분할: ${totalPages}페이지 → ${sections.length}개 청크`);
  sections.forEach(s => {
    console.log(`  - ${s.title}: Page ${s.startPage}-${s.endPage} (${s.endPage - s.startPage + 1}페이지)`);
  });
  
  return sections;
}

/**
 * PDF 청크 추출 (Cloudflare Workers 환경용)
 */
async function extractPDFChunk(pdfArrayBuffer, startPage, endPage) {
  const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
  const newPdfDoc = await PDFDocument.create();
  
  // 페이지 인덱스 생성 (0-based)
  const pageIndices = Array.from(
    { length: endPage - startPage + 1 }, 
    (_, i) => startPage - 1 + i
  );
  
  // 페이지 복사
  const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
  copiedPages.forEach(page => newPdfDoc.addPage(page));
  
  // PDF 저장
  const pdfBytes = await newPdfDoc.save();
  
  return {
    base64: arrayBufferToBase64(pdfBytes.buffer),
    pageRange: `${startPage}-${endPage}`,
    size: pdfBytes.byteLength,
    pageCount: endPage - startPage + 1
  };
}

/**
 * ArrayBuffer를 Base64로 변환
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
}

/**
 * 섹션 타입에 맞는 parsedData 필터링
 */
function filterParsedDataBySection(parsedData, sectionType) {
  // CHUNK 타입은 전체 데이터 전달 (동적 분할이므로)
  if (sectionType.startsWith('CHUNK_') || sectionType === 'FULL') {
    return parsedData;
  }
  
  // 특정 섹션만 필터링
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

/**
 * 청크별 결과 병합
 */
function mergeValidationResults(results) {
  const merged = {
    계약리스트: [],
    실효해지계약: [],
    진단현황: [],
    상품별담보: [],
    수정사항: [],
    총보험료: 0,
    활성월보험료: 0,
    고객정보: null
  };
  
  let successCount = 0;
  
  for (const result of results) {
    if (result.error) {
      console.warn(`⚠️ 청크 ${result._chunk} 실패, 스킵`);
      continue;
    }
    
    successCount++;
    
    // 고객정보는 첫 번째 성공 결과 사용
    if (!merged.고객정보 && result.고객정보) {
      merged.고객정보 = result.고객정보;
    }
    
    // 배열 병합 (중복 제거는 나중에 수행)
    if (result.계약리스트 && Array.isArray(result.계약리스트)) {
      merged.계약리스트.push(...result.계약리스트);
    }
    if (result.진단현황 && Array.isArray(result.진단현황)) {
      merged.진단현황.push(...result.진단현황);
    }
    if (result.실효해지계약 && Array.isArray(result.실효해지계약)) {
      merged.실효해지계약.push(...result.실효해지계약);
    }
    if (result.상품별담보 && Array.isArray(result.상품별담보)) {
      merged.상품별담보.push(...result.상품별담보);
    }
    if (result.수정사항 && Array.isArray(result.수정사항)) {
      merged.수정사항.push(...result.수정사항);
    }
  }
  
  // 계약리스트 중복 제거 (번호 기준)
  if (merged.계약리스트.length > 0) {
    const uniqueContracts = new Map();
    merged.계약리스트.forEach(contract => {
      const key = `${contract.번호}-${contract.계약일}-${contract.보험사}`;
      if (!uniqueContracts.has(key) || contract.월보험료 > 0) {
        uniqueContracts.set(key, contract);
      }
    });
    merged.계약리스트 = Array.from(uniqueContracts.values())
      .sort((a, b) => (a.번호 || 0) - (b.번호 || 0));
  }
  
  // 진단현황 중복 제거 (담보명 기준)
  if (merged.진단현황.length > 0) {
    const uniqueDiagnosis = new Map();
    merged.진단현황.forEach(diagnosis => {
      if (!uniqueDiagnosis.has(diagnosis.담보명)) {
        uniqueDiagnosis.set(diagnosis.담보명, diagnosis);
      }
    });
    merged.진단현황 = Array.from(uniqueDiagnosis.values());
  }
  
  // 총보험료 재계산
  merged.총보험료 = merged.계약리스트
    .filter(c => c.납입상태 !== '완료')
    .reduce((sum, c) => sum + (parseFloat(c.월보험료) || 0), 0);
  
  merged.활성월보험료 = merged.총보험료;
  
  console.log(`✅ 병합 완료: ${successCount}/${results.length}개 청크 성공`);
  console.log(`  - 계약: ${merged.계약리스트.length}건`);
  console.log(`  - 진단: ${merged.진단현황.length}건`);
  
  return merged;
}

/**
 * 병렬 Gemini 검증 (메인 함수)
 * @param {ArrayBuffer} pdfArrayBuffer - PDF ArrayBuffer
 * @param {Object} parsedData - 규칙 기반 파싱 결과
 * @param {Object} env - Cloudflare Workers 환경 변수
 * @returns {Promise<Object>} 검증된 데이터 + 메타데이터
 */
export async function validateWithParallelGemini(pdfArrayBuffer, parsedData, env) {
  const startTime = Date.now();
  
  console.log('🚀 병렬 AI 검증 시작');
  
  try {
    // 1단계: 섹션 감지 (자동 분할)
    const sections = await analyzePDFSections(pdfArrayBuffer);
    
    // 2단계: 청크 추출
    console.log('📦 청크 추출 중...');
    const chunks = await Promise.all(
      sections.map(section => 
        extractPDFChunk(pdfArrayBuffer, section.startPage, section.endPage)
          .then(chunk => ({ ...chunk, type: section.type, title: section.title }))
      )
    );
    
    console.log(`✅ ${chunks.length}개 청크 추출 완료`);
    chunks.forEach(c => {
      console.log(`  - ${c.title}: ${c.pageRange} (${(c.size / 1024 / 1024).toFixed(2)}MB)`);
    });
    
    // 3단계: 병렬 Gemini API 호출
    console.log('🤖 병렬 Gemini API 호출 시작...');
    const apiStartTime = Date.now();
    
    const results = await Promise.all(
      chunks.map((chunk, index) => {
        const chunkParsedData = filterParsedDataBySection(parsedData, chunk.type);
        
        return validateWithGemini(chunk.base64, chunkParsedData, env)
          .then(result => {
            console.log(`✅ 청크 ${index + 1}/${chunks.length} (${chunk.title}) 완료`);
            return { 
              ...result, 
              _chunk: chunk.type,
              _title: chunk.title,
              _pageRange: chunk.pageRange 
            };
          })
          .catch(error => {
            console.error(`❌ 청크 ${index + 1} (${chunk.title}) 실패:`, error.message);
            return { 
              error: error.message, 
              _chunk: chunk.type,
              _title: chunk.title,
              _pageRange: chunk.pageRange 
            };
          });
      })
    );
    
    const apiDuration = Date.now() - apiStartTime;
    console.log(`✅ 병렬 API 호출 완료 (${apiDuration}ms)`);
    
    // 4단계: 결과 병합
    console.log('🔀 결과 병합 중...');
    const mergedResult = mergeValidationResults(results);
    
    const totalDuration = Date.now() - startTime;
    
    return {
      ...mergedResult,
      _metadata: {
        mode: 'parallel',
        processingTime: totalDuration,
        apiCallTime: apiDuration,
        parallelChunks: chunks.length,
        successfulChunks: results.filter(r => !r.error).length,
        failedChunks: results.filter(r => r.error).length,
        chunkDetails: results.map(r => ({ 
          chunk: r._title || r._chunk, 
          pageRange: r._pageRange,
          success: !r.error,
          error: r.error || null
        }))
      }
    };
    
  } catch (error) {
    console.error('❌ 병렬 검증 오류:', error);
    throw error;
  }
}
