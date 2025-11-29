import React from 'react';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const sanitizeNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
};

const hasMeaningfulText = (value) => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

const renderCellContent = (content, { align = 'left', fallback = '—' } = {}) => {
  const rawLines = Array.isArray(content)
    ? content
    : hasMeaningfulText(content)
      ? [content]
      : [fallback];

  const normalizedLines = rawLines
    .flatMap((line) => {
      if (line === null || line === undefined) return [fallback];
      return String(line)
        .split('\n')
        .map((part) => (hasMeaningfulText(part) ? part.trim() : fallback));
    })
    .filter((line) => line !== '');

  const effectiveLines =
    normalizedLines.length > 0 ? normalizedLines.slice(0, 2) : [fallback];

  const hasMultiline = effectiveLines.length > 1;

  return (
    <div
      className={classNames(
        'cell-content',
        hasMultiline ? 'multiline' : 'single-line',
        align === 'center' && 'center',
        align === 'right' && 'right'
      )}
    >
      {effectiveLines.map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </div>
  );
};

export default function TerminatedContractsTable({ data }) {
  const insuranceData = data || {};
  
  // 🔍 디버그: 전체 데이터 구조 확인
  console.log('📦 TerminatedContractsTable - 전체 데이터:', insuranceData);
  console.log('📦 실효해지계약 키 존재?:', '실효해지계약' in insuranceData);
  console.log('📦 모든 키 목록:', Object.keys(insuranceData));
  
  const terminatedList = insuranceData.실효해지계약 || [];
  console.log('📦 추출된 실효해지계약:', terminatedList);
  console.log('📦 배열 길이:', terminatedList.length);
  
  const hasContracts = terminatedList.length > 0;

  if (!insuranceData.고객정보 && !hasContracts) {
    return null; // 데이터 없으면 렌더링하지 않음
  }

  // 실효/해지 계약이 없으면 안내 메시지 표시
  if (!hasContracts) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">실효/해지계약현황</h2>
          <p className="text-xs text-gray-500 mt-1">
            현재 실효 또는 해지된 계약 목록입니다.
          </p>
        </div>
        <div className="mt-4 p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">✅ 실효/해지된 계약이 없습니다.</p>
          <p className="text-xs text-gray-500 mt-2">모든 계약이 정상적으로 유지되고 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">실효/해지계약현황</h2>
        <p className="text-xs text-gray-500 mt-1">
          현재 실효 또는 해지된 계약 목록입니다.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="report-table table-fixed min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="px-1 py-2 text-center text-primary-700 font-semibold align-middle" style={{ width: '3rem' }}>
                번호
              </th>
              <th scope="col" className="px-1 py-2 text-left text-primary-700 font-semibold align-middle" style={{ width: '6rem' }}>
                회사명
              </th>
              <th scope="col" className="px-1 py-2 text-left text-primary-700 font-semibold align-middle" style={{ minWidth: '20rem' }}>
                상품명
              </th>
              <th scope="col" className="px-1 py-2 text-center text-primary-700 font-semibold align-middle" style={{ width: '4.75rem' }}>
                계약일
              </th>
              <th scope="col" className="px-1 py-2 text-center text-primary-700 font-semibold align-middle" style={{ width: '3rem' }}>
                납입주기
              </th>
              <th scope="col" className="px-1 py-2 text-center text-primary-700 font-semibold align-middle" style={{ width: '3rem' }}>
                납입기간
              </th>
              <th scope="col" className="px-1 py-2 text-center text-primary-700 font-semibold align-middle" style={{ width: '3rem' }}>
                만기
              </th>
              <th scope="col" className="px-1 py-2 text-right text-primary-700 font-semibold align-middle" style={{ width: '7rem' }}>
                월 보험료
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {terminatedList.map((contract, index) => {
              const rowNumber = contract.번호 || (index + 1);
              const company = contract.회사명 || contract.보험사 || '—';
              const product = contract.상품명 || '—';
              const contractDate = contract.계약일 || contract.가입일 || '—';
              const payCycle = contract.납입주기 || contract.납입방법 || '—';
              const paymentPeriod = contract.납입기간 || '—';
              const maturity = contract.만기 || contract.만기나이 || '—';
              const premium = contract.월보험료 
                ? `${currencyFormatter.format(sanitizeNumber(contract.월보험료))}원`
                : '—';

              // Format company name (same as ContractListTable)
              const formatCompanyLines = (rawName) => {
                if (!rawName || rawName === '—') return ['—'];
                const normalized = String(rawName).replace(/\s+/g, '');
                if (!normalized) return ['—'];
                let truncated = normalized;
                if (truncated.length > 8) {
                  truncated = `${truncated.slice(0, 8)}…`;
                }
                return [truncated];
              };

              // Format product name (same as ContractListTable)
              const formatProductLines = (rawName) => {
                if (!rawName || rawName === '—') return ['—'];
                const trimmed = String(rawName).trim();
                if (trimmed.length <= 28) {
                  return [trimmed];
                }
                const firstBreakCandidate = trimmed.lastIndexOf(' ', 28);
                const breakIndex = firstBreakCandidate > 12 ? firstBreakCandidate : 28;
                const firstLine = trimmed.slice(0, breakIndex).trim();
                let secondLine = trimmed.slice(firstLine.length).trim();
                if (secondLine.length > 32) {
                  secondLine = `${secondLine.slice(0, 31).trim()}…`;
                }
                return secondLine ? [firstLine, secondLine] : [firstLine];
              };

              const companyLines = formatCompanyLines(company);
              const productLines = formatProductLines(product);

              return (
                <tr key={`terminated-${index}`} className="hover:bg-gray-50 align-middle">
                  <td className="px-1 py-2 text-gray-700 align-middle text-center">
                    {rowNumber}
                  </td>
                  <td className="px-1 py-2 text-gray-700 align-middle">
                    {renderCellContent(companyLines, { align: 'left' })}
                  </td>
                  <td className="px-1 py-2 text-gray-700 align-middle">
                    {renderCellContent(productLines, { align: 'left' })}
                  </td>
                  <td className="px-1 py-2 text-gray-700 align-middle">
                    {renderCellContent(contractDate, { align: 'center' })}
                  </td>
                  <td className="px-1 py-2 text-gray-700 align-middle">
                    {renderCellContent(payCycle, { align: 'center' })}
                  </td>
                  <td className="px-1 py-2 text-gray-700 align-middle">
                    {renderCellContent(paymentPeriod, { align: 'center' })}
                  </td>
                  <td className="px-1 py-2 text-gray-700 align-middle">
                    {renderCellContent(maturity, { align: 'center' })}
                  </td>
                  <td className="px-1 py-2 text-gray-900 align-middle">
                    {renderCellContent(premium, { align: 'right' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>※ 실효/해지된 계약은 현재 보장이 적용되지 않습니다.</p>
      </div>
    </div>
  );
}
