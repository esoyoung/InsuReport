import React from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import ContractSummaryTable from './tables/ContractSummaryTable';
import ContractListTable from './tables/ContractListTable';
import CoverageStatusTable from './tables/CoverageStatusTable';
import DiagnosisTable from './tables/DiagnosisTable';

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

  return (
    <div>
      {/* 컨트롤 패널 */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary-700 uppercase mb-1">
            고객 정보
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            {고객정보.이름}님의 보장분석 리포트
          </h2>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
            <span>{고객정보.나이}세</span>
            <span className="text-gray-300">|</span>
            <span>{고객정보.성별}</span>
            <span className="text-gray-300">|</span>
            <span>월 보험료 {(고객정보.월보험료 || 0).toLocaleString()}원</span>
            {고객정보.계약수 ? (
              <>
                <span className="text-gray-300">|</span>
                <span>총 계약 {고객정보.계약수}건</span>
              </>
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
