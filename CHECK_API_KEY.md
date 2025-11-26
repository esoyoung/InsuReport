# 🔍 AI 검증 실패 원인 확인

## ❌ **에러 메시지**
```
POST /api/validate-contracts-r2 500 (Internal Server Error)
{"error":"All AI models failed"}
```

---

## 🎯 **가능한 원인**

### 1. GEMINI_API_KEY가 설정되지 않음 (가장 가능성 높음)

Dashboard에서 확인 필요:
1. https://dash.cloudflare.com/
2. Workers & Pages → `insureport`
3. Settings → Variables and Secrets
4. **GEMINI_API_KEY**가 Secret으로 설정되어 있는지 확인

**Expected**:
- Type: **Secret** (not Text!)
- Name: `GEMINI_API_KEY`
- Value: `AI*******************************` (암호화되어 표시됨)
- Environment: **Production** (체크박스 선택됨)

---

### 2. API 키가 잘못됨

Gemini API 키 재확인:
1. https://aistudio.google.com/app/apikey 접속
2. API 키 확인 또는 재생성
3. Dashboard에서 업데이트

---

### 3. API 할당량 초과 (가능성 낮음)

첫 번째 PDF(`강민재_kb보장분석.pdf`)는 성공했으므로 가능성 낮음.

---

## ✅ **해결 방법**

### Step 1: Dashboard 확인

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com/

2. **insureport 프로젝트 선택**
   - Workers & Pages → insureport

3. **Variables and Secrets 확인**
   - Settings → Variables and Secrets
   - `GEMINI_API_KEY` 존재 여부 확인
   - Environment: Production 체크 여부 확인

---

### Step 2: API 키 재설정 (필요시)

만약 `GEMINI_API_KEY`가 없거나 잘못되었다면:

1. **Gemini API 키 확인**
   - https://aistudio.google.com/app/apikey
   - 기존 키 확인 또는 "Create API Key" 클릭

2. **Dashboard에 추가**
   - Variables and Secrets → Add
   - Type: **Secret** 선택 (중요!)
   - Variable name: `GEMINI_API_KEY`
   - Value: (복사한 API 키)
   - Environment: **Production** 체크

3. **저장 후 재배포**
   - Save 클릭
   - Deployments 탭 → Retry deployment

---

### Step 3: 로그 확인 (선택사항)

Cloudflare Dashboard에서 실시간 로그 확인:
1. Workers & Pages → insureport
2. 오른쪽 상단 "Begin log stream" 클릭
3. PDF 업로드 다시 시도
4. 에러 메시지 확인

예상 로그:
```
❌ Error: Gemini API key not found in env.GEMINI_API_KEY
```
또는
```
❌ Error: Gemini API returned 401 Unauthorized
```

---

## 🤔 **의문점**

### 첫 번째 PDF는 왜 성공했나?

```
🤖 R2 기반 AI 검증 시작...
🤖 R2 기반 AI 검증 요청...
✅ R2 기반 AI 검증 완료  ← 성공!
```

**가능한 설명**:
1. 첫 PDF는 캐시된 응답일 수 있음
2. 또는 실제로는 AI 검증 없이 규칙 기반 결과만 반환했을 수도 있음

**확인 방법**:
- Cloudflare Dashboard → Deployments → Latest → Logs
- 첫 번째 업로드 시 실제 Gemini API 호출 로그가 있는지 확인

---

## 📊 **비교: 성공 vs 실패**

| PDF | 결과 | 에러 |
|-----|------|------|
| 강민재_kb보장분석.pdf (6.93MB) | ✅ 성공 | 없음 |
| 안영균_kb보장분석.pdf (6.63MB) | ❌ 실패 | "All AI models failed" |

**차이점**: 두 번째 PDF가 더 복잡하거나 페이지가 많음 (29 pages vs 21 pages)

---

## 🚀 **즉시 해결 방법**

### 방법 1: Dashboard에서 API 키 확인

1. https://dash.cloudflare.com/
2. insureport → Settings → Variables and Secrets
3. `GEMINI_API_KEY` 확인
4. 스크린샷 공유 (API 키 값은 가려서)

---

### 방법 2: 로그 스트림 확인

1. insureport → "Begin log stream" 클릭
2. PDF 업로드 재시도
3. 로그 메시지 복사 및 공유

---

### 방법 3: API 키 재설정

만약 `GEMINI_API_KEY`가 Secret이 아니라 Text로 설정되었다면:
1. 기존 변수 삭제
2. **Secret** 타입으로 재생성
3. Production 환경 체크
4. 재배포

---

## 🎯 **다음 단계**

**지금 바로 확인해주세요**:
1. Dashboard → insureport → Settings → Variables and Secrets
2. `GEMINI_API_KEY` 존재 여부 및 타입 확인 (Secret이어야 함)
3. 스크린샷 공유

그러면 정확한 원인을 찾고 즉시 해결하겠습니다! 🔧
