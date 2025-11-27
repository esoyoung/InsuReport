/**
 * PDF 필수 페이지 추출기
 * KB 보장분석 PDF에서 AI 검증에 필요한 페이지만 추출하여 경량화 (6.93MB → 1.5-2MB)
 */

import { PDFDocument } from 'pdf-lib';

/**
 * 페이지 제목 키워드 (정규식)
 */
const PAGE_KEYWORDS = {
  COVER: /^[\s\S]*?보장분석|보험설계|표지/i, // 표지 (1p)
  CONTRACT_LIST: /님의\s*(?:전체|보유)\s*계약\s*리스트/i, // 계약 리스트 (5p 등)
  TERMINATED_LIST: /님의\s*(?:실효|해지)\s*계약\s*현황/i, // 실효/해지 (11p 등, 없을 수 있음)
  DIAGNOSIS: /님의\s*전체\s*담보\s*진단\s*현황/i // 진단 현황 (12p, 18p 등)
};

/**
 * PDF의 각 페이지 텍스트와 제목 분석
 * @param {File} pdfFile - PDF 파일
 * @returns {Promise<Array>} 페이지 분석 결과 [{ pageNum, text, type, title }]
 */
export async function analyzePDFPages(pdfFile) {
  console.log('📊 PDF 페이지 분석 시작...');
  
  // PDF.js로 텍스트 추출
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const pages = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // 페이지 텍스트 추출
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 페이지 타입 식별
    let pageType = 'OTHER';
    let pageTitle = '기타';
    
    if (pageNum === 1 || PAGE_KEYWORDS.COVER.test(pageText)) {
      pageType = 'COVER';
      pageTitle = '표지';
    } else if (PAGE_KEYWORDS.CONTRACT_LIST.test(pageText)) {
      pageType = 'CONTRACT_LIST';
      pageTitle = '계약 리스트';
    } else if (PAGE_KEYWORDS.TERMINATED_LIST.test(pageText)) {
      pageType = 'TERMINATED_LIST';
      pageTitle = '실효/해지 계약';
    } else if (PAGE_KEYWORDS.DIAGNOSIS.test(pageText)) {
      pageType = 'DIAGNOSIS';
      pageTitle = '진단 현황';
    }
    
    pages.push({
      pageNum,
      text: pageText,
      type: pageType,
      title: pageTitle
    });
    
    if (pageType !== 'OTHER') {
      console.log(`  ✅ Page ${pageNum}: ${pageTitle}`);
    }
  }
  
  console.log(`✅ 총 ${pdf.numPages}페이지 분석 완료`);
  
  return pages;
}

/**
 * 필수 페이지 번호 식별
 * @param {Array} pages - analyzePDFPages() 결과
 * @returns {Array<number>} 추출할 페이지 번호 배열
 */
