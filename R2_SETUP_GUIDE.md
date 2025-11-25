# Cloudflare R2 설정 가이드

## 🎯 목적

Vercel의 4.5MB 페이로드 제한을 회피하여 대용량 PDF(10MB, 50MB, 100MB+)를 처리하기 위해 Cloudflare R2 스토리지를 사용합니다.

## 📊 비용

| 항목 | 무료 한도 | 초과 시 비용 |
|------|-----------|--------------|
| 저장 용량 | 10GB/월 | $0.015/GB |
| Class A 작업 (업로드) | 100만건/월 | $4.50/백만건 |
| Class B 작업 (다운로드) | 1000만건/월 | $0.36/백만건 |
| **Egress (다운로드 트래픽)** | **무제한 무료** | **$0** 🎉 |

**예상 비용**: 월 100회 업로드 (평균 5MB) = **~$0.01/월**

---

## 🚀 설정 단계

### Step 1: Cloudflare 계정 생성

1. https://dash.cloudflare.com/ 접속
2. 계정이 없다면 "Sign Up" (무료)
3. 이메일 인증 완료

### Step 2: R2 활성화

1. 대시보드 좌측 메뉴 → **R2**
2. **"Purchase R2 Plan"** 클릭
3. 결제 정보 입력 (무료 한도 내 사용 시 과금 없음)
   - 💳 **신용카드 등록 필수** (무료 한도 초과 시에만 과금)

### Step 3: R2 버킷 생성

1. R2 페이지에서 **"Create bucket"** 클릭
2. 설정:
   - **Bucket name**: `insu-report-pdfs` (또는 원하는 이름)
   - **Location**: `Automatic` (권장)
3. **"Create bucket"** 클릭

### Step 4: R2 API 토큰 생성

1. R2 페이지 우측 상단 → **"Manage R2 API Tokens"**
2. **"Create API Token"** 클릭
3. 설정:
   - **Token name**: `insu-report-api-token`
   - **Permissions**: 
     - ✅ `Object Read & Write` (읽기/쓰기)
   - **TTL**: `Forever` (만료 없음)
   - **Bucket**: `insu-report-pdfs` (또는 생성한 버킷 이름)
4. **"Create API Token"** 클릭
5. **중요**: 표시된 정보를 안전하게 저장
   ```
   Access Key ID: abc123...
   Secret Access Key: xyz789...
   ```
   ⚠️ **Secret Access Key는 한 번만 표시됩니다!**

### Step 5: 계정 ID 확인

1. R2 페이지 우측에서 **Account ID** 확인
   - 예: `1a2b3c4d5e6f7g8h9i0j`
2. 복사해두기

### Step 6: Vercel 환경 변수 설정

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 4개 변수 추가:

| Variable | Value | 예시 |
|----------|-------|------|
| `R2_ACCOUNT_ID` | 계정 ID | `1a2b3c4d5e6f7g8h9i0j` |
| `R2_ACCESS_KEY_ID` | Access Key ID | `abc123def456...` |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key | `xyz789uvw012...` |
| `R2_BUCKET_NAME` | 버킷 이름 | `insu-report-pdfs` |

4. **"Save"** 클릭
5. **재배포** (Vercel이 자동으로 트리거되거나 수동 배포)

---

## 🧪 테스트

### 1. 로컬 테스트

`.env.local` 파일 생성:
```env
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=insu-report-pdfs
GEMINI_API_KEY=your-gemini-key
VITE_USE_AI_VALIDATION=true
```

로컬 서버 실행:
```bash
npm run dev
```

### 2. 프로덕션 테스트

1. 3MB 이상 PDF 업로드
2. 브라우저 콘솔 확인:
   ```
   📦 대용량 PDF 감지 (3.5MB > 2.8MB), R2 경로 사용
   📤 R2 업로드 시작: sample.pdf (3.50MB)
   ✅ Pre-signed URL 생성 완료: pdfs/1234567890-abc123-sample.pdf
   📤 R2에 파일 업로드 중...
   ✅ R2 업로드 완료: pdfs/1234567890-abc123-sample.pdf
   📄 규칙 기반 PDF 파싱 시작...
   ✅ 규칙 기반 파싱 완료
   🤖 R2 기반 AI 검증 시작...
   ✅ AI 검증 완료
   ```

---

