import React, { useCallback, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { parsePDF } from '../utils/pdfParser';
import { validateContractsWithAI, isAIValidationAvailable } from '../utils/aiValidator';
import { compressPDF, isPDFTooLarge, formatFileSize } from '../utils/pdfCompressor';

function FileUploader() {
  const { setLoading, setError, setParsedData, isLoading, error } = useInsuranceStore();
  const [validationStatus, setValidationStatus] = useState(null);

  const handleFileUpload = useCallback(async (event) => {
    let file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationStatus(null);

    try {
      // 0단계: PDF 압축 (필요한 경우)
      if (isPDFTooLarge(file, 3)) {
        console.log('📦 0단계: PDF 크기가 큽니다. 압축 시도...');
        setValidationStatus(`PDF 압축 중... (${formatFileSize(file.size)})`);
        
        const compressionResult = await compressPDF(file, 2.5);
        
        if (compressionResult.compressed) {
          console.log(`✅ 압축 완료: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.compressedSize)}`);
          file = compressionResult.file;
          setValidationStatus(
            `압축 완료 (${compressionResult.compressionRatio}% 감소)`
          );
        } else if (compressionResult.error) {
          console.warn('⚠️ 압축 실패, 원본 파일 사용:', compressionResult.error);
        }
      }

      // 1단계: 규칙 기반 파싱
      console.log('📄 1단계: 규칙 기반 PDF 파싱 시작...');
      setValidationStatus('PDF 분석 중...');
      const data = await parsePDF(file);
      console.log('✅ 규칙 기반 파싱 완료');

      // 2단계: AI 검증 (활성화된 경우)
      if (isAIValidationAvailable()) {
        console.log('🤖 2단계: AI 검증 시작...');
        setValidationStatus('AI 검증 중...');
        
        const validationResult = await validateContractsWithAI(file, data);
        
        if (validationResult.validated) {
          console.log('✅ AI 검증 완료');
          setValidationStatus(
            `AI 검증 완료: ${validationResult.corrections?.length || 0}건 수정`
          );
          
          // 수정 사항 로그
          if (validationResult.corrections?.length > 0) {
            console.log('📝 AI 수정 사항:', validationResult.corrections);
          }
          
          // AI가 검증한 데이터 사용
          setParsedData(validationResult.data);
        } else {
          // 경고 메시지 처리
          if (validationResult.warning) {
            console.warn('⚠️', validationResult.warning);
            setValidationStatus(validationResult.warning);
          } else {
            console.warn('⚠️ AI 검증 실패, 규칙 기반 결과 사용');
            setValidationStatus('AI 검증 실패 (규칙 기반 결과 사용)');
          }
          setParsedData(data);
        }
      } else {
        console.log('ℹ️ AI 검증 비활성화, 규칙 기반 결과 사용');
        setParsedData(data);
      }
    } catch (err) {
      setError(`파일 파싱 중 오류가 발생했습니다: ${err.message}`);
      console.error('PDF 파싱 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setParsedData]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      };
      handleFileUpload(fakeEvent);
    }
  }, [handleFileUpload]);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {/* 아이콘 */}
          <div className="mx-auto h-24 w-24 text-primary-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            KB 보장분석 PDF 업로드
          </h2>
          <p className="text-gray-600 mb-6">
            파일을 드래그 앤 드롭하거나 클릭하여 선택하세요
          </p>

          {/* 파일 입력 */}
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm">
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  분석 중...
                </>
              ) : (
                <>
                  📄 파일 선택
                </>
              )}
            </span>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </label>

          <p className="text-xs text-gray-500 mt-4">
            지원 형식: PDF (최대 50MB)
          </p>

          {/* 검증 상태 메시지 */}
          {validationStatus && !error && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">🤖 {validationStatus}</p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">⚠️ {error}</p>
            </div>
          )}

          {/* 사용 가이드 */}
          <div className="mt-8 text-left bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-primary-600 mr-2">💡</span>
              사용 가이드
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">1.</span>
                <span>KB 보장분석 PDF 파일을 준비합니다</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">2.</span>
                <span>파일을 업로드하면 자동으로 데이터를 분석합니다</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">3.</span>
                <span>생성된 리포트를 확인하고 인쇄할 수 있습니다</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FileUploader;
