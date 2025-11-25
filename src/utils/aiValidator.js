// Vercel Serverless Function 엔드포인트 (프로덕션에서는 자동으로 동일 도메인)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const USE_AI_VALIDATION = import.meta.env.VITE_USE_AI_VALIDATION === 'true';

/**
 * PDF를 Base64로 변환
 * @param {File} file - PDF 파일
 * @returns {Promise<string>} - Base64 인코딩된 문자열
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // "data:application/pdf;base64," 제거
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * Vercel Serverless Function을 통해 계약 리스트 검증
 * @param {File} pdfFile - 원본 PDF 파일
 * @param {Object} parsedData - 규칙 기반 파서가 추출한 데이터
 * @returns {Promise<Object>} - 검증/보정된 데이터
 */
export async function validateContractsWithAI(pdfFile, parsedData) {
  // AI 검증이 비활성화되어 있으면 원본 데이터 반환
  if (!USE_AI_VALIDATION) {
    console.log('ℹ️ AI 검증이 비활성화되어 있습니다. 규칙 기반 파싱 결과를 사용합니다.');
    return {
      validated: false,
      data: parsedData,
      message: 'AI validation disabled',
    };
  }

  try {
    // PDF 크기 체크 (Vercel 제한: 4.5MB, Base64는 +33% 증가)
    // 안전 마진을 위해 2.8MB로 제한 (Base64 인코딩 후 ~3.7MB)
    const maxFileSize = 2.8 * 1024 * 1024; // 2.8MB
    
    if (pdfFile.size > maxFileSize) {
      console.warn(`⚠️ PDF 크기가 너무 큽니다 (${(pdfFile.size / 1024 / 1024).toFixed(2)}MB > 2.8MB). AI 검증을 건너뜁니다.`);
      return {
        validated: false,
        data: parsedData,
        message: 'PDF too large for AI validation (> 2.8MB)',
        warning: `PDF 파일이 압축 후에도 너무 큽니다 (${(pdfFile.size / 1024 / 1024).toFixed(2)}MB). 규칙 기반 파싱 결과를 사용합니다.`,
      };
    }

    console.log('🤖 Vercel Serverless Function으로 AI 검증 요청...');
    console.log(`📄 PDF 크기: ${(pdfFile.size / 1024).toFixed(2)}KB`);

    // PDF를 Base64로 변환
    const pdfBase64 = await fileToBase64(pdfFile);

    // Vercel Serverless Function 호출
    const response = await fetch(`${API_BASE_URL}/api/validate-contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfBase64,
        parsedData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 오류: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ AI 검증 완료');
    
    if (result.수정사항?.length > 0) {
      console.log('📝 AI 수정 사항:', result.수정사항);
    }

    return {
      validated: true,
      data: {
        ...parsedData,
        계약리스트: result.계약리스트,
      },
      corrections: result.수정사항,
      totalPremium: result.총보험료,
      activePremium: result.활성월보험료,
    };
  } catch (error) {
    console.error('❌ AI 검증 중 오류 발생:', error);
    return {
      validated: false,
      data: parsedData,
      error: error.message,
      message: 'Validation failed, using rule-based result',
    };
  }
}

/**
 * AI 검증 가능 여부 확인
 * @returns {boolean}
 */
export function isAIValidationAvailable() {
  return USE_AI_VALIDATION;
}

/**
 * Vercel Serverless Function 헬스 체크 (선택적)
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  // Vercel 배포 환경에서는 헬스 체크가 필요 없음
  if (import.meta.env.PROD) {
    return true;
  }

  // 개발 환경에서만 체크
  try {
    const response = await fetch(`${API_BASE_URL}/api/validate-contracts`, {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch (error) {
    console.warn('⚠️ API 엔드포인트에 연결할 수 없습니다:', error.message);
    return false;
  }
}
