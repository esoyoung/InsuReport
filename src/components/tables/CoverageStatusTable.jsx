import React from 'react';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

export const COVERAGE_GROUPS = [
  {
    title: '사망 · 장해',
    items: ['상해사망', '질병사망', '장기요양간병비', '간병인/간호간병질병일당'],
  },
  {
    title: '암 · 중증 질환',
    items: ['일반암', '유사암', '고액암', '고액(표적)항암치료비'],
  },
  {
    title: '뇌 · 심장 중심 진단',
    items: ['뇌혈관질환', '뇌졸중', '뇌출혈', '허혈성심장질환', '급성심근경색증'],
  },
  {
    title: '입원 · 수술 · 실손',
    items: [
      '상해입원의료비',
      '상해통원의료비',
      '질병입원의료비',
      '질병통원의료비',
      '3대비급여실손',
      '상해수술비',
      '질병수술비',
      '암수술비',
      '뇌혈관질환수술비',
      '허혈성심장질환수술비',
    ],
  },
  {
    title: '일상생활 · 배상',
    items: [
      '상해입원일당',
      '질병입원일당',
      '벌금(대인/스쿨존/대물)',
      '교통사고처리지원금',
      '변호사선임비용',
      '골절진단비',
      '보철치료비',
      '가족/일상/자녀배상',
      '화재벌금',
    ],
  },
];

const STATUS_STYLES = {
  충분: {
    screen: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    print: 'status-badge status-충분',
    bar: 'bg-emerald-500',
  },
  부족: {
    screen: 'bg-rose-100 text-rose-700 border border-rose-300',
    print: 'status-badge status-부족',
    bar: 'bg-rose-500',
  },
  주의: {
    screen: 'bg-amber-100 text-amber-700 border border-amber-300',
    print: 'status-badge status-주의',
    bar: 'bg-amber-500',
  },
  미가입: {
    screen: 'bg-gray-100 text-gray-700 border border-gray-300',
    print: 'status-badge status-미가입',
    bar: 'bg-gray-400',
  },
};

const parseKoreanAmount = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const raw = String(value).replace(/,/g, '').replace(/원/g, '').trim();
  if (!raw || raw === '-' || raw === '미가입') return 0;

  const isNegative = raw.includes('-');
  const normalized = raw.replace(/[+-]/g, '');

  let total = 0;
  const billionMatch = normalized.match(/(\d+)(?=억)/);
  if (billionMatch) {
    total += Number(billionMatch[1]) * 100_000_000;
  }
  const tenThousandMatch = normalized.match(/(\d+)(?=만)/);
  if (tenThousandMatch) {
    total += Number(tenThousandMatch[1]) * 10_000;
  }
  const thousandMatch = normalized.match(/(\d+)(?=천)/);
  if (thousandMatch) {
    total += Number(thousandMatch[1]) * 1_000;
  }

  const digitsOnly = normalized.replace(/[^0-9.]/g, '');
  if (digitsOnly && total === 0) {
    total += Number(digitsOnly);
  }

  const result = Number.isFinite(total) ? total : 0;
  return isNegative ? -result : result;
};

const formatAmount = (value, fallback = '-') => {
  const amount = parseKoreanAmount(value);
  if (amount === 0) return fallback;
  const formatted = currencyFormatter.format(Math.abs(Math.round(amount)));
  return `${amount < 0 ? '-' : ''}${formatted}원`;
};

const buildCoverageDetailMap = (coverageList = []) => {
  const detailMap = new Map();
  coverageList.forEach((item) => {
    const key = item.담보명?.trim();
    if (!key) return;
    if (!detailMap.has(key)) {
      detailMap.set(key, []);
    }
    detailMap.get(key).push(item);
  });
  return detailMap;
};

const getStatusMeta = (status) => STATUS_STYLES[status] || STATUS_STYLES['미가입'];

export default function CoverageStatusTable({ data }) {
  const insuranceData = data || {};
  const diagnosisList = insuranceData.진단현황 || [];
  const diagnosisMap = new Map(diagnosisList.map((item) => [item.담보명, item]));
  const coverageDetailMap = buildCoverageDetailMap(insuranceData.담보현황);

  if (!insuranceData.고객정보 && diagnosisList.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-700">담보별 현황</h2>
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-700">담보별 현황</h2>
          <p className="text-sm text-gray-500">
            권장 보장금액 대비 현재 가입금액을 비교하여 충족률과 상태를 요약했습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-emerald-500" aria-hidden="true" /> 충분
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-amber-500" aria-hidden="true" /> 주의
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-6 rounded-full bg-rose-500" aria-hidden="true" /> 부족
          </span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">담보 항목</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">주요 가입 상품</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-primary-700">권장금액</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-primary-700">가입금액</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">충족률</th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-primary-700">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {COVERAGE_GROUPS.map((group) => (
              <React.Fragment key={group.title}>
                <tr className="bg-gray-50/80">
                  <td colSpan={6} className="px-3 py-2 text-sm font-semibold text-gray-700">
                    {group.title}
                  </td>
                </tr>
                {group.items.map((itemName) => {
                  const diagnosis = diagnosisMap.get(itemName) || {};
                  const recommendedAmount = parseKoreanAmount(diagnosis.권장금액);
                  const insuredAmount = parseKoreanAmount(diagnosis.가입금액);
                  const normalizedRatio = recommendedAmount > 0
                    ? Math.max(0, insuredAmount / recommendedAmount)
                    : insuredAmount > 0
                      ? 1
                      : 0;
                  const status = diagnosis.상태 || (insuredAmount === 0 && recommendedAmount === 0
                    ? '미가입'
                    : normalizedRatio >= 1
                      ? '충분'
                      : normalizedRatio >= 0.7
                        ? '주의'
                        : '부족');
                  const statusMeta = getStatusMeta(status);
                  const products = coverageDetailMap.get(itemName) || [];
                  const productNames = Array.from(new Set(products.map((c) => c.상품명).filter(Boolean)));
                  const displayProducts = productNames.length > 0 ? productNames.join(', ') : '-';

                  return (
                    <tr key={`${group.title}-${itemName}`} className="align-top">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{itemName}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 allow-wrap">{displayProducts}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{formatAmount(diagnosis.권장금액, '-')}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{formatAmount(diagnosis.가입금액, status === '미가입' ? '미가입' : '-')}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${statusMeta.bar}`}
                              style={{ width: `${Math.min(normalizedRatio * 100, 120).toFixed(0)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {recommendedAmount === 0 && insuredAmount === 0 ? '-' : `${(normalizedRatio * 100).toFixed(0)}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.screen} ${statusMeta.print}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>※ 권장금액은 KB 보장분석 리포트 기준 제시 금액이며, 가입금액은 현재 보유 계약을 합산한 값입니다.</p>
        <p>※ 충족률 70% 미만은 부족, 70~99%는 주의, 100% 이상은 충분으로 분류합니다.</p>
      </div>
    </div>
  );
}
