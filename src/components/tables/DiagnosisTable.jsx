import React from 'react';

export default function DiagnosisTable({ data }) {
  const insuranceData = data;

  // 안전 장치 추가
  if (!insuranceData || !insuranceData.진단현황) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-teal-700">담보별 진단현황</h2>
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  const diagnoses = insuranceData.진단현황 || [];

  // 상태별 CSS 클래스
  const getStatusClass = (status) => {
    switch (status) {
      case '충분': return 'status-badge status-충분';
      case '부족': return 'status-badge status-부족';
      case '미가입': return 'status-badge status-미가입';
      default: return 'status-badge status-미가입';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-teal-700">담보별 진단현황</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold text-teal-700">담보명</th>
              <th className="px-3 py-2 text-right text-xs font-bold text-teal-700">권장금액</th>
              <th className="px-3 py-2 text-right text-xs font-bold text-teal-700">가입금액</th>
              <th className="px-3 py-2 text-right text-xs font-bold text-teal-700">부족금액</th>
              <th className="px-3 py-2 text-center text-xs font-bold text-teal-700">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diagnoses.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-3 py-3 text-center text-gray-500 text-sm">
                  진단 정보가 없습니다.
                </td>
              </tr>
            ) : (
              diagnoses.map((diagnosis, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                    {diagnosis.담보명}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    {diagnosis.권장금액}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    {diagnosis.가입금액}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    {diagnosis.부족금액}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={getStatusClass(diagnosis.상태)}>
                      {diagnosis.상태}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
