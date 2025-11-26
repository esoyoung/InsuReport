# 🚨 긴급 수정 필요: Deploy Command 변경

## 현재 문제
Dashboard의 Deploy command가 여전히 `npx wrangler deploy`로 설정되어 있습니다.
이것은 Workers용 명령어이고, Pages에서는 사용하면 안 됩니다!

## 즉시 수정 방법

### 1. Cloudflare Dashboard 접속
https://dash.cloudflare.com/

### 2. 프로젝트 선택
Workers & Pages → insur-report (또는 생성한 프로젝트 이름)

### 3. Settings 탭 클릭

### 4. Builds & deployments 섹션 찾기

### 5. Build configuration → "Edit" 버튼 클릭

### 6. Deploy command 필드 수정
**현재 (잘못됨):**
```
npx wrangler deploy
```

**변경해야 함 (Option 1 - 권장):**
```
(완전히 비워두기)
```

**변경해야 함 (Option 2 - 비울 수 없는 경우):**
```
./.cloudflare-deploy.sh
```

**변경해야 함 (Option 3 - 최후의 수단):**
```
echo "Deployed by Cloudflare Pages"
```

### 7. Save 클릭

### 8. 재배포
Deployments 탭 → 최신 배포 → "Retry deployment" 버튼 클릭

---

## 왜 이렇게 해야 하나?

### Cloudflare Pages의 배포 방식:
```bash
1. npm run build          # ✅ Build command 실행
2. dist/ 디렉터리 생성     # ✅ 자동 감지
3. functions/ 디렉터리     # ✅ 자동 감지
4. 자동 배포!             # ✅ Deploy command 불필요!
```

### npx wrangler deploy는:
- Workers 프로젝트용 명령어
- Node 20+ 필요
- Pages에서는 불필요하고 에러 발생

---

## 수정 후 기대 결과

빌드 로그에서 다음과 같이 표시되어야 합니다:

```
✓ Build command completed
✓ Deploying to Cloudflare Pages
✓ Success! Deployed to https://insur-report.pages.dev
```

"Executing user deploy command"가 **보이지 않아야 합니다!**

