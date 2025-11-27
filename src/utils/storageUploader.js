/**
 * R2 스토리지를 사용한 대용량 PDF 업로드 (Cloudflare Pages Functions)
 */

/**
 * PDF 파일을 R2에 업로드
 * @param {File} file - PDF 파일
 * @returns {Promise<{fileKey: string, size: number}>}
 */
export async function uploadToR2(file) {
  try {
    console.log(`📤 R2 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `R2 업로드 실패: ${uploadResponse.status}`);
    }

    const { fileKey, size } = await uploadResponse.json();
    console.log(`✅ R2 업로드 완료: ${fileKey}`);

    return {
      fileKey,
      size: size || file.size,
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
 * @param {Object} options - 옵션 { parallel: boolean, fileSizeMB: number }
 * @returns {Promise<Object>}
 */
export async function validateContractsWithR2(fileKey, parsedData, options = {}) {
  try {
    const { parallel = false, fileSizeMB = 0 } = options;
    
    // 5MB 이상 PDF는 자동으로 병렬 모드 활성화
    const shouldUseParallel = parallel || (fileSizeMB >= 5);
    
    if (shouldUseParallel) {
      console.log(`🚀 병렬 AI 검증 요청 (${fileSizeMB.toFixed(2)}MB)`);
    } else {
      console.log('🤖 R2 기반 AI 검증 요청...');
    }

    const response = await fetch('/api/validate-contracts-r2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileKey,
        parsedData,
        parallel: shouldUseParallel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 오류: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // 메타데이터에서 처리 모드 확인
    const mode = result._metadata?.mode || 'single';
    const processingTime = result._metadata?.processingTime || 0;
    
    if (mode === 'parallel') {
      const { parallelChunks, successfulChunks } = result._metadata;
      console.log(`✅ 병렬 AI 검증 완료 (${processingTime}ms)`);
      console.log(`  📊 ${successfulChunks}/${parallelChunks}개 청크 성공`);
    } else {
      console.log(`✅ R2 기반 AI 검증 완료 (${processingTime}ms)`);
    }

    if (result.수정사항?.length > 0) {
      console.log('📝 AI 수정 사항:', result.수정사항);
    }

    return {
      validated: true,
      data: {
        ...parsedData,
        계약리스트: result.계약리스트,
        진단현황: result.진단현황 || parsedData.진단현황, // AI 검증된 진단현황 또는 원본 유지
        고객정보: result.고객정보 || parsedData.고객정보,
      },
      corrections: result.수정사항,
      totalPremium: result.총보험료,
      activePremium: result.활성월보험료,
      metadata: result._metadata, // 처리 통계 포함
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
    const response = await fetch('/api/upload-pdf', {
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
