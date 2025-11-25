import React from 'react';
import { COVERAGE_GROUPS } from './CoverageStatusTable';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

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

const normalizeKoreanMagnitude = (value) => {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();
  if (!raw || raw === '-' || raw === '미가입') return 0;

  const isNegative = /^-/.test(raw) || /\(음수\)/.test(raw);
  raw = raw.replace(/[^0-9.억만천]/g, '');
  if (!raw) return 0;

  raw = raw
    .replace(/(\d+)\s*천만/g, (_, num) => `${Number(num) * 1000}만`)
    .replace(/천만/g, '1000만')
    .replace(/(\d+)\s*천/g, (_, num) => `${Number(num) * 1000}`)
    .replace(/천/g, '1000');

  let total = 0;

  const billionMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)억/g)];
  billionMatches.forEach((match) => {
    total += parseFloat(match[1]) * 100_000_000;
  });
  raw = raw.replace(/(\d+(?:\.\d+)?)억/g, '');

  const tenThousandMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)만/g)];
  tenThousandMatches.forEach((match) => {
    total += parseFloat(match[1]) * 10_000;
  });
  raw = raw.replace(/(\d+(?:\.\d+)?)만/g, '');

  const remainingDigits = raw.replace(/[^0-9.]/g, '');
  if (remainingDigits) {
    total += parseFloat(remainingDigits);
  }

  if (!Number.isFinite(total)) {
    total = 0;
  }

  return isNegative ? -total : total;
};

const formatWon = (amount, fallback = '—') => {
  if (!amount) return fallback;
  const rounded = Math.round(amount);
  const formatted = currencyFormatter.format(Math.abs(rounded));
  return `${rounded < 0 ? '-' : ''}${formatted}원`;
};