## 🔒 보안 체크리스트

- ✅ API 토큰은 **읽기/쓰기 권한**만 부여 (삭제 권한 불필요)
- ✅ 토큰은 **특정 버킷**으로 제한
- ✅ 토큰은 **절대 코드에 포함하지 않기** (환경 변수로만 관리)
- ✅ `.env.local` 파일은 `.gitignore`에 포함되어 있음
- ✅ Vercel 환경 변수는 **서버 전용** (클라이언트 노출 안됨)

---

## 🔄 동작 방식

### 일반 PDF (≤ 2.8MB)
```
클라이언트 → PDF 압축 (필요시)
    ↓
클라이언트 → Vercel Function (Base64)
    ↓
Vercel → Gemini API
    ↓
결과 반환
```

### 대용량 PDF (> 2.8MB)
```
클라이언트 → Pre-signed URL 요청
    ↓
Vercel → Pre-signed URL 생성
    ↓
클라이언트 → R2에 PDF 직접 업로드 (Vercel 안 거침!)
    ↓
클라이언트 → Vercel에 fileKey만 전송 (< 1KB)
    ↓
Vercel → R2에서 PDF 다운로드
    ↓
Vercel → Gemini API
    ↓
결과 반환
```

---

## ❓ 문제 해결

### 1. "R2 storage not configured"

➡️ Vercel 환경 변수 4개가 모두 설정되어 있는지 확인
➡️ 변수 이름 오타 확인 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` 등)
➡️ 재배포 후 테스트

### 2. "Access Denied"

➡️ API 토큰 권한 확인 (Object Read & Write)
➡️ 버킷 이름이 정확한지 확인
➡️ 토큰이 만료되지 않았는지 확인

### 3. "Bucket not found"

➡️ `R2_BUCKET_NAME`이 실제 버킷 이름과 일치하는지 확인
➡️ Cloudflare 대시보드에서 버킷이 존재하는지 확인

### 4. R2 업로드는 되는데 AI 검증 실패

➡️ `GEMINI_API_KEY`가 설정되어 있는지 확인
➡️ `VITE_USE_AI_VALIDATION=true` 확인
➡️ Gemini API 할당량 확인

---

## 📈 모니터링

### Cloudflare 대시보드

1. R2 → 버킷 선택
2. **"Metrics"** 탭에서 확인:
   - 저장 용량 사용량
   - 작업 횟수 (Class A/B)
   - 무료 한도 대비 사용률

### Vercel 로그

1. Vercel 대시보드 → 프로젝트
2. **"Logs"** 탭
3. `/api/get-upload-url` 및 `/api/validate-contracts-r2` 로그 확인

---

## 💰 비용 최적화

### 자동 삭제 정책 (선택사항)

임시 파일은 자동으로 삭제하여 저장 용량 절약:

1. R2 대시보드 → 버킷 → **"Settings"**
2. **"Lifecycle Rules"** → **"Add rule"**
3. 설정:
   - **Rule name**: `auto-delete-old-pdfs`
   - **Delete after**: `7 days` (또는 원하는 기간)
4. **"Save"**

### 예상 월 비용 계산

```
업로드 횟수: 500회/월
평균 PDF 크기: 5MB
저장 기간: 7일 (자동 삭제)

저장 용량: 500 × 5MB × (7/30) = 583MB < 10GB (무료)
Class A: 500회 < 100만회 (무료)
Class B: 500회 < 1000만회 (무료)
Egress: 무제한 (무료)

총 비용: $0/월 🎉
```

---

## 🎓 추가 학습 자료

- [Cloudflare R2 공식 문서](https://developers.cloudflare.com/r2/)
- [R2 가격 정책](https://developers.cloudflare.com/r2/pricing/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Pre-signed URL 개념](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

## ✅ 설정 완료 확인

- [ ] Cloudflare 계정 생성 완료
- [ ] R2 활성화 및 결제 정보 등록
- [ ] 버킷 생성 (`insu-report-pdfs`)
- [ ] API 토큰 생성 및 저장
- [ ] 계정 ID 확인
- [ ] Vercel 환경 변수 4개 설정
- [ ] 코드 배포 완료
- [ ] 테스트 PDF 업로드 성공
- [ ] 브라우저 콘솔에서 R2 로그 확인

**모두 체크되면 설정 완료!** 🎊
