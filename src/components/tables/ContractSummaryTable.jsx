import React from 'react';

function ContractSummaryTable({ data }) {
  const { customerInfo, contracts } = data;
  
  const totalPremium = contracts.reduce((sum, c) => sum + c.premium, 0);
  const contractCount = contracts.length;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
        <h2 className="text-xl font-bold text-white">계약현황 요약</h2>
        <p className="text-primary-100 text-sm mt-1">
          {customerInfo.name}님의 전체 보험계약 개요
        </p>
      </div>

      {/* 요약 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">총 계약수</div>
          <div className="text-2xl font-bold text-primary-700">{contractCount}건</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">월 납입 보험료</div>
          <div className="text-2xl font-bold text-primary-700">
            {totalPremium.toLocaleString()}
            <span className="text-base font-normal text-gray-600 ml-1">원</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">나이 / 성별</div>
          <div className="text-2xl font-bold text-primary-700">
            {customerInfo.age}세
            <span className="text-base font-normal text-gray-600 ml-2">
              ({customerInfo.gender})
            </span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">분석 기준일</div>
          <div className="text-lg font-bold text-primary-700">
            {customerInfo.reportDate}
          </div>
        </div>
      </div>

      {/* 보험사별 통계 */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <span className="w-1 h-5 bg-primary-600 mr-3"></span>
          보험사별 계약 현황
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  보험사
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  계약건수
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  월 보험료
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  비중
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getCompanySummary(contracts).map((company, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {company.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-700">
                    {company.count}건
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {company.premium.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${company.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {company.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-primary-50 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900">합계</td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  {contractCount}건
                </td>
                <td className="px-4 py-3 text-sm text-right text-primary-700">
                  {totalPremium.toLocaleString()}원
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-900">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * 보험사별 집계
 */
function getCompanySummary(contracts) {
  const companyMap = new Map();
  
  contracts.forEach(contract => {
    const existing = companyMap.get(contract.company) || {
      name: contract.company,
      count: 0,
      premium: 0
    };
    
    existing.count += 1;
    existing.premium += contract.premium;
    
    companyMap.set(contract.company, existing);
  });
  
  const totalPremium = contracts.reduce((sum, c) => sum + c.premium, 0);
  
  return Array.from(companyMap.values())
    .map(company => ({
      ...company,
      percentage: Math.round((company.premium / totalPremium) * 100)
    }))
    .sort((a, b) => b.premium - a.premium);
}

export default ContractSummaryTable;