const renderCellContent = (content, { align = 'left', fallback = '—' } = {}) => {
  const normalize = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const rawLines = Array.isArray(content)
    ? content
    : normalize(content)
      ? [content]
      : [fallback];

  const normalizedLines = rawLines
    .flatMap((line) => (line === null || line === undefined ? fallback : String(line).split('\n')))
    .map((line) => normalize(line))
    .filter((line) => line !== '');

  const effectiveLines = normalizedLines.length > 0 ? normalizedLines.slice(0, 2) : [fallback];
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

const enrichDiagnosis = (
  item = {},
  { name, fallbackStatus = null, isPlaceholder = false } = {}
) => {
  const label = name ?? item.담보명 ?? '';
  const recommended = normalizeKoreanMagnitude(item.권장금액);
  const insured = normalizeKoreanMagnitude(item.가입금액);
  const rawShortfall = normalizeKoreanMagnitude(item.부족금액);
  const calculatedShortfall = Math.max(0, recommended - insured);
  const shortfall = rawShortfall !== 0 ? rawShortfall : calculatedShortfall;
  const ratio = recommended > 0 ? Math.max(0, insured / recommended) : insured > 0 ? 1 : 0;

  let status = item.상태;
  if (!status || typeof status !== 'string' || status.trim() === '') {
    if (fallbackStatus !== null) {
      status = fallbackStatus;
    } else if (recommended === 0 && insured === 0) {
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
  const statusCounts = enrichedFromData.reduce(
    (acc, item) => {
      const key = item.상태 || '미가입';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { 부족: 0, 미가입: 0, 주의: 0, 충분: 0 }
  );
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

  const summaryCards = [
    {
      label: '부족담보',
      value: `${statusCounts['부족'] || 0}건`,
      tone: 'text-rose-600',
      border: 'border-rose-200',
      background: 'bg-rose-50',
    },
    {
      label: '미가입담보',
      value: `${statusCounts['미가입'] || 0}건`,
      tone: 'text-gray-700',
      border: 'border-gray-200',
      background: 'bg-gray-50',
    },
    {
      label: '주의담보',
      value: `${statusCounts['주의'] || 0}건`,
      tone: 'text-amber-600',
      border: 'border-amber-200',
      background: 'bg-amber-50',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-gray-900">담보별 진단현황</h2>
          <p className="text-xs text-gray-500 mt-1">
            권장 금액 대비 현재 가입 현황을 비교하여 부족/미가입 담보를 확인할 수 있습니다.
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:self-end">
          <div className="grid grid-cols-3 gap-3">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={classNames(
                  'rounded-lg border px-2 py-1 text-center',
                  card.tone,
                  card.border,
                  card.background
                )}
              >
                <p className="diagnosis-card-label">{card.label}</p>
                <p className="diagnosis-card-value">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
        <table className="report-table divide-y divide-gray-200">
          <thead className="bg-teal-50">
            <tr>
              <th scope="col" className="px-2 text-left text-primary-700 font-semibold">담보 항목</th>
              <th scope="col" className="px-2 text-right text-primary-700 font-semibold">권장금액</th>
              <th scope="col" className="px-2 text-right text-primary-700 font-semibold">가입금액</th>
              <th scope="col" className="px-2 text-right text-primary-700 font-semibold">부족금액</th>
              <th scope="col" className="px-2 text-center text-primary-700 font-semibold">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {COVERAGE_GROUPS.map((group) => (
              <React.Fragment key={group.title}>
                <tr className="bg-gray-50/80">
                  <td colSpan={5} className="px-2 py-2 text-[9pt] font-semibold text-gray-700">
                    {group.title}
                  </td>
                </tr>
                {group.items.map((name) => {
                  const row = templateRowMap.get(name) || enrichDiagnosis(
                    { 담보명: name, 권장금액: null, 가입금액: null, 부족금액: null },
                    { name, fallbackStatus: '미가입', isPlaceholder: true }
                  );
                  const statusStyle = getStatusStyle(row.상태);
                  const recommendedDisplay = row.권장금액값 > 0 ? formatWon(row.권장금액값) : '—';
                  const insuredDisplay = row.가입금액값 > 0
                    ? formatWon(row.가입금액값)
                    : row.상태 === '미가입'
                      ? '미가입'
                      : '—';
                  const shortfallDisplay = row.부족금액값 > 0 ? formatWon(row.부족금액값) : '—';

                  return (
                    <tr key={`${group.title}-${name}`} className="align-top">
                      <td className="px-2 text-gray-900">
                        {renderCellContent(name)}
                      </td>
                      <td className="px-2 text-gray-700">
                        {renderCellContent(recommendedDisplay, { align: 'right' })}
                      </td>
                      <td className="px-2 text-gray-700">
                        {renderCellContent(insuredDisplay, { align: 'right' })}
                      </td>
                      <td className="px-2 text-gray-700">
                        {renderCellContent(shortfallDisplay, { align: 'right' })}
                      </td>
                      <td className="px-2 text-center">
                        <span className={classNames(
                          'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold',
                          statusStyle.screen,
                          statusStyle.print
                        )}
                        >
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
                  <td colSpan={5} className="px-2 py-2 text-[9pt] font-semibold text-gray-700">추가 담보</td>
                </tr>
                {additionalRows
                  .sort((a, b) => {
                    const statusDiff = (STATUS_ORDER[a.상태] ?? 99) - (STATUS_ORDER[b.상태] ?? 99);
                    if (statusDiff !== 0) return statusDiff;
                    return (b.권장금액값 || 0) - (a.권장금액값 || 0);
                  })
                  .map((row) => {
                    const statusStyle = getStatusStyle(row.상태);
                    const recommendedDisplay = row.권장금액값 > 0 ? formatWon(row.권장금액값) : '—';
                    const insuredDisplay = row.가입금액값 > 0
                      ? formatWon(row.가입금액값)
                      : row.상태 === '미가입'
                        ? '미가입'
                        : '—';
                    const shortfallDisplay = row.부족금액값 > 0 ? formatWon(row.부족금액값) : '—';

                    return (
                      <tr key={`additional-${row.담보명}`} className="align-top">
                        <td className="px-2 text-gray-900">
                          {renderCellContent(row.담보명)}
                        </td>
                        <td className="px-2 text-gray-700">
                          {renderCellContent(recommendedDisplay, { align: 'right' })}
                        </td>
                        <td className="px-2 text-gray-700">
                          {renderCellContent(insuredDisplay, { align: 'right' })}
                        </td>
                        <td className="px-2 text-gray-700">
                          {renderCellContent(shortfallDisplay, { align: 'right' })}
                        </td>
                        <td className="px-2 text-center">
                          <span className={classNames(
                            'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold',
                            statusStyle.screen,
                            statusStyle.print
                          )}
                          >
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
