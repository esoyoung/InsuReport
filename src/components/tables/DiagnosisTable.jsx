import React from 'react';
import { COVERAGE_GROUPS } from './CoverageStatusTable';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const STATUS_STYLES = {
  부족: {
    screen: 'bg-rose-100 text-rose-700 border border-rose-300',
    print: 'status-badge status-부족',
  },
  미가입: {
    screen: 'bg-gray-100 text-gray-700 border border-gray-300',
    print: 'status-badge status-미가입',
  },
  주의: {
    screen: 'bg-amber-100 text-amber-700 border border-amber-300',
    print: 'status-badge status-주의',
  },
  충분: {
    screen: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    print: 'status-badge status-충분',
  },
};

const STATUS_ORDER = {
  부족: 0,
  미가입: 1,
  주의: 2,
  충분: 3,
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

const formatWon = (amount, fallback = '-') => {
  if (!amount) return fallback;
  const formatted = currencyFormatter.format(Math.abs(Math.round(amount)));
  return `${amount < 0 ? '-' : ''}${formatted}원`;
};

const enrichDiagnosis = (item = {}, { name, fallbackStatus = null, isPlaceholder = false } = {}) => {
  const label = name ?? item.담보명 ?? '';
  const recommended = parseKoreanAmount(item.권장금액);
  const insured = parseKoreanAmount(item.가입금액);
  const rawShortfall = parseKoreanAmount(item.부족금액);
  const calculatedShortfall = recommended > insured ? recommended - insured : 0;
  const shortfall = rawShortfall !== 0 ? rawShortfall : calculatedShortfall;
  const ratio = recommended > 0 ? Math.max(0, insured / recommended) : insured > 0 ? 1 : 0;

  let status = item.상태;
  if (!status || typeof status !== 'string' || status.trim() === '') {
    if (fallbackStatus !== null) {
      status = fallbackStatus;
    } else if (insured === 0 && recommended === 0) {
      status = '미가입';
    } else if (ratio >= 1) {
      status = '충분';
    } else if (ratio >= 0.7) {
      status = '주의';
    } else {
      status = '부족';
    }
  }

  return {
    ...item,
    담보명: label,
    권장금액값: recommended,
    가입금액값: insured,
    부족금액값: shortfall,
    ratio,
    상태: status,
    placeholder: isPlaceholder,
  };
};

export default function DiagnosisTable({ data }) {
  const insuranceData = data || {};
  const diagnosisList = insuranceData.진단현황 || [];

  if (!insuranceData.고객정보 && diagnosisList.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-primary-700">담보별 진단현황</h2>
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const enrichedFromData = diagnosisList.map((item) => enrichDiagnosis(item));
  const statusCounts = enrichedFromData.reduce((acc, item) => {
    const status = item.상태 || '미가입';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const totalShortfall = enrichedFromData.reduce(
    (sum, item) => sum + Math.max(item.부족금액값 || 0, 0),
    0
  );

  const templateNames = COVERAGE_GROUPS.flatMap((group) => group.items);
  const templateNameSet = new Set(templateNames);
  const enrichedMap = new Map(enrichedFromData.map((item) => [item.담보명, item]));

  const templateRows = templateNames.map((name) => {
    if (enrichedMap.has(name)) {
      return enrichedMap.get(name);
    }
    return enrichDiagnosis(
      { 담보명: name, 권장금액: null, 가입금액: null, 부족금액: null },
      { name, fallbackStatus: '미가입', isPlaceholder: true }
    );
  });

  const templateRowMap = new Map(templateRows.map((item) => [item.담보명, item]));

  const additionalRows = enrichedFromData.filter((item) => !templateNameSet.has(item.담보명));

  const getStatusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES['미가입'];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary-700">담보별 진단현황</h2>
          <p className="text-sm text-gray-500">
            부족하거나 미가입된 담보를 중심으로 권장 금액 대비 현황을 정리했습니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
            <p className="text-rose-600 font-semibold">부족 담보</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{statusCounts['부족'] || 0}건</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-gray-600 font-semibold">미가입 담보</p>
            <p className="mt-1 text-xl font-bold text-gray-800">{statusCounts['미가입'] || 0}건</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="text-amber-600 font-semibold">주의 필요 담보</p>
            <p className="mt-1 text-xl font-bold text-amber-700">{statusCounts['주의'] || 0}건</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="text-emerald-600 font-semibold">추가 필요 보장금액</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {totalShortfall > 0 ? formatWon(totalShortfall) : '0원'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-primary-700">담보 항목</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-primary-700">권장금액</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-primary-700">가입금액</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-primary-700">부족금액</th>
              <th scope="col" className="px-3 py-2 text-center text-xs font-semibold text-primary-700">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {COVERAGE_GROUPS.map((group) => (
              <React.Fragment key={group.title}>
                <tr className="bg-gray-50/80">
                  <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-gray-700">
                    {group.title}
                  </td>
                </tr>
                {group.items.map((name) => {
                  const row = templateRowMap.get(name) || enrichDiagnosis(
                    { 담보명: name, 권장금액: null, 가입금액: null, 부족금액: null },
                    { name, fallbackStatus: '미가입', isPlaceholder: true }
                  );
                  const statusStyle = getStatusStyle(row.상태);
                  const recommendedDisplay = row.권장금액값 > 0 ? formatWon(row.권장금액값) : '-';
                  const insuredDisplay = row.가입금액값 > 0 ? formatWon(row.가입금액값) : row.상태 === '미가입' ? '미가입' : '-';
                  const shortfallDisplay = row.부족금액값 > 0 ? formatWon(row.부족금액값) : '-';

                  return (
                    <tr key={`${group.title}-${name}`} className="align-top">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{name}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{recommendedDisplay}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{insuredDisplay}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{shortfallDisplay}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.screen} ${statusStyle.print}`}>
                          {row.상태}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {additionalRows.length > 0 && (
              <>
                <tr className="bg-gray-50/80">
                  <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-gray-700">추가 담보</td>
                </tr>
                {additionalRows
                  .sort((a, b) => {
                    const statusDiff = (STATUS_ORDER[a.상태] ?? 99) - (STATUS_ORDER[b.상태] ?? 99);
                    if (statusDiff !== 0) return statusDiff;
                    return (b.권장금액값 || 0) - (a.권장금액값 || 0);
                  })
                  .map((row) => {
                    const statusStyle = getStatusStyle(row.상태);
                    const recommendedDisplay = row.권장금액값 > 0 ? formatWon(row.권장금액값) : '-';
                    const insuredDisplay = row.가입금액값 > 0 ? formatWon(row.가입금액값) : row.상태 === '미가입' ? '미가입' : '-';
                    const shortfallDisplay = row.부족금액값 > 0 ? formatWon(row.부족금액값) : '-';

                    return (
                      <tr key={`additional-${row.담보명}`} className="align-top">
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{row.담보명}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-700">{recommendedDisplay}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-700">{insuredDisplay}</td>
                        <td className="px-3 py-2 text-sm text-right text-gray-700">{shortfallDisplay}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.screen} ${statusStyle.print}`}>
                            {row.상태}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>※ 부족금액은 권장 보장금액에서 현재 가입금액을 차감한 값이며, 음수는 초과 보장을 의미합니다.</p>
        <p>※ 상태 분류 기준: 70% 미만 부족, 70~99% 주의, 100% 이상 충분, 미가입은 보장 부재를 의미합니다.</p>
      </div>
    </div>
  );
}
