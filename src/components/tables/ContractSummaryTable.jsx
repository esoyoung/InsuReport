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
  const companyStats = aggregateCompanyStats(contracts);
  const totalPremiumFromContracts = companyStats.reduce((sum, item) => sum + item.월보험료, 0);
  const customerPremium = sanitizeNumber(고객정보.월보험료);
  const totalMonthlyPremium = totalPremiumFromContracts > 0 ? totalPremiumFromContracts : customerPremium;
  const highestPremiumCompany = companyStats[0];

  const completedPremiumFromContracts = sumValuesByKeyword(contracts, '납입완료');
  const completedPremiumFromCustomer = sumValuesByKeyword(고객정보, '납입완료');
  const completedPremiumTotal = completedPremiumFromContracts > 0 ? completedPremiumFromContracts : completedPremiumFromCustomer;

  const scheduledPremiumFromContracts = sumValuesByKeyword(contracts, '납입예정');
  const scheduledPremiumFromCustomer = sumValuesByKeyword(고객정보, '납입예정');
  const scheduledPremiumTotal = scheduledPremiumFromContracts > 0 ? scheduledPremiumFromContracts : scheduledPremiumFromCustomer;

  const combinedPremiumTotal = (totalMonthlyPremium || 0) + (completedPremiumTotal || 0) + (scheduledPremiumTotal || 0);

  const summaryCards = [
    {
      label: '총 계약 수',
      value: `${contractCount}건`,
      helper: '고객 보유 전체 계약 기준',
    },
    {
      label: '보험료 총합',
      value: `${currencyFormatter.format(combinedPremiumTotal || 0)}원`,
      helper: '월 + 납입완료 + 납입예정 보험료',
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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        ※ 보험료 총합은 월 보험료와 납입완료·납입예정 보험료를 모두 포함하여 산출됩니다.
      </p>
    </div>
  );
}
