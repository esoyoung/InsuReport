import React from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import ContractSummaryTable from './tables/ContractSummaryTable';
import ContractListTable from './tables/ContractListTable';
import CoverageStatusTable from './tables/CoverageStatusTable';
import DiagnosisTable from './tables/DiagnosisTable';

function ReportViewer() {
  const { parsedData, reset } = useInsuranceStore();

  if (!parsedData) return null;

  return (
    <div>
      {/* 컨트롤 패널 */}
      <div className="mb-6 flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {parsedData.customerInfo.name}님의 보장분석 리포트
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {parsedData.customerInfo.age}세 · {parsedData.customerInfo.gender} · 
            월 보험료: {parsedData.customerInfo.monthlyPremium.toLocaleString()}원
          </p>
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          🔄 다시 업로드
        </button>
      </div>

      {/* 리포트 섹션들 */}
      <div className="space-y-8">
        {/* 1. 계약현황 요약 */}
        <section className="page-break">
          <ContractSummaryTable data={parsedData} />
        </section>

        {/* 2. 전체 계약 리스트 */}
        <section className="page-break">
          <ContractListTable data={parsedData} />
        </section>

        {/* 3. 담보별 현황 */}
        <section className="page-break">
          <CoverageStatusTable data={parsedData} />
        </section>

        {/* 4. 담보별 진단현황 */}
        <section className="page-break">
          <DiagnosisTable data={parsedData} />
        </section>
      </div>
    </div>
  );
}

export default ReportViewer;