export function identifyEssentialPages(pages) {
  const essentialPages = new Set();
  
  // 1. 표지 (1p) - 항상 포함
  const coverPage = pages.find(p => p.type === 'COVER');
  if (coverPage) {
    essentialPages.add(coverPage.pageNum);
  } else {
    essentialPages.add(1); // 표지가 감지 안되면 1페이지 강제 추가
  }
  
  // 2. 계약 리스트 (5p 등) - 실제 범위 확인
  const contractStartIndex = pages.findIndex(p => p.type === 'CONTRACT_LIST');
  let contractPages = 0;
  
  if (contractStartIndex !== -1) {
    const contractStartPage = pages[contractStartIndex].pageNum;
    
    // 다음 섹션 찾기
    let contractEndPage = contractStartPage;
    for (let i = contractStartIndex + 1; i < pages.length; i++) {
      const pageType = pages[i].type;
      if (pageType === 'TERMINATED_LIST' || pageType === 'DIAGNOSIS') {
        contractEndPage = pages[i].pageNum - 1;
        break;
      }
      if (i === pages.length - 1) {
        contractEndPage = pages[i].pageNum;
      }
    }
    
    // 실제 계약 리스트 범위 계산
    const actualContractPages = contractEndPage - contractStartPage + 1;
    contractPages = Math.min(actualContractPages, 2); // 최대 2페이지
    
    // 페이지 추가
    for (let p = contractStartPage; p < contractStartPage + contractPages; p++) {
      essentialPages.add(p);
    }
    
    console.log(`  📋 계약 리스트: Page ${contractStartPage}${contractPages > 1 ? `-${contractStartPage + contractPages - 1}` : ''} (${contractPages}페이지)`);
  }
  
  // 3. 실효/해지 계약 (있으면 포함)
  const terminatedStartIndex = pages.findIndex(p => p.type === 'TERMINATED_LIST');
  let terminatedPages = 0;
  
  if (terminatedStartIndex !== -1) {
    const terminatedStartPage = pages[terminatedStartIndex].pageNum;
    
    // 다음 섹션(진단현황) 찾기
    let terminatedEndPage = terminatedStartPage;
    for (let i = terminatedStartIndex + 1; i < pages.length; i++) {
      const pageType = pages[i].type;
      if (pageType === 'DIAGNOSIS') {
        terminatedEndPage = pages[i].pageNum - 1;
        break;
      }
      if (i === pages.length - 1) {
        terminatedEndPage = pages[i].pageNum;
      }
    }
    
    // 실제 실효/해지 범위 계산
    const actualTerminatedPages = terminatedEndPage - terminatedStartPage + 1;
    terminatedPages = Math.min(actualTerminatedPages, 2); // 최대 2페이지
    
    // 페이지 추가
    for (let p = terminatedStartPage; p < terminatedStartPage + terminatedPages; p++) {
      essentialPages.add(p);
    }
    
    console.log(`  📋 실효/해지: Page ${terminatedStartPage}${terminatedPages > 1 ? `-${terminatedStartPage + terminatedPages - 1}` : ''} (${terminatedPages}페이지)`);
  } else {
    console.log(`  ⚠️ 실효/해지 계약 없음 (스킵)`);
  }
  
  // 4. 진단 현황 (12p, 18p 등) - 항상 1페이지만
  const diagnosisStartIndex = pages.findIndex(p => p.type === 'DIAGNOSIS');
  if (diagnosisStartIndex !== -1) {
    const diagnosisStartPage = pages[diagnosisStartIndex].pageNum;
    
    // 진단 현황은 1페이지만 (31개 담보가 1페이지에 다 들어감)
    essentialPages.add(diagnosisStartPage);
    
    console.log(`  📋 진단 현황: Page ${diagnosisStartPage} (1페이지)`);
  }
  
  const sortedPages = Array.from(essentialPages).sort((a, b) => a - b);
  
  // 케이스 분류
  let caseDescription = '';
  if (terminatedPages === 0 && contractPages === 1) {
    caseDescription = '케이스 1: 해지 없음 + 계약 1p';
  } else if (terminatedPages > 0 && contractPages === 1 && terminatedPages === 1) {
    caseDescription = '케이스 2: 해지 있음 + 계약 1p + 해지 1p';
  } else if (contractPages === 2 && terminatedPages === 1) {
    caseDescription = '케이스 3: 계약 2p + 해지 1p';
  } else if (contractPages === 2 && terminatedPages === 2) {
    caseDescription = '케이스 4: 계약 2p + 해지 2p';
  } else {
    caseDescription = `기타: 계약 ${contractPages}p + 해지 ${terminatedPages}p`;
  }
  
  console.log(`✅ 필수 페이지 식별 완료: ${sortedPages.length}페이지 (${caseDescription})`);
  console.log(`  → ${sortedPages.join(', ')}`);
  
  return sortedPages;
}

/**
 * 필수 페이지만 추출하여 새 PDF 생성
 * @param {File} pdfFile - 원본 PDF 파일
 * @param {Array<number>} pageNumbers - 추출할 페이지 번호 배열
 * @returns {Promise<File>} 경량화된 PDF 파일
 */
export async function extractEssentialPages(pdfFile, pageNumbers) {
  console.log(`📦 ${pageNumbers.length}개 필수 페이지 추출 시작...`);
  
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    // 새 PDF 문서 생성
    const newPdfDoc = await PDFDocument.create();
    
    // 지정된 페이지만 복사 (0-based index로 변환)
    const pageIndices = pageNumbers.map(num => num - 1);
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
    
    // 복사한 페이지들을 새 문서에 추가
    copiedPages.forEach(page => newPdfDoc.addPage(page));
    
    // PDF 저장
    const pdfBytes = await newPdfDoc.save();
    
    // File 객체로 변환
    const extractedFile = new File(
      [pdfBytes], 
      pdfFile.name.replace('.pdf', '_essential.pdf'),
      { type: 'application/pdf' }
    );
    
    const originalSizeMB = (pdfFile.size / 1024 / 1024).toFixed(2);
    const extractedSizeMB = (extractedFile.size / 1024 / 1024).toFixed(2);
    const reductionPercent = (((pdfFile.size - extractedFile.size) / pdfFile.size) * 100).toFixed(1);
    
    console.log(`✅ 페이지 추출 완료:`);
    console.log(`  - 원본: ${originalSizeMB}MB`);
    console.log(`  - 추출: ${extractedSizeMB}MB`);
    console.log(`  - 감소: ${reductionPercent}%`);
    
    return extractedFile;
    
  } catch (error) {
    console.error('❌ 페이지 추출 실패:', error);
    throw new Error(`페이지 추출 실패: ${error.message}`);
  }
}

