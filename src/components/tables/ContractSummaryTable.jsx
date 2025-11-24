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
      <h2 className="text-xl font-bold mb-4 text-teal-700">계약현황 요약</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">이름</p>
          <p className="text-lg font-semibold">{고객정보.이름 || '-'}</p>
        </div>
        <div>
          <p className="text-gray-600">나이/성별</p>
          <p className="text-lg font-semibold">
            {고객정보.나이 || '-'}세 / {고객정보.성별 || '-'}
          </p>
        </div>
        <div>
          <p className="text-gray-600">계약 수</p>
          <p className="text-lg font-semibold">{고객정보.계약수 || 0}개</p>
        </div>
        <div>
          <p className="text-gray-600">월 보험료</p>
          <p className="text-lg font-semibold">
            {(고객정보.월보험료 || 0).toLocaleString()}원
          </p>
        </div>
      </div>
    </div>
  );
}
