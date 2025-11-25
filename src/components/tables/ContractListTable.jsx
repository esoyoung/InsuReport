import React from 'react';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const sanitizeNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
};

const DEFAULT_ROW_COUNT = 6;

const formatCompanyName = (rawName) => {
  if (!rawName) return ['-'];

  const normalized = String(rawName).replace(/\s+/g, '');
  if (!normalized) return ['-'];

  let base = normalized;
  let overflow = false;

  if (base.length > 8) {
    base = base.slice(0, 8);
    overflow = true;
  }

  if (base.length <= 5) {
    return [base];
  }

  const firstLine = base.slice(0, 5);
  let secondLine = base.slice(5);

  if (overflow) {
    secondLine = `${secondLine}…`;
  }

  return [firstLine, secondLine];
};

const getMonthlyPremiumDisplay = (value, hasContracts) => {
  if (!hasContracts) return '-';
  const numeric = sanitizeNumber(value);
  return numeric > 0 ? `${currencyFormatter.format(numeric)}원` : '0원';
};

export default function ContractListTable({ data }) {
  const insuranceData = data || {};
  const contractList = insuranceData.계약리스트 || [];
  const hasContracts = contractList.length > 0;
  const contracts = hasContracts
    ? contractList
    : Array.from({ length: DEFAULT_ROW_COUNT }, (_, index) => ({ __placeholder: true, 번호: index + 1 }));

  if (!insuranceData.고객정보 && !hasContracts) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-700">보유 계약 리스트</h2>
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const totalMonthlyPremium = contractList.reduce((sum, contract) => sum + sanitizeNumber(contract.월보험료), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-700">보유 계약 리스트</h2>
          <p className="text-sm text-gray-500">KB 보장분석 리포트의 보유 계약 리스트를 기반으로 정리했습니다.</p>
        </div>
        {hasContracts ? (
          <div className="rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary-700 border border-primary-100">
            월 보험료 합계 {currencyFormatter.format(totalMonthlyPremium)}원
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="w-12 px-3 py-2 text-center text-xs font-semibold text-primary-700">번호</th>
              <th scope="col" className="w-24 px-3 py-2 text-center text-xs font-semibold text-primary-700">보험사</th>
              <th scope="col" className="w-[28rem] px-3 py-2 text-left text-xs font-semibold text-primary-700">상품명</th>
              <th scope="col" className="w-28 px-3 py-2 text-center text-xs font-semibold text-primary-700">가입일</th>
              <th scope="col" className="w-20 px-3 py-2 text-center text-xs font-semibold text-primary-700">납입주기</th>
              <th scope="col" className="w-20 px-3 py-2 text-center text-xs font-semibold text-primary-700">납입기간</th>
              <th scope="col" className="w-20 px-3 py-2 text-center text-xs font-semibold text-primary-700">만기</th>
              <th scope="col" className="w-24 px-3 py-2 text-right text-xs font-semibold text-primary-700">월 보험료</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {contracts.map((contract, index) => {
              const premiumDisplay = getMonthlyPremiumDisplay(contract.월보험료, hasContracts);
              const payCycle = hasContracts ? (contract.납입주기 || contract.납입방법 || '-') : '-';
              const paymentPeriod = hasContracts ? (contract.납입기간 || '-') : '-';
              const maturity = hasContracts ? (contract.만기 || contract.만기나이 || '-') : '-';

              return (
                <tr key={`${contract.상품명 || 'contract'}-${index}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900 text-center align-top">{contract.번호 || index + 1}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-center align-top">
                    {hasContracts ? (
                      <div className="company-cell">
                        {formatCompanyName(contract.보험사).map((line, lineIdx) => (
                          <span key={lineIdx} className="company-cell-line">
                            {line}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 align-top">
                    {hasContracts ? (
                      <span className="product-cell two-line-clamp" title={contract.상품명 || ''}>
                        {contract.상품명 || '-'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-center align-top">
                    {hasContracts ? contract.가입일 || '-' : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-center align-top">
                    {payCycle}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-center align-top">
                    {paymentPeriod}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 text-center align-top">
                    {maturity}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-900 align-top">
                    {premiumDisplay}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {hasContracts ? (
            <tfoot>
              <tr className="bg-primary-50">
                <td colSpan={7} className="px-3 py-2 text-sm font-semibold text-primary-800 text-right">
                  월 보험료 합계
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-right text-primary-800">
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
