import React from 'react';

function DiagnosisTable({ data }) {
  const { diagnosis, coverages } = data;

  // diagnosis가 비어있으면 coverages에서 생성
  const diagnosisData = diagnosis.length > 0 ? diagnosis : generateDiagnosisFromCoverages(coverages);

  // 상태별 통계
  const stats = calculateStats(diagnosisData);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4">
        <h2 className="text-xl font-bold text-white">담보별 진단현황</h2>
        <p className="text-primary-100 text-sm mt-1">
          현재 보장 대비 부족/충분 진단 결과
        </p>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
        <div className="bg-white p-4 rounded-lg border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">부족</span>
            <span className="text-2xl font-bold text-red-600">{stats.insufficient}</span>
          </div>
          <div className="w-full bg-red-100 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full"
              style={{ width: `${(stats.insufficient / stats.total) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">미가입</span>
            <span className="text-2xl font-bold text-gray-600">{stats.notEnrolled}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className="bg-gray-400 h-2 rounded-full"
              style={{ width: `${(stats.notEnrolled / stats.total) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">충분</span>
            <span className="text-2xl font-bold text-green-600">{stats.sufficient}</span>
          </div>
          <div className="w-full bg-green-100 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(stats.sufficient / stats.total) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 진단 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-primary-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-16">
                No.
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                담보명
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                현재 보장
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                차액
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 w-32">
                진단
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {diagnosisData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-center font-medium text-gray-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {item.coverageName}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-700">
                  {item.current > 0 ? (
                    <>
                      {formatAmount(item.current)}
                      <span className="text-xs text-gray-500 ml-1">만원</span>
                    </>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium">
                  {item.difference > 0 ? (
                    <span className={item.status === '충분' ? 'text-green-600' : 'text-red-600'}>
                      {item.status === '충분' ? '+' : '-'}{formatAmount(item.difference)}
                      <span className="text-xs ml-1">만원</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(item.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 주의사항 */}
      <div className="px-6 py-4 bg-red-50 border-t border-red-100">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-red-900 mb-2">⚠️ 중요 확인사항</p>
            <ul className="space-y-1 text-xs text-red-800">
              <li>• <strong>부족</strong> 항목은 권장 보장금액에 미치지 못하는 담보입니다</li>
              <li>• <strong>미가입</strong> 항목은 현재 가입되지 않은 담보로, 추가 가입 검토가 필요합니다</li>
              <li>• 연령, 건강상태, 가족력 등을 고려하여 우선순위를 결정하시기 바랍니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * coverages에서 diagnosis 데이터 생성
 */
function generateDiagnosisFromCoverages(coverages) {
  return coverages.map(coverage => {
    let status = '충분';
    let difference = 0;

    if (coverage.current === 0) {
      status = '미가입';
      difference = coverage.recommended;
    } else if (coverage.current < coverage.recommended) {
      status = '부족';
      difference = coverage.recommended - coverage.current;
    } else if (coverage.current > coverage.recommended) {
      status = '충분';
      difference = coverage.current - coverage.recommended;
    }

    return {
      coverageName: coverage.name,
      current: coverage.current,
      difference,
      status
    };
  });
}

/**
 * 통계 계산
 */
function calculateStats(diagnosisData) {
  return {
    total: diagnosisData.length,
    insufficient: diagnosisData.filter(d => d.status === '부족').length,
    notEnrolled: diagnosisData.filter(d => d.status === '미가입').length,
    sufficient: diagnosisData.filter(d => d.status === '충분').length,
  };
}

/**
 * 금액 포맷팅
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
 * 상태 뱃지
 */
function getStatusBadge(status) {
  const styles = {
    '부족': 'bg-red-100 text-red-700 border-red-200',
    '미가입': 'bg-gray-100 text-gray-700 border-gray-200',
    '충분': 'bg-green-100 text-green-700 border-green-200',
  };

  const icons = {
    '부족': '⚠️',
    '미가입': '⊗',
    '충분': '✓',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles['충분']}`}>
      <span className="mr-1">{icons[status]}</span>
      {status}
    </span>
  );
}

export default DiagnosisTable;
