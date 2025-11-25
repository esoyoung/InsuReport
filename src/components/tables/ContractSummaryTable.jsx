import React from 'react';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const sanitizeNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
};

const sumValuesByKeyword = (source, keyword) => {
  if (!source || !keyword) return 0;

  const normalizedKeyword = keyword.replace(/\s+/g, '');

  const sumFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return 0;

    return Object.entries(obj).reduce((total, [key, value]) => {
      if (!key) return total;
      const normalizedKey = key.replace(/\s+/g, '');

      if (normalizedKey.includes(normalizedKeyword)) {
        return total + sanitizeNumber(value);
      }

      if (value && typeof value === 'object') {
        return total + sumFromObject(value);
      }

      return total;
    }, 0);
  };

  if (Array.isArray(source)) {
    return source.reduce((total, item) => total + sumValuesByKeyword(item, normalizedKeyword), 0);
  }

  return sumFromObject(source);
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
  const totalMonthlyPremiumFromContracts = contracts.reduce(
    (sum, contract) => sum + sanitizeNumber(contract.월보험료),
    0
  );
  const customerMonthlyPremium = sanitizeNumber(고객정보.월보험료);
  const totalMonthlyPremium =
    totalMonthlyPremiumFromContracts > 0 ? totalMonthlyPremiumFromContracts : customerMonthlyPremium;

  const completedPremiumFromContracts = sumValuesByKeyword(contracts, '납입완료');
  const completedPremiumFromCustomer = sumValuesByKeyword(고객정보, '납입완료');
  const completedPremiumTotal = completedPremiumFromContracts > 0 ? completedPremiumFromContracts : completedPremiumFromCustomer;

  const scheduledPremiumFromContracts = sumValuesByKeyword(contracts, '납입예정');
  const scheduledPremiumFromCustomer = sumValuesByKeyword(고객정보, '납입예정');
  const scheduledPremiumTotal = scheduledPremiumFromContracts > 0 ? scheduledPremiumFromContracts : scheduledPremiumFromCustomer;

  const combinedPremiumTotal = (totalMonthlyPremium || 0) + (completedPremiumTotal || 0) + (scheduledPremiumTotal || 0);

  const summaryCards = [
    {
      label: '총계약건수',
      value: `${contractCount}건`,
      helper: '고객 보유 전체 계약 기준',
    },
    {
      label: '월보험료 총액',
      value: `${currencyFormatter.format(totalMonthlyPremium || 0)}원`,
      helper: '현재 납입 중인 월 보험료 합계',
    },
    {
      label: '납입완료 보험료',
      value: `${currencyFormatter.format(completedPremiumTotal || 0)}원`,
      helper: '기납입 보험료 합계',
    },
    {
      label: '납입예정 보험료',
      value: `${currencyFormatter.format(scheduledPremiumTotal || 0)}원`,
      helper: '향후 예정 보험료 합계',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">계약현황 요약</h2>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        ※ 총 보험료(월 + 납입완료 + 납입예정) 합계: {currencyFormatter.format(combinedPremiumTotal || 0)}원
      </p>
    </div>
  );
}
