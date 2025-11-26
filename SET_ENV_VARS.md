# AI 검증 활성화 방법

## 필수 Environment Variables 설정

### Dashboard 접속
https://dash.cloudflare.com/

### 경로
Workers & Pages → **insureport** → **Settings** → **Environment variables**

---

## 설정할 변수

### 1. VITE_USE_AI_VALIDATION (필수)
```
Name: VITE_USE_AI_VALIDATION
Type: Text
Value: true
Environment: Production & Preview
```

### 2. GEMINI_API_KEY (필수)
```
Name: GEMINI_API_KEY
Type: Secret
Value: [Your Gemini API Key]
Environment: Production & Preview
```

**Gemini API Key 발급**: https://aistudio.google.com/app/apikey

---

## 선택 변수 (추가 AI 모델)

### 3. OPENAI_API_KEY (선택)
```
Name: OPENAI_API_KEY
Type: Secret
Value: [Your OpenAI API Key]
```

### 4. ANTHROPIC_API_KEY (선택)
```
Name: ANTHROPIC_API_KEY
Type: Secret
Value: [Your Anthropic API Key]
```

---

## 설정 후

1. **Save** 클릭
2. 자동으로 재배포됨
3. 또는 **Deployments** → **Retry deployment**

---

## 테스트

재배포 후 PDF 업로드하면:
```
✅ R2 업로드 완료
✅ 규칙 기반 파싱 완료
🤖 AI 검증 시작... ← 이제 나타남!
✅ AI 검증 완료
```

