import { PDFDocument } from 'pdf-lib';

/**
 * PDF 파일을 압축
 * - 이미지 품질 저하 없이 메타데이터 제거 및 최적화
 * - Vercel 페이로드 제한(4.5MB)을 고려하여 3MB 이하로 압축 시도
 * 
 * @param {File} file - 원본 PDF 파일
 * @param {number} targetSizeMB - 목표 크기 (MB), 기본값 2.5MB
 * @returns {Promise<{compressed: boolean, originalSize: number, compressedSize: number, file: File}>}
 */
export async function compressPDF(file, targetSizeMB = 2.5) {
  try {
    const originalSizeBytes = file.size;
    const originalSizeMB = originalSizeBytes / (1024 * 1024);
    const targetSizeBytes = targetSizeMB * 1024 * 1024;

    console.log(`📄 원본 PDF 크기: ${originalSizeMB.toFixed(2)}MB`);

    // 이미 목표 크기 이하면 압축하지 않음
    if (originalSizeBytes <= targetSizeBytes) {
      console.log('✅ 압축 불필요 (이미 목표 크기 이하)');
      return {
        compressed: false,
        originalSize: originalSizeBytes,
        compressedSize: originalSizeBytes,
        file: file,
      };
    }

    console.log('🔄 PDF 압축 시작...');

    // PDF 로드
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    // 1단계: 메타데이터 제거
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');

    // 2단계: 압축 옵션으로 저장
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true, // 객체 스트림 사용 (압축률 향상)
      addDefaultPage: false,
      objectsPerTick: 50, // 처리 속도 향상
    });

    const compressedSizeBytes = compressedBytes.length;
    const compressedSizeMB = compressedSizeBytes / (1024 * 1024);
    const compressionRatio = ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes * 100).toFixed(1);

    console.log(`✅ 압축 완료: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (${compressionRatio}% 감소)`);

    // Blob에서 File 객체 생성
    const compressedFile = new File(
      [compressedBytes],
      file.name,
      { type: 'application/pdf' }
    );

    return {
      compressed: true,
      originalSize: originalSizeBytes,
      compressedSize: compressedSizeBytes,
      compressionRatio: parseFloat(compressionRatio),
      file: compressedFile,
    };

  } catch (error) {
    console.error('❌ PDF 압축 중 오류 발생:', error);
    
    // 압축 실패 시 원본 파일 반환
    return {
      compressed: false,
      originalSize: file.size,
      compressedSize: file.size,
      file: file,
      error: error.message,
    };
  }
}

/**
 * PDF 파일 크기가 제한을 초과하는지 확인
 * @param {File} file - PDF 파일
 * @param {number} maxSizeMB - 최대 크기 (MB)
 * @returns {boolean}
 */
export function isPDFTooLarge(file, maxSizeMB = 3) {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB > maxSizeMB;
}

/**
 * 파일 크기를 읽기 쉬운 문자열로 변환
 * @param {number} bytes - 바이트 크기
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
