// 백엔드 API 엔드포인트
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USE_AI_VALIDATION = import.meta.env.VITE_USE_AI_VALIDATION !== 'false'; // 기본값 true

/**
 * 백엔드 API를 통해 계약 리스트 검증
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
    console.log('🤖 백엔드 API로 AI 검증 요청...');

    // FormData 생성
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('parsedData', JSON.stringify(parsedData));

    // 백엔드 API 호출
    const response = await fetch(`${API_BASE_URL}/api/validate-contracts`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('✅ AI 검증 완료');
    
    if (result.corrections?.length > 0) {
      console.log('📝 AI 수정 사항:', result.corrections);
    }

    return result;
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
 * 백엔드 헬스 체크
 * @returns {Promise<boolean>}
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    return data.status === 'ok' && data.geminiConfigured;
  } catch (error) {
    console.warn('⚠️ 백엔드 서버에 연결할 수 없습니다:', error.message);
    return false;
  }
}
