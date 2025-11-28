# 🚀 Cloudflare Pages 자동 배포 가이드

## 📋 사전 준비

### 1. Cloudflare 계정 정보 확인

#### Account ID 찾기
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 로그인
2. 우측 사이드바에서 **Account ID** 복사

#### API Token 생성
1. Dashboard 우측 상단 프로필 클릭 → **My Profile**
2. 좌측 **API Tokens** 메뉴
3. **Create Token** 클릭
4. **Edit Cloudflare Workers** 템플릿 선택 (또는 Custom token)
5. 권한 설정:
   - **Account** → Cloudflare Pages → Edit
6. **Continue to summary** → **Create Token**
7. 생성된 토큰 복사 (한 번만 표시됨!)

---

## ⚙️ GitHub Secrets 설정

### Repository Settings에서 설정
1. GitHub 저장소 페이지 이동
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭하여 아래 2개 추가:

| Secret 이름 | 값 |
|------------|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare에서 생성한 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

---

## 🌿 Production 브랜치 생성 및 배포

### 초기 설정 (최초 1회)

```bash
# production 브랜치 생성
git checkout -b production

# 현재 변경사항 커밋
git add -A
git commit -m "feat: setup production deployment with auto-deploy"

# GitHub에 push
git push origin production
```

### 이후 배포 방법

```bash
# 1. main 브랜치에서 개발
git checkout main
# ... 개발 작업 ...
git add -A
git commit -m "feat: 새로운 기능 추가"
git push origin main

# 2. production 브랜치에 병합하여 배포
git checkout production
git merge main
git push origin production  # 🚀 자동 배포 트리거!
```

**또는 GitHub에서 Pull Request 사용:**
1. main → production PR 생성
2. Merge 버튼 클릭 → 자동 배포

---

## 📊 배포 확인

### GitHub Actions 로그 확인
1. GitHub 저장소 → **Actions** 탭
2. 최신 workflow 실행 확인
3. 빌드 및 배포 로그 확인

### Cloudflare Pages 확인
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **Workers & Pages** 메뉴
3. **insureport** 프로젝트 클릭
4. **Deployments** 탭에서 배포 상태 확인

---

## 🔧 트러블슈팅

### 배포 실패 시
1. **GitHub Actions 로그** 확인
2. **Secrets 설정** 재확인
3. **Cloudflare API Token 권한** 확인
4. **빌드 에러** 확인 (`npm run build` 로컬 테스트)

### Cloudflare Pages 프로젝트가 없는 경우
1. Cloudflare Dashboard → **Workers & Pages**
2. **Create application** → **Pages** → **Connect to Git**
3. GitHub 저장소 연결
4. 프로젝트 이름: `insureport`
5. Build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Environment variables 설정:
   - `VITE_USE_AI_VALIDATION` = `true`
   - `GEMINI_API_KEY` = (your Google Gemini API key) ⭐ 권장
   - `ANTHROPIC_API_KEY` = (your Anthropic API key, optional)

---

## 💰 비용 절감 설정

### AI 검증 비활성화 (완료됨)
- `.env.production`에서 `VITE_USE_AI_VALIDATION=false` 설정
- 규칙 기반 파싱만 사용하여 API 비용 발생하지 않음

### Cloudflare Pages 무료 플랜
- 월 500회 빌드 무료
- 무제한 대역폭
- AI API 사용하지 않으므로 추가 비용 없음

---

## 📝 워크플로우 요약

```
개발 (main 브랜치)
  ↓
테스트 & 커밋
  ↓
production 브랜치에 병합
  ↓
자동 배포 (GitHub Actions)
  ↓
Cloudflare Pages 업데이트
  ↓
✅ 완료!
```

---

## 🎯 체크리스트

- [ ] Cloudflare Account ID 확인
- [ ] Cloudflare API Token 생성
- [ ] GitHub Secrets 설정 (2개)
- [ ] production 브랜치 생성
- [ ] 초기 push 및 배포 확인
- [ ] Cloudflare Pages에서 배포 확인
- [ ] 도메인 연결 (선택사항)
