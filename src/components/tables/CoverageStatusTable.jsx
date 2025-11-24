import React from 'react';
import { useInsuranceStore } from '../../store/insuranceStore';

export default function CoverageStatusTable() {
  const insuranceData = useInsuranceStore((state) => state.insuranceData);

  // 안전 장치 추가
  if (!insuranceData || !insuranceData.담보현황) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-teal-700">담보별 현황</h2>
        <p className="text-gray-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  const coverages = insuranceData.담보현황 || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-teal-700">담보별 현황</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">담보명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">상품명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">담보내역</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">보장금액</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">가입일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-teal-700 uppercase">만기일</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coverages.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                  담보 정보가 없습니다.
                </td>
              </tr>
            ) : (
              coverages.map((coverage, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">{coverage.담보명}</td>
                  <td className="px-4 py-4 text-sm">{coverage.상품명}</td>
                  <td className="px-4 py-4 text-sm">{coverage.담보내역}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{coverage.보장금액}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{coverage.가입일}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{coverage.만기일}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
