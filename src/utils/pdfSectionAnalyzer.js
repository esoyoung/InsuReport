/**
 * PDF 섹션 분석기 (동적 페이지 제목 기반 분할)
 * KB 보장분석 PDF의 섹션 경계를 자동 감지
 */

// 섹션 감지 키워드 (정규식)
const SECTION_KEYWORDS = {
  CUSTOMER_INFO: /님의\s*(?:전체\s*)?(?:보장현황|계약리스트)/,
  CONTRACT_LIST: /님의\s*(?:보유|전체)\s*계약\s*리스트/,
  COVERAGE_STATUS: /님의\s*(?:담보별\s*가입\s*현황|상품별\s*가입현황|상품별담보)/,
  DIAGNOSIS_STATUS: /님의\s*전체\s*담보\s*진단\s*현황/
};

/**
 * PDF ArrayBuffer를 분석하여 섹션 목록 반환
 * @param {ArrayBuffer} pdfArrayBuffer - PDF 파일의 ArrayBuffer
 * @returns {Promise<Array>} 섹션 목록 [{ type, startPage, endPage }]
 */
export async function analyzePDFSections(pdfArrayBuffer) {
  // PDF.js 동적 import (브라우저 환경)
  let pdfjsLib;
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    pdfjsLib = window.pdfjsLib;
  } else {
    throw new Error('PDF.js library not loaded');
  }

  console.log('📊 PDF 섹션 분석 시작...');
  
  const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
  const sections = [];
  
  // 각 페이지를 순회하며 섹션 제목 감지
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // 페이지 텍스트 추출 (공백 포함)
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' '); // 연속 공백 제거
    
    // 섹션 제목 매칭
    if (SECTION_KEYWORDS.CUSTOMER_INFO.test(pageText)) {
      sections.push({ 
        type: 'CUSTOMER_INFO', 
        startPage: pageNum,
        title: '고객 정보'
      });
      console.log(`  ✅ [Page ${pageNum}] 고객 정보 섹션 감지`);
    }
    
    if (SECTION_KEYWORDS.CONTRACT_LIST.test(pageText)) {
      sections.push({ 
        type: 'CONTRACT_LIST', 
        startPage: pageNum,
        title: '계약 리스트'
      });
      console.log(`  ✅ [Page ${pageNum}] 계약 리스트 섹션 감지`);
    }
    
    if (SECTION_KEYWORDS.COVERAGE_STATUS.test(pageText)) {
      sections.push({ 
        type: 'COVERAGE_STATUS', 
        startPage: pageNum,
        title: '담보별 현황'
      });
      console.log(`  ✅ [Page ${pageNum}] 담보별 현황 섹션 감지`);
    }
    
    if (SECTION_KEYWORDS.DIAGNOSIS_STATUS.test(pageText)) {
      sections.push({ 
        type: 'DIAGNOSIS_STATUS', 
        startPage: pageNum,
        title: '진단 현황'
      });
      console.log(`  ✅ [Page ${pageNum}] 진단 현황 섹션 감지`);
    }
  }
  
  // 중복 제거 (같은 섹션이 여러 페이지에 나오는 경우)
  const uniqueSections = [];
  let lastType = null;
  
  for (const section of sections) {
    if (section.type !== lastType) {
      uniqueSections.push(section);
      lastType = section.type;
    }
  }
  
  // endPage 계산 (다음 섹션 시작 전까지 또는 마지막 페이지)
  for (let i = 0; i < uniqueSections.length; i++) {
    uniqueSections[i].endPage = 
      uniqueSections[i + 1]?.startPage - 1 || pdf.numPages;
  }
  
  console.log(`✅ 총 ${uniqueSections.length}개 섹션 감지 완료`);
  uniqueSections.forEach(s => {
    console.log(`  - ${s.title}: Page ${s.startPage}-${s.endPage}`);
  });
  
  return uniqueSections;
}

/**
 * 섹션 타입별 우선순위 (병합 시 사용)
 */
export const SECTION_PRIORITY = {
  CUSTOMER_INFO: 1,
  CONTRACT_LIST: 2,
  COVERAGE_STATUS: 3,
  DIAGNOSIS_STATUS: 4
};

/**
 * 섹션 목록이 유효한지 검증
 * @param {Array} sections - 섹션 목록
 * @returns {boolean} 유효 여부
 */
export function validateSections(sections) {
  if (!sections || sections.length === 0) {
    console.warn('⚠️ 섹션이 감지되지 않았습니다');
    return false;
  }
  
  // 필수 섹션 확인 (고객정보, 계약리스트는 필수)
  const hasCustomerInfo = sections.some(s => s.type === 'CUSTOMER_INFO');
  const hasContractList = sections.some(s => s.type === 'CONTRACT_LIST');
  
  if (!hasCustomerInfo) {
    console.warn('⚠️ 고객 정보 섹션을 찾을 수 없습니다');
  }
  
  if (!hasContractList) {
    console.warn('⚠️ 계약 리스트 섹션을 찾을 수 없습니다');
  }
  
  return hasCustomerInfo && hasContractList;
}

/**
 * 청크 크기 계산 (성능 최적화용)
 * @param {Array} sections - 섹션 목록
 * @returns {Object} 청크 통계 { totalPages, avgPagesPerChunk }
 */
export function calculateChunkStats(sections) {
  const totalPages = sections.reduce((sum, s) => sum + (s.endPage - s.startPage + 1), 0);
  const avgPagesPerChunk = Math.round(totalPages / sections.length);
  
  return {
    totalChunks: sections.length,
    totalPages,
    avgPagesPerChunk,
    sections: sections.map(s => ({
      type: s.type,
      title: s.title,
      pageCount: s.endPage - s.startPage + 1
    }))
  };
}
