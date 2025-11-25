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

const parseDateValue = (value) => {
  if (!value) return 0;
  const normalized = String(value).replace(/[.]/g, '-');
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const DEFAULT_ROW_COUNT = 6;

const hasMeaningfulText = (value) => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

const formatCompanyLines = (rawName) => {
  if (!hasMeaningfulText(rawName)) {
    return ['—'];
  }

  const normalized = String(rawName).replace(/\s+/g, '');
  if (!normalized) return ['—'];

  let truncated = normalized;
  if (truncated.length > 8) {
    truncated = `${truncated.slice(0, 7)}…`;
  }

  if (truncated.length <= 4) {
    return [truncated];
  }

  const breakIndex = truncated.length > 6 ? 4 : Math.ceil(truncated.length / 2);
  const firstLine = truncated.slice(0, breakIndex);
  const secondLine = truncated.slice(breakIndex);

  return secondLine ? [firstLine, secondLine] : [firstLine];
};

const formatProductLines = (rawName) => {
  if (!hasMeaningfulText(rawName)) return ['—'];

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

const formatContractDateLines = (date, rate) => {
  const normalizedDate = hasMeaningfulText(date) ? String(date).replace(/[.]/g, '-') : '—';
  let normalizedRate = hasMeaningfulText(rate) ? String(rate).trim() : '';

  if (normalizedRate && !/%$/.test(normalizedRate)) {
    normalizedRate = `${normalizedRate}%`;
  }

  if (!normalizedRate) {
    return [normalizedDate];
  }

  return [normalizedDate, normalizedRate];
};

const getMonthlyPremiumDisplay = (value, hasContracts) => {
  if (!hasContracts) return '—';
  const numeric = sanitizeNumber(value);
  return numeric > 0 ? `${currencyFormatter.format(numeric)}원` : '0원';
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

export default function ContractListTable({ data }) {
  const insuranceData = data || {};
  const contractList = insuranceData.계약리스트 || [];
  const hasContracts = contractList.length > 0;

  const sortedContracts = hasContracts
    ? [...contractList].sort((a, b) => {
        const dateB = parseDateValue(b?.계약일 || b?.가입일);
        const dateA = parseDateValue(a?.계약일 || a?.가입일);

        if (dateB !== dateA) return dateB - dateA;

        const numberB = Number.isFinite(Number(b?.번호)) ? Number(b.번호) : 0;
        const numberA = Number.isFinite(Number(a?.번호)) ? Number(a.번호) : 0;

        return numberA - numberB;
      })
    : [];

  const contracts = hasContracts
    ? sortedContracts
    : Array.from({ length: DEFAULT_ROW_COUNT }, (_, index) => ({
        __placeholder: true,
        번호: index + 1,
      }));

  if (!insuranceData.고객정보 && !hasContracts) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-700">보유 계약 리스트</h2>
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const totalMonthlyPremium = contractList.reduce(
    (sum, contract) => sum + sanitizeNumber(contract.월보험료),
    0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">보유 계약 리스트</h2>
          <p className="text-xs text-gray-500 mt-1">
            KB 보장분석 리포트의 보유 계약 리스트를 기반으로 정리했습니다.
          </p>
        </div>
        {hasContracts ? (
          <div className="rounded-lg bg-primary-50 px-4 py-2 border border-primary-100">
            <span className="text-sm text-primary-700">월 보험료 합계 </span>
            <span className="premium-total-value">{currencyFormatter.format(totalMonthlyPremium)}원</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="report-table table-fixed min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ width: '3rem' }}>
                번호
              </th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ width: '6rem' }}>
                보험사
              </th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ minWidth: '28rem' }}>
                상품명
              </th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ width: '4.75rem' }}>
                계약일
              </th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ width: '3rem' }}>
                납입주기
              </th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ width: '3rem' }}>
                납입기간
              </th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold" style={{ width: '3rem' }}>
                만기
              </th>
              <th scope="col" className="px-2 text-right text-primary-700 font-semibold" style={{ width: '6.5rem' }}>
                월 보험료
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {contracts.map((contract, index) => {
              const displayNumber = hasContracts ? index + 1 : contract.번호 || index + 1;
              const premiumDisplay = getMonthlyPremiumDisplay(contract.월보험료, hasContracts);
              const payCycle = hasContracts ? (contract.납입주기 || contract.납입방법 || '-') : '—';
              const paymentPeriod = hasContracts ? (contract.납입기간 || '-') : '—';
              const maturity = hasContracts ? (contract.만기 || contract.만기나이 || '-') : '—';
              const contractDate = hasContracts ? (contract.계약일 || contract.가입일 || '—') : '—';
              const rawRate = hasContracts
                ? contract.가입당시금리 ||
                  contract.공시이율 ||
                  contract.적용이율 ||
                  contract.이율 ||
                  contract.금리 ||
                  ''
                : '';
              const dateLines = formatContractDateLines(contractDate, rawRate);
              const companyLines = hasContracts ? formatCompanyLines(contract.보험사) : ['—'];
              const productLines = hasContracts ? formatProductLines(contract.상품명) : ['—'];

              return (
                <tr key={`${contract.상품명 || 'contract'}-${index}`} className="hover:bg-gray-50 align-top">
                  <td className="px-2 text-gray-900">
                    {renderCellContent(displayNumber, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-700">
                    {renderCellContent(companyLines, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-700">
                    {renderCellContent(productLines, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-700">
                    {renderCellContent(dateLines, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-700">
                    {renderCellContent(payCycle, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-700">
                    {renderCellContent(paymentPeriod, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-700">
                    {renderCellContent(maturity, { align: 'center' })}
                  </td>
                  <td className="px-2 text-gray-900">
                    {renderCellContent(premiumDisplay, { align: 'right' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {hasContracts ? (
            <tfoot>
              <tr className="bg-primary-50">
                <td colSpan={7} className="px-2 text-primary-800 font-semibold text-right">
                  월 보험료 합계
                </td>
                <td className="px-2 text-primary-800 font-semibold text-right">
                  {currencyFormatter.format(totalMonthlyPremium)}원
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>※ 금액은 원화(₩) 기준으로 표기되며, 보험료 변동이 있을 경우 실제 청구액과 상이할 수 있습니다.</p>
        <p>※ 납입주기/납입기간/만기 정보가 리포트에 표시되지 않은 경우 '-'로 표기됩니다.</p>
      </div>
    </div>
  );
}