/**
 * 전체 프로세스: 분석 → 식별 → 추출
 * @param {File} pdfFile - 원본 PDF 파일
 * @returns {Promise<{extractedFile: File, stats: Object}>}
 */
export async function extractAndOptimizePDF(pdfFile) {
  console.log('🚀 PDF 최적화 시작...');
  const startTime = Date.now();
  
  // 1단계: 페이지 분석
  const pages = await analyzePDFPages(pdfFile);
  
  // 2단계: 필수 페이지 식별
  const essentialPages = identifyEssentialPages(pages);
  
  // 3단계: 페이지 추출
  const extractedFile = await extractEssentialPages(pdfFile, essentialPages);
  
  const duration = Date.now() - startTime;
  
  const stats = {
    originalSize: pdfFile.size,
    extractedSize: extractedFile.size,
    originalPages: pages.length,
    extractedPages: essentialPages.length,
    pageNumbers: essentialPages,
    reductionPercent: (((pdfFile.size - extractedFile.size) / pdfFile.size) * 100).toFixed(1),
    processingTime: duration
  };
  
  console.log(`✅ PDF 최적화 완료 (${duration}ms)`);
  console.log(`  - 원본: ${pages.length}페이지, ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  - 추출: ${essentialPages.length}페이지, ${(extractedFile.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  - 감소: ${stats.reductionPercent}%`);
  
  return {
    extractedFile,
    stats
  };
}

/**
 * 추출된 PDF가 너무 큰 경우 (>2MB) 2개로 분할
 * @param {File} pdfFile - 추출된 PDF 파일
 * @returns {Promise<Array<File>>} 분할된 PDF 파일 배열 [파일1, 파일2]
 */
export async function splitPDFIfNeeded(pdfFile, thresholdMB = 2) {
  const fileSizeMB = pdfFile.size / (1024 * 1024);
  
  if (fileSizeMB <= thresholdMB) {
    console.log(`✅ PDF 크기 OK (${fileSizeMB.toFixed(2)}MB ≤ ${thresholdMB}MB)`);
    return [pdfFile]; // 단일 파일 반환
  }
  
  console.log(`⚠️ PDF 크기 초과 (${fileSizeMB.toFixed(2)}MB > ${thresholdMB}MB), 2개로 분할...`);
  
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    // 중간 지점에서 분할
    const splitPoint = Math.ceil(totalPages / 2);
    
    // 첫 번째 파일 (1 ~ splitPoint)
    const pdfDoc1 = await PDFDocument.create();
    const pages1 = await pdfDoc1.copyPages(pdfDoc, Array.from({ length: splitPoint }, (_, i) => i));
    pages1.forEach(page => pdfDoc1.addPage(page));
    const pdfBytes1 = await pdfDoc1.save();
    const file1 = new File([pdfBytes1], pdfFile.name.replace('.pdf', '_part1.pdf'), { type: 'application/pdf' });
    
    // 두 번째 파일 (splitPoint+1 ~ totalPages)
    const pdfDoc2 = await PDFDocument.create();
    const pages2 = await pdfDoc2.copyPages(pdfDoc, Array.from({ length: totalPages - splitPoint }, (_, i) => i + splitPoint));
    pages2.forEach(page => pdfDoc2.addPage(page));
    const pdfBytes2 = await pdfDoc2.save();
    const file2 = new File([pdfBytes2], pdfFile.name.replace('.pdf', '_part2.pdf'), { type: 'application/pdf' });
    
    console.log(`✅ PDF 분할 완료:`);
    console.log(`  - Part 1: ${splitPoint}페이지, ${(file1.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  - Part 2: ${totalPages - splitPoint}페이지, ${(file2.size / 1024 / 1024).toFixed(2)}MB`);
    
    return [file1, file2];
    
  } catch (error) {
    console.error('❌ PDF 분할 실패:', error);
    throw new Error(`PDF 분할 실패: ${error.message}`);
  }
}
