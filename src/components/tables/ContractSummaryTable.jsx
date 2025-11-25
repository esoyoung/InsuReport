import React from 'react';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const sanitizeNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
};

const aggregateCompanyStats = (contracts = []) => {
  const statsMap = new Map();

  contracts.forEach((contract) => {
    const key = contract.보험사?.trim() || '기타';
    const premium = sanitizeNumber(contract.월보험료);

    if (!statsMap.has(key)) {
      statsMap.set(key, {
        보험사: key,
        계약건수: 0,
        월보험료: 0,
      });
    }

    const target = statsMap.get(key);
    target.계약건수 += 1;
    target.월보험료 += premium;
  });

  return Array.from(statsMap.values()).sort((a, b) => b.월보험료 - a.월보험료);
};

export default function ContractSummaryTable({ data }) {
  const insuranceData = data || {};

  if (!insuranceData.고객정보) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-700">계약현황 요약</h2>
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const 고객정보 = insuranceData.고객정보 || {};
  const contracts = insuranceData.계약리스트 || [];
  const contractCount = 고객정보.계약수 || contracts.length || 0;
  const companyStats = aggregateCompanyStats(contracts);
  const totalPremiumFromContracts = companyStats.reduce((sum, item) => sum + item.월보험료, 0);
  const customerPremium = sanitizeNumber(고객정보.월보험료);
  const totalMonthlyPremium = totalPremiumFromContracts > 0 ? totalPremiumFromContracts : customerPremium;
  const uniqueCompanyCount = companyStats.length;
  const averagePremium = contractCount > 0 ? Math.round((totalMonthlyPremium || 0) / contractCount) : 0;
  const highestPremiumCompany = companyStats[0];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-700">계약현황 요약</h2>
          <p className="text-sm text-gray-500">
            최근 업로드된 KB 보장분석 리포트를 기준으로 작성된 요약 정보입니다.
          </p>
        </div>
        {highestPremiumCompany ? (
          <div className="rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary-700 border border-primary-100">
            <span className="font-semibold">주요 보험사</span>{' '}
            {highestPremiumCompany.보험사} ({currencyFormatter.format(highestPremiumCompany.월보험료)}원)
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">총 계약 수</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{contractCount}건</p>
          <p className="mt-1 text-xs text-gray-500">(고객 보유 전체 계약 기준)</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">월 보험료 총액</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{currencyFormatter.format(totalMonthlyPremium || 0)}원</p>
          <p className="mt-1 text-xs text-gray-500">계약별 월 납입액 합산 기준</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">평균 계약 보험료</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{currencyFormatter.format(averagePremium || 0)}원</p>
          <p className="mt-1 text-xs text-gray-500">총 월 보험료 ÷ 계약 수</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">보험사 수</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{uniqueCompanyCount}개사</p>
          <p className="mt-1 text-xs text-gray-500">중복 계약 제외</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">보험사별 월 보험료 비중</h3>
          <span className="text-xs text-gray-500">단위: 원, (%)</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-primary-700">보험사</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-primary-700">계약 건수</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-primary-700">월 보험료</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-primary-700">비중</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {companyStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                    보험사별 계약 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                companyStats.map((item) => {
                  const share = totalMonthlyPremium > 0 ? (item.월보험료 / totalMonthlyPremium) * 100 : 0;
                  return (
                    <tr key={item.보험사} className="align-top">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.보험사}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">{item.계약건수}건</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {currencyFormatter.format(item.월보험료)}원
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{ width: `${Math.min(share, 100).toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          ※ 보험사별 월 보험료 금액은 업로드된 리포트 내 계약 정보를 기준으로 산출되었습니다.
        </p>
      </div>
    </div>
  );
}
