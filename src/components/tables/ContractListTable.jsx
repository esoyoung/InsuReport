import React from 'react';

function ContractListTable({ data }) {
  const { contracts } = data;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
        <h2 className="text-xl font-bold text-white">전체 계약 리스트</h2>
        <p className="text-primary-100 text-sm mt-1">
          가입하신 모든 보험상품 상세 목록
        </p>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-primary-200">
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-16">
                No.
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                보험사
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                상품명
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                가입일
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                납입방식
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                납입기간
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                만기
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                월 보험료
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contracts.map((contract, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-sm text-center font-medium text-primary-700">
                  {contract.no}
                </td>
                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                  {contract.company}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">
                  <div className="max-w-md">
                    {contract.productName}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-center text-gray-700">
                  {formatDate(contract.startDate)}
                </td>
                <td className="px-4 py-4 text-sm text-center">
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                    {contract.paymentType}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-center text-gray-700">
                  {contract.paymentPeriod}
                </td>
                <td className="px-4 py-4 text-sm text-center text-gray-700">
                  {contract.maturityAge}
                </td>
                <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">
                  {contract.premium.toLocaleString()}
                  <span className="text-xs text-gray-500 ml-1">원</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary-50 font-semibold border-t-2 border-primary-200">
              <td colSpan="7" className="px-4 py-4 text-sm text-right text-gray-900">
                합계
              </td>
              <td className="px-4 py-4 text-sm text-right text-primary-700 font-bold">
                {contracts.reduce((sum, c) => sum + c.premium, 0).toLocaleString()}
                <span className="text-xs text-gray-600 ml-1">원</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 추가 정보 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-primary-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">안내사항</p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>• 만기는 보험 보장이 종료되는 시점입니다</li>
              <li>• 납입기간 종료 후에도 보장은 만기까지 지속됩니다</li>
              <li>• 실제 보험료는 각 상품의 갱신 여부에 따라 변동될 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD -> YYYY.MM.DD)
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return dateStr.replace(/-/g, '.');
}

export default ContractListTable;
