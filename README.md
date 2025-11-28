# 보장분석 리포트 생성기

KB 보장분석 PDF를 업로드하여 청녹색 테마의 맞춤 리포트를 생성하는 React 웹 애플리케이션입니다.

## 🎯 주요 기능

### 📊 4가지 핵심 리포트
1. **계약현황 요약** - 전체 보험 계약 개요 및 보험사별 통계
2. **전체 계약 리스트** - 가입 상품 상세 목록 (1페이지)
3. **담보별 현황** - 보장항목별 가입금액 및 충족률 (1페이지)
4. **담보별 진단현황** - 부족/충분/미가입 진단 결과 (1페이지)

### ✨ 특징
- 🎨 청녹색(Teal) 테마 적용
- 🖨️ 브라우저 인쇄 최적화 (A4 규격)
- 📱 반응형 디자인
- ⚡ 빠른 PDF 파싱
- 📈 시각화된 통계 차트

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📖 사용 방법

### 1단계: PDF 업로드
- KB 보장분석 PDF 파일을 드래그 앤 드롭하거나 파일 선택
- 자동으로 데이터 파싱 시작

### 2단계: 리포트 확인
- 4가지 표가 순차적으로 표시됨
- 각 섹션별로 상세 정보 확인

### 3단계: 인쇄
- 우측 상단 "🖨️ 인쇄하기" 버튼 클릭
- 브라우저 인쇄 대화상자에서 설정 조정
- PDF로 저장 또는 프린터 출력

## 🏗️ 프로젝트 구조

```
insurance-analyzer/
├── public/
├── src/
│   ├── components/
│   │   ├── tables/
│   │   │   ├── ContractSummaryTable.jsx    # 계약현황 요약
│   │   │   ├── ContractListTable.jsx       # 전체 계약 리스트
│   │   │   ├── CoverageStatusTable.jsx     # 담보별 현황
│   │   │   └── DiagnosisTable.jsx          # 담보별 진단현황
│   │   ├── FileUploader.jsx                # 파일 업로드
│   │   └── ReportViewer.jsx                # 리포트 뷰어
│   ├── store/
│   │   └── insuranceStore.js               # Zustand 상태 관리
│   ├── utils/
│   │   └── pdfParser.js                    # PDF 파싱 로직
│   ├── App.jsx                             # 메인 앱
│   ├── main.jsx                            # 엔트리 포인트
│   └── index.css                           # 전역 스타일
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎨 디자인 시스템

### 색상 팔레트 (Teal)
```js
primary: {
  500: '#14b8a6',  // 메인 컬러
  600: '#0d9488',  // 헤더, 버튼
  700: '#0f766e',  // 강조 텍스트
}
```

### 타이포그래피
- 폰트: Noto Sans KR
- 제목: 700 (Bold)
- 본문: 400 (Regular)

## 🛠️ 기술 스택

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **PDF Processing**: PDF.js
- **언어**: JavaScript (ES6+)

## 🚀 배포

### Cloudflare Pages 자동 배포

**production 브랜치에 push하면 자동으로 배포됩니다!**

```bash
# production 브랜치로 전환
git checkout production

# main 브랜치 변경사항 병합
git merge main

# GitHub에 push (자동 배포 트리거)
git push origin production
```

자세한 설정 방법은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고

### 🤖 AI 검증
- **Anthropic Claude Sonnet 4.5** (Primary)
- **OpenAI GPT-4o** (Alternative)
- PDF 직접 처리로 높은 정확도
- 자세한 설정: [AI_SETUP.md](./AI_SETUP.md)

### 💰 비용 관리
- AI 검증 활성화 시: ~$0.01-0.10/검증
- 개발 중 비활성화 가능 (비용 $0)
- Cloudflare Pages 무료 플랜

## 📋 향후 추가 예정 기능

- [ ] 생애설계 그래프 (나이 마커 표시)
- [ ] AI 분석 보고서 (선택적 활성화)
  - Needs 환기 양식
  - 편지 양식
  - 일반 보고서 양식

## 🐛 문제 해결

### PDF 파싱이 안 되는 경우
1. PDF 파일이 KB 보장분석 양식인지 확인
2. 파일이 손상되지 않았는지 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 인쇄가 제대로 안 되는 경우
1. Chrome/Edge 브라우저 사용 권장
2. 인쇄 설정에서 "배경 그래픽" 활성화
3. 용지 크기 A4로 설정

## 📄 라이선스

© 2025 보장분석 리포트 생성기. All rights reserved.

## 👨‍💻 개발자

문의사항이나 버그 리포트는 이슈로 등록해 주세요.
