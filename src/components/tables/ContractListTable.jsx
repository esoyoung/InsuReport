import React from 'react';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const sanitizeNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
};

const DEFAULT_ROW_COUNT = 6;

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
        <h2 className="text-xl font-semibold mb-4 text-primary-700">전체 계약 리스트</h2>
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const totalMonthlyPremium = contractList.reduce((sum, contract) => sum + sanitizeNumber(contract.월보험료), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-700">전체 계약 리스트</h2>
          <p className="text-sm text-gray-500">KB 보장분석 리포트에 기재된 계약 정보를 기준으로 정렬했습니다.</p>
        </div>
        {hasContracts ? (
          <div className="rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary-700 border border-primary-100">
            월 보험료 합계 {currencyFormatter.format(totalMonthlyPremium)}원
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">번호</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">보험사</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">상품명</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">가입일</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">납입방법</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">납입기간</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">만기</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-primary-700">월 보험료</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {contracts.map((contract, index) => {
              const premium = sanitizeNumber(contract.월보험료);
              const displayPremium = hasContracts ? currencyFormatter.format(premium) : '-';

              return (
                <tr key={`${contract.상품명 || 'contract'}-${index}`} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">{contract.번호 || index + 1}</td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {hasContracts ? contract.보험사 || '-' : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 allow-wrap">
                    {hasContracts ? contract.상품명 || '-' : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {hasContracts ? contract.가입일 || '-' : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {hasContracts ? contract.납입방법 || '-' : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {hasContracts ? contract.납입기간 || '-' : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {hasContracts ? contract.만기나이 || contract.만기 || '-' : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right text-gray-900">
                    {displayPremium}{hasContracts ? '원' : ''}
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
        <p>※ 납입기간/만기 정보가 리포트에 표시되지 않은 경우 '-'로 표기됩니다.</p>
      </div>
    </div>
  );
}
