# 🚀 Cloudflare Pages 배포 가이드

## 📋 배포 방법

### ✅ Option 1: 수동 배포 (Wrangler CLI)

#### 1단계: Cloudflare API 토큰 생성

1. Cloudflare Dashboard 접속: https://dash.cloudflare.com/profile/api-tokens
2. **"Create Token"** 클릭
3. **"Edit Cloudflare Workers"** 템플릿 선택
4. 또는 **"Custom token"** 생성:
   - Permissions:
     - `Account - Cloudflare Pages - Edit`
     - `User - User Details - Read`
5. 토큰 복사

#### 2단계: 배포 실행

```bash
# 환경 변수 설정
export CLOUDFLARE_API_TOKEN="your-token-here"

# 배포 스크립트 실행
./deploy.sh
```

또는 직접 명령어 실행:

```bash
# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name=insureport
```

---

### ✅ Option 2: Git 연동 (자동 배포) - 권장

#### 1단계: Cloudflare Dashboard에서 Git 연동 설정

1. https://dash.cloudflare.com/ 접속
2. **Workers & Pages** → **insureport** 선택
3. **Settings** 탭 클릭
4. **"Builds & deployments"** 섹션 찾기
5. **"Configure Production deployments"** 클릭
6. **GitHub 계정 연결**

#### 2단계: 빌드 설정

- **Production branch**: `main`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (비워둠)

#### 3단계: 환경 변수 설정

**Settings** → **Environment variables** → **Production** 탭:

- `ANTHROPIC_API_KEY`: Claude API 키
- `VITE_USE_AI_VALIDATION`: `true`

#### 완료!

이제 `git push origin main` 할 때마다 자동으로 배포됩니다.

---

## 🔧 환경 변수

### 필수 환경 변수

| 변수명 | 설명 | 값 |
|--------|------|-----|
| `ANTHROPIC_API_KEY` | Claude 3.5 API 키 | `sk-ant-...` |
| `VITE_USE_AI_VALIDATION` | AI 검증 활성화 | `true` |

### 선택 환경 변수 (GPT-4o 사용 시)

| 변수명 | 설명 | 값 |
|--------|------|-----|
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-...` |

---

## 📊 배포 확인

배포 완료 후:

1. **Production URL**: https://insureport.pages.dev
2. **Test deployments**: `https://[commit-hash].insureport.pages.dev`

---

## 🐛 문제 해결

### "No Git connection" 오류

**원인**: Git 연동이 끊어진 상태

**해결**:
1. Cloudflare Dashboard → Settings → Git 재연결
2. 또는 수동 배포 사용 (`./deploy.sh`)

### "CLOUDFLARE_API_TOKEN required" 오류

**원인**: API 토큰 미설정

**해결**:
```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
./deploy.sh
```

### "Build failed" 오류

**원인**: 빌드 오류

**해결**:
```bash
# 로컬에서 빌드 테스트
npm run build

# 에러 확인 후 수정
```

---

## 📝 참고 링크

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [API Token 생성](https://dash.cloudflare.com/profile/api-tokens)
