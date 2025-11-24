import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import ReportViewer from './components/ReportViewer';
import { useInsuranceStore } from './store/insuranceStore';

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const { parsedData } = useInsuranceStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                보장분석 리포트 생성기
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                KB 보장분석 PDF를 업로드하여 맞춤 리포트를 생성하세요
              </p>
            </div>
            {parsedData && (
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm"
              >
                🖨️ 인쇄하기
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!parsedData ? (
          <FileUploader />
        ) : (
          <ReportViewer />
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 보장분석 리포트 생성기. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
