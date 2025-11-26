# Cloudflare Pages 생성 대체 방법

## 문제 상황
- Dashboard에서 "Pages" 탭이 보이지 않음
- "Deploy command"를 비울 수 없음
- Workers 프로젝트로만 생성됨

## 해결책 1: Wrangler CLI 사용 (권장)

### 1. API Token 생성
```
https://dash.cloudflare.com/profile/api-tokens
→ Create Token
→ Edit Cloudflare Workers 템플릿
→ Permissions: Account → Cloudflare Pages → Edit
```

### 2. 환경 변수 설정
```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

### 3. Pages 프로젝트 생성
```bash
cd /home/user/webapp
npx wrangler pages project create insureport-app \
  --production-branch=main
```

### 4. Git 저장소 연결 (Dashboard에서)
```
생성된 프로젝트 → Settings → Builds & deployments
→ Connect repository
→ esoyoung/InsuReport
```

### 5. Build 설정
```
Build command: npm run build
Build output directory: dist
Root Path: /
```

---

## 해결책 2: 기존 프로젝트 복제

### insucrm 프로젝트를 템플릿으로 사용

1. **Dashboard에서 insucrm 프로젝트 설정 확인**
   - Settings → Builds & deployments
   - 현재 설정 스크린샷

2. **새 프로젝트 생성 시 동일한 설정 적용**
   - Repository 선택 방법
   - Build 설정
   - Environment variables

---

## 해결책 3: Cloudflare Support 문의

계정에 Pages 기능이 활성화되지 않은 경우:

```
Cloudflare Dashboard → Help → Contact Support
→ "Cannot see Pages option when creating application"
```

---

## 비교: 성공한 프로젝트 vs 현재 프로젝트

### insucrm (성공)
```
✅ Pages 탭 표시됨
✅ Git 연동만으로 자동 배포
✅ wrangler.toml 없음
```

### InsuReport (문제)
```
❌ Pages 탭 표시 안 됨
❌ Workers로만 생성됨
✅ wrangler.toml 제거됨 (8460b8c)
```

---

## 긴급 대안: Direct Upload

Pages 탭이 안 보이면, Direct Upload 방식:

```bash
cd /home/user/webapp
npm run build
npx wrangler pages deploy dist \
  --project-name=insureport-app \
  --branch=main
```

이 방법은:
- Git 통합 없음 (수동 배포)
- 하지만 Pages Functions는 작동
- API Token 필요

---

## 다음 단계

1. API Token 생성
2. Wrangler CLI로 프로젝트 생성
3. Dashboard에서 Git 연동
4. 자동 배포 설정

