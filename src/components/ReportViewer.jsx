import React from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import ContractSummaryTable from './tables/ContractSummaryTable';
import ContractListTable from './tables/ContractListTable';
import DiagnosisTable from './tables/DiagnosisTable';

const sanitizeNumericValue = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const numeric = Number(cleaned);
  return Number.isNaN(numeric) ? 0 : numeric;
};

function ReportViewer() {
  const { parsedData, reset } = useInsuranceStore();

  if (!parsedData) return null;

  // 안전 장치: 고객정보가 없으면 렌더링하지 않음
  if (!parsedData.고객정보) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  const { 고객정보 } = parsedData;
  const contracts = parsedData.계약리스트 || [];
  const contractCount = 고객정보.계약수 || contracts.length || 0;
  const totalMonthlyPremiumFromContracts = contracts.reduce(
    (sum, contract) => sum + sanitizeNumericValue(contract.월보험료),
    0
  );
  const monthlyPremiumValue =
    totalMonthlyPremiumFromContracts > 0
      ? totalMonthlyPremiumFromContracts
      : sanitizeNumericValue(고객정보.월보험료);
  const monthlyPremiumDisplay = `${Math.max(0, monthlyPremiumValue).toLocaleString('ko-KR')}원`;
  const genderShort = 고객정보.성별 ? String(고객정보.성별).replace(/자$/, '') : '';
  const ageLabel = 고객정보.나이 ? `${고객정보.나이}세` : '';
  const ageGenderLabel = [ageLabel, genderShort].filter(Boolean).join(', ');

  return (
    <div>
      {/* 컨트롤 패널 */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            {고객정보.이름}님의 보장분석 리포트
          </h1>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm text-gray-600">
            <div className="flex items-baseline gap-2 text-lg font-semibold text-gray-900">
              <span>{고객정보.이름}님</span>
              {ageGenderLabel ? (
                <span className="text-xs font-medium text-gray-500 leading-none">({ageGenderLabel})</span>
              ) : null}
            </div>
            <span className="text-sm text-gray-600">월 보험료 {monthlyPremiumDisplay}</span>
            {contractCount ? (
              <span className="text-sm text-gray-600">총 계약 {contractCount}건</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="no-print px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 다시 업로드
          </button>
        </div>
      </div>

      {/* 리포트 섹션들 */}
      <div className="space-y-8">
        {/* 1. 계약현황 요약 */}
        <section className="page-break">
          <ContractSummaryTable data={parsedData} />
        </section>

        {/* 2. 보유 계약 리스트 */}
        <section className="page-break">
          <ContractListTable data={parsedData} />
        </section>

        {/* 3. 담보별 진단현황 */}
        <section className="page-break">
          <DiagnosisTable data={parsedData} />
        </section>
      </div>
    </div>
  );
}

export default ReportViewer;
