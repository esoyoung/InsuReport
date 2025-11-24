import React from 'react';

export default function ContractListTable({ data }) {
  const insuranceData = data;

  // 안전 장치 추가
  if (!insuranceData || !insuranceData.계약리스트) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-teal-700">전체 계약 리스트</h2>
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  const contracts = insuranceData.계약리스트 || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-teal-700">전체 계약 리스트</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">보험사</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">상품명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">가입일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">납입방법</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">납입기간</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">만기나이</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-teal-700 uppercase">월보험료</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                  계약 정보가 없습니다.
                </td>
              </tr>
            ) : (
              contracts.map((contract, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{contract.번호}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{contract.보험사}</td>
                  <td className="px-4 py-4 text-sm">{contract.상품명}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{contract.가입일}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{contract.납입방법}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{contract.납입기간}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{contract.만기나이}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                    {parseInt(contract.월보험료 || 0).toLocaleString()}원
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
