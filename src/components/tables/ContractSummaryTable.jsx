import React from 'react';

export default function ContractSummary({ data }) {
  const insuranceData = data;

  // 안전 장치 추가
  if (!insuranceData || !insuranceData.고객정보) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-teal-700">계약현황 요약</h2>
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  const { 고객정보 } = insuranceData;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6 text-teal-700">계약현황 요약</h2>
      
      {/* 4열 그리드 레이아웃 */}
      <div className="contract-summary-grid">
        {/* 이름 */}
        <div className="contract-summary-item">
          <p className="contract-summary-label text-gray-600 text-sm mb-1">이름</p>
          <p className="contract-summary-value text-lg font-semibold text-gray-900">
            {고객정보.이름 || '-'}
          </p>
        </div>
        
        {/* 나이/성별 */}
        <div className="contract-summary-item">
          <p className="contract-summary-label text-gray-600 text-sm mb-1">나이 / 성별</p>
          <p className="contract-summary-value text-lg font-semibold text-gray-900">
            {고객정보.나이 || '-'}세 / {고객정보.성별 || '-'}
          </p>
        </div>
        
        {/* 계약 수 */}
        <div className="contract-summary-item">
          <p className="contract-summary-label text-gray-600 text-sm mb-1">계약 수</p>
          <p className="contract-summary-value text-lg font-semibold text-gray-900">
            {고객정보.계약수 || 0}개
          </p>
        </div>
        
        {/* 월 보험료 */}
        <div className="contract-summary-item">
          <p className="contract-summary-label text-gray-600 text-sm mb-1">월 보험료</p>
          <p className="contract-summary-value text-lg font-semibold text-gray-900">
            {(고객정보.월보험료 || 0).toLocaleString()}원
          </p>
        </div>
      </div>
    </div>
  );
}
