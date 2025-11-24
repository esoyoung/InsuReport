import React from 'react';

function CoverageStatusTable({ data }) {
  const { coverages } = data;

  // 카테고리별로 그룹화
  const groupedCoverages = groupByCategory(coverages);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
        <h2 className="text-xl font-bold text-white">담보별 현황</h2>
        <p className="text-primary-100 text-sm mt-1">
          보장항목별 가입금액 상세 내역
        </p>
      </div>

      {/* 카테고리별 섹션 */}
      <div className="divide-y divide-gray-200">
        {Object.entries(groupedCoverages).map(([category, items], catIndex) => (
          <div key={catIndex} className="p-6">
            {/* 카테고리 헤더 */}
            <div className="flex items-center mb-4">
              <div className="w-1 h-6 bg-primary-600 mr-3"></div>
              <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              <span className="ml-3 px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                {items.length}개 항목
              </span>
            </div>

            {/* 담보 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      담보명
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-32">
                      현재 보장
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 w-32">
                      권장 보장
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">
                      충족률
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const percentage = item.recommended > 0 
                      ? Math.round((item.current / item.recommended) * 100)
                      : 100;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {item.current > 0 ? (
                            <>
                              {formatAmount(item.current)}
                              <span className="text-xs text-gray-500 ml-1">만원</span>
                            </>
                          ) : (
                            <span className="text-gray-400">미가입</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                          {item.recommended > 0 ? (
                            <>
                              {formatAmount(item.recommended)}
                              <span className="text-xs text-gray-500 ml-1">만원</span>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${getPercentageColor(percentage)}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-medium ${getPercentageTextColor(percentage)}`}>
                              {percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-700">부족 (70% 미만)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-700">보통 (70-99%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-700">충분 (100% 이상)</span>
            </div>
          </div>
          <span className="text-gray-500">※ 금액 단위: 만원</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 카테고리별 그룹화
 */
function groupByCategory(coverages) {
  const grouped = {};
  
  coverages.forEach(coverage => {
    if (!grouped[coverage.category]) {
      grouped[coverage.category] = [];
    }
    grouped[coverage.category].push(coverage);
  });
  
  return grouped;
}

/**
 * 금액 포맷팅 (만원 단위)
 */
function formatAmount(amount) {
  if (amount >= 10000) {
    const eok = Math.floor(amount / 10000);
    const man = amount % 10000;
    return man > 0 ? `${eok}억 ${man.toLocaleString()}` : `${eok}억`;
  }
  return amount.toLocaleString();
}

/**
 * 충족률에 따른 색상
 */
function getPercentageColor(percentage) {
  if (percentage < 70) return 'bg-red-500';
  if (percentage < 100) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * 충족률 텍스트 색상
 */
function getPercentageTextColor(percentage) {
  if (percentage < 70) return 'text-red-700';
  if (percentage < 100) return 'text-yellow-700';
  return 'text-green-700';
}

export default CoverageStatusTable;
