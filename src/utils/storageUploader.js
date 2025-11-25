/**
 * R2 스토리지를 사용한 대용량 PDF 업로드
 * Vercel 4.5MB 페이로드 제한을 회피하기 위해 클라이언트에서 R2로 직접 업로드
 */

/**
 * PDF 파일을 R2에 업로드
 * @param {File} file - PDF 파일
 * @returns {Promise<{fileKey: string, size: number}>}
 */
export async function uploadToR2(file) {
  try {
    console.log(`📤 R2 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // 1단계: Pre-signed URL 요청
    const urlResponse = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
      }),
    });

    if (!urlResponse.ok) {
      const errorData = await urlResponse.json();
      throw new Error(errorData.error || `Pre-signed URL 생성 실패: ${urlResponse.status}`);
    }

    const { uploadUrl, fileKey, expiresIn } = await urlResponse.json();
    console.log(`✅ Pre-signed URL 생성 완료: ${fileKey}`);

    // 2단계: R2에 직접 업로드
    console.log('📤 R2에 파일 업로드 중...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`R2 업로드 실패: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    console.log(`✅ R2 업로드 완료: ${fileKey}`);

    return {
      fileKey,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('❌ R2 업로드 중 오류:', error);
    throw error;
  }
}

/**
 * R2에 저장된 PDF로 AI 검증 수행
 * @param {string} fileKey - R2 파일 키
 * @param {Object} parsedData - 규칙 기반 파싱 결과
 * @returns {Promise<Object>}
 */
export async function validateContractsWithR2(fileKey, parsedData) {
  try {
    console.log('🤖 R2 기반 AI 검증 요청...');

    const response = await fetch('/api/validate-contracts-r2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileKey,
        parsedData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 오류: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ R2 기반 AI 검증 완료');
    
    if (result.수정사항?.length > 0) {
      console.log('📝 AI 수정 사항:', result.수정사항);
    }

    return {
      validated: true,
      data: {
        ...parsedData,
        계약리스트: result.계약리스트,
        진단현황: result.진단현황 || parsedData.진단현황, // AI 검증된 진단현황 또는 원본 유지
      },
      corrections: result.수정사항,
      totalPremium: result.총보험료,
      activePremium: result.활성월보험료,
    };

  } catch (error) {
    console.error('❌ R2 기반 AI 검증 중 오류 발생:', error);
    throw error;
  }
}

/**
 * R2 스토리지가 설정되어 있는지 확인
 * @returns {Promise<boolean>}
 */
export async function isR2Available() {
  try {
    // Health check용 더미 요청
    const response = await fetch('/api/get-upload-url', {
      method: 'OPTIONS',
    });
    return response.ok;
  } catch (error) {
    console.warn('⚠️ R2 스토리지가 설정되지 않았습니다:', error.message);
    return false;
  }
}

/**
 * PDF 크기에 따라 R2 사용 여부 결정
 * @param {File} file - PDF 파일
 * @param {number} thresholdMB - R2 사용 임계값 (MB)
 * @returns {boolean}
 */
export function shouldUseR2(file, thresholdMB = 2.8) {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB > thresholdMB;
}
