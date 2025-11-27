/**
 * PDF 청크 추출기 (페이지 범위 기반 분할)
 * pdf-lib를 사용하여 지정된 페이지 범위만 추출
 */

import { PDFDocument } from 'pdf-lib';

/**
 * PDF에서 지정된 페이지 범위를 추출하여 새로운 PDF 생성
 * @param {ArrayBuffer} pdfArrayBuffer - 원본 PDF ArrayBuffer
 * @param {number} startPage - 시작 페이지 (1부터 시작)
 * @param {number} endPage - 종료 페이지 (포함)
 * @returns {Promise<Object>} { base64, arrayBuffer, pageRange, size, pageCount }
 */
export async function extractPDFChunk(pdfArrayBuffer, startPage, endPage) {
  console.log(`📄 PDF 청크 추출: Page ${startPage}-${endPage}`);
  
  try {
    // 원본 PDF 로드
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
    const totalPages = pdfDoc.getPageCount();
    
    // 페이지 범위 검증
    if (startPage < 1 || endPage > totalPages || startPage > endPage) {
      throw new Error(
        `잘못된 페이지 범위: ${startPage}-${endPage} (총 ${totalPages} 페이지)`
      );
    }
    
    // 새 PDF 문서 생성
    const newPdfDoc = await PDFDocument.create();
    
    // 지정된 페이지 범위 복사 (0-based index로 변환)
    const pageIndices = Array.from(
      { length: endPage - startPage + 1 }, 
      (_, i) => startPage - 1 + i
    );
    
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices);
    
    // 복사한 페이지들을 새 문서에 추가
    copiedPages.forEach(page => newPdfDoc.addPage(page));
    
    // PDF를 ArrayBuffer로 저장
    const pdfBytes = await newPdfDoc.save();
    const chunkArrayBuffer = pdfBytes.buffer;
    
    // Base64 변환
    const base64 = arrayBufferToBase64(chunkArrayBuffer);
    
    const result = {
      base64,
      arrayBuffer: chunkArrayBuffer,
      pageRange: `${startPage}-${endPage}`,
      size: chunkArrayBuffer.byteLength,
      sizeMB: (chunkArrayBuffer.byteLength / 1024 / 1024).toFixed(2),
      pageCount: endPage - startPage + 1
    };
    
    console.log(`  ✅ 청크 추출 완료: ${result.pageCount}페이지, ${result.sizeMB}MB`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ PDF 청크 추출 실패:`, error);
    throw new Error(`PDF 청크 추출 실패: ${error.message}`);
  }
}

/**
 * 여러 섹션을 한 번에 청크로 추출
 * @param {ArrayBuffer} pdfArrayBuffer - 원본 PDF ArrayBuffer
 * @param {Array} sections - 섹션 목록 [{ type, startPage, endPage }]
 * @returns {Promise<Array>} 청크 목록 [{ ...chunk, type, title }]
 */
export async function extractAllChunks(pdfArrayBuffer, sections) {
  console.log(`📦 ${sections.length}개 청크 추출 시작...`);
  
  const startTime = Date.now();
  
  // 병렬 추출
  const chunks = await Promise.all(
    sections.map(async (section) => {
      const chunk = await extractPDFChunk(
        pdfArrayBuffer, 
        section.startPage, 
        section.endPage
      );
      
      return {
        ...chunk,
        type: section.type,
        title: section.title
      };
    })
  );
  
  const duration = Date.now() - startTime;
  const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  
  console.log(`✅ 청크 추출 완료: ${chunks.length}개, 총 ${totalSizeMB}MB (${duration}ms)`);
  
  return chunks;
}

/**
 * ArrayBuffer를 Base64로 변환
 * @param {ArrayBuffer} buffer - 변환할 ArrayBuffer
 * @returns {string} Base64 문자열
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  // 청크 단위로 처리하여 메모리 효율성 향상
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
}

/**
 * 청크 크기 검증 (너무 크면 경고)
 * @param {Array} chunks - 청크 목록
 * @param {number} maxSizeMB - 최대 허용 크기 (MB)
 * @returns {Object} { valid, warnings }
 */
export function validateChunkSizes(chunks, maxSizeMB = 3) {
  const warnings = [];
  
  for (const chunk of chunks) {
    const sizeMB = parseFloat(chunk.sizeMB);
    
    if (sizeMB > maxSizeMB) {
      warnings.push({
        chunk: chunk.title,
        pageRange: chunk.pageRange,
        size: chunk.sizeMB,
        message: `청크 크기가 ${maxSizeMB}MB를 초과했습니다 (${chunk.sizeMB}MB)`
      });
    }
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠️ ${warnings.length}개 청크가 크기 제한을 초과했습니다:`);
    warnings.forEach(w => console.warn(`  - ${w.message}`));
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * 청크 통계 계산
 * @param {Array} chunks - 청크 목록
 * @returns {Object} 통계 정보
 */
export function calculateChunkStatistics(chunks) {
  const totalPages = chunks.reduce((sum, c) => sum + c.pageCount, 0);
  const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
  const avgPagesPerChunk = Math.round(totalPages / chunks.length);
  const avgSizePerChunk = (totalSize / chunks.length / 1024 / 1024).toFixed(2);
  
  return {
    totalChunks: chunks.length,
    totalPages,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    avgPagesPerChunk,
    avgSizeMB: avgSizePerChunk,
    chunks: chunks.map(c => ({
      title: c.title,
      type: c.type,
      pageRange: c.pageRange,
      pageCount: c.pageCount,
      sizeMB: c.sizeMB
    }))
  };
}
