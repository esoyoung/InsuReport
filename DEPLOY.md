# 🚀 Vercel 배포 가이드

## 방법 1: Vercel 웹 대시보드에서 배포 (권장)

### 1단계: GitHub 저장소 생성
1. GitHub에 새 저장소 생성 (예: `insurance-analyzer`)
2. 로컬에서 Git 초기화 및 푸시:

```bash
cd /home/user/insurance-analyzer

# Git 초기화
git init
git add .
git commit -m "Initial commit: Insurance Analyzer Web App"

# GitHub 원격 저장소 추가 (본인 저장소 URL로 변경)
git remote add origin https://github.com/YOUR_USERNAME/insurance-analyzer.git
git branch -M main
git push -u origin main
```

### 2단계: Vercel에서 배포
1. [Vercel](https://vercel.com)에 로그인 (GitHub 계정 연동)
2. "Add New" → "Project" 클릭
3. GitHub 저장소 `insurance-analyzer` 선택
4. 프로젝트 설정:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. "Deploy" 클릭

### 3단계: 배포 완료 ✅
- 자동으로 빌드 및 배포 진행
- 완료 후 `https://your-project.vercel.app` URL 생성
- 이후 Git push 시 자동 재배포

---

## 방법 2: Vercel CLI로 배포

### 1단계: Vercel CLI 설치
```bash
npm install -g vercel
```

### 2단계: 로그인
```bash
vercel login
```

### 3단계: 배포
```bash
cd /home/user/insurance-analyzer
vercel
```

### 4단계: 프로덕션 배포
```bash
vercel --prod
```

---

## 방법 3: 빌드 파일 직접 업로드

### 1단계: 이미 빌드된 파일 사용
```bash
# 빌드 파일 위치
/home/user/insurance-analyzer/dist/
```

### 2단계: Vercel 대시보드에서
1. "Add New" → "Project" 클릭
2. "Browse" 클릭하여 `dist` 폴더 드래그 앤 드롭
3. "Deploy" 클릭

---

## 배포 후 확인사항

### ✅ 동작 확인
- [ ] 페이지가 정상적으로 로드되는가?
- [ ] PDF 업로드가 작동하는가?
- [ ] 4가지 표가 모두 표시되는가?
- [ ] 인쇄 기능이 작동하는가?
- [ ] 반응형 디자인이 적용되는가?

### ⚙️ 환경 변수 (필요시)
Vercel 대시보드에서 Settings → Environment Variables에 추가:
```
# Gemini API (향후 추가 시)
VITE_GEMINI_API_KEY=your_api_key_here
```

### 🔧 커스텀 도메인 (선택)
1. Vercel 대시보드 → Settings → Domains
2. 본인 도메인 추가 (예: `insurance-report.com`)
3. DNS 설정 업데이트

---

## 자동 배포 설정

### GitHub Actions (선택)
`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 문제 해결

### 빌드 에러
```bash
# 로컬에서 먼저 테스트
npm run build

# 빌드 성공 확인 후 배포
```

### PDF.js 로딩 에러
`vite.config.js`에 이미 설정됨 - 추가 조치 불필요

### CORS 에러
PDF 파일이 외부 URL인 경우 프록시 설정 필요

---

## 📦 배포 파일 구조

```
dist/
├── index.html
└── assets/
    ├── index-[hash].js
    └── index-[hash].css
```

---

## 🎯 배포 URL 예시

배포 완료 후 다음과 같은 URL을 받게 됩니다:
- **프리뷰**: `https://insurance-analyzer-git-main-username.vercel.app`
- **프로덕션**: `https://insurance-analyzer.vercel.app`

---

## 📞 지원

배포 중 문제가 발생하면:
1. Vercel 빌드 로그 확인
2. 로컬 `npm run build` 테스트
3. GitHub 저장소 권한 확인

Happy Deploying! 🚀
