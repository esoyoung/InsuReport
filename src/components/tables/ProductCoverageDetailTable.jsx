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

export default function ProductCoverageDetailTable({ data }) {
  const insuranceData = data || {};
  const productDetails = insuranceData.상품별담보 || [];
  const hasProducts = productDetails.length > 0;

  if (!insuranceData.고객정보 && !hasProducts) {
    return null; // 데이터 없으면 렌더링하지 않음
  }

  // 상품별 담보 데이터가 없으면 렌더링하지 않음
  if (!hasProducts) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">상품별 가입담보상세</h2>
        <p className="text-xs text-gray-500 mt-1">
          각 보험 상품별 가입된 담보 내용입니다.
        </p>
      </div>

      <div className="mt-4 space-y-6">
        {productDetails.map((product, productIndex) => {
          const coverages = product.담보목록 || [];
          const hasCoverages = coverages.length > 0;

          return (
            <div key={`product-${productIndex}`} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* 상품 헤더 */}
              <div className="bg-primary-50 px-4 py-3 border-b border-primary-100">
                <h3 className="text-base font-semibold text-primary-900">
                  {product.상품명 || `상품 ${productIndex + 1}`}
                </h3>
                {product.보험사 && (
                  <p className="text-xs text-primary-700 mt-1">
                    {product.보험사}
                  </p>
                )}
              </div>

              {/* 담보 테이블 */}
              {hasCoverages ? (
                <div className="overflow-x-auto">
                  <table className="report-table min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-center text-gray-700 font-semibold align-middle" style={{ width: '2.5rem' }}>
                          번호
                        </th>
                        <th scope="col" className="px-2 py-2 text-left text-gray-700 font-semibold align-middle" style={{ minWidth: '15rem' }}>
                          담보명
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-gray-700 font-semibold align-middle" style={{ width: '8rem' }}>
                          가입금액
                        </th>
                        <th scope="col" className="px-2 py-2 text-center text-gray-700 font-semibold align-middle" style={{ width: '5rem' }}>
                          보장기간
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {coverages.map((coverage, coverageIndex) => {
                        const displayNumber = coverageIndex + 1;
                        const coverageName = coverage.담보명 || '—';
                        const amount = coverage.가입금액 || '—';
                        const period = coverage.보장기간 || '—';

                        return (
                          <tr key={`coverage-${coverageIndex}`} className="hover:bg-gray-50 align-middle">
                            <td className="px-2 py-2 text-gray-900 align-middle">
                              {renderCellContent(displayNumber, { align: 'center' })}
                            </td>
                            <td className="px-2 py-2 text-gray-700 align-middle">
                              {renderCellContent(coverageName, { align: 'left' })}
                            </td>
                            <td className="px-2 py-2 text-gray-700 align-middle">
                              {renderCellContent(amount, { align: 'right' })}
                            </td>
                            <td className="px-2 py-2 text-gray-700 align-middle">
                              {renderCellContent(period, { align: 'center' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  담보 정보 없음
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>※ 상품별 담보 내용은 계약 시점 기준이며, 현재와 다를 수 있습니다.</p>
      </div>
    </div>
  );
}
