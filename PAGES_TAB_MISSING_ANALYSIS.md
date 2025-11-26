# Pages 탭이 안 보이는 문제 분석

## 관찰된 사실
1. `insurance-crm`, `insucrm` - Pages 프로젝트로 성공적으로 생성됨
2. `insu-report`, `insu-report-app` - 모두 Workers로 생성됨
3. Dashboard에 "Pages 탭"이 안 보임

## 가능한 원인

### 1. GitHub Repository 이름 문제
- 성공: `insurance-crm`, `insucrm` (소문자, 하이픈)
- 실패: `InsuReport` (대문자 포함)
- Cloudflare가 대문자 포함 repo를 Workers로 인식?

### 2. Repository 설정 문제
- `InsuReport` 저장소에 특정 설정이 있을 수 있음
- GitHub Actions, Vercel 연동 등

### 3. Cloudflare 계정별 제한
- 특정 repository만 Pages로 생성 가능
- 새 repository는 자동으로 Workers로 인식

### 4. 이전 배포 이력
- `InsuReport`가 이전에 Vercel에 배포됨
- Cloudflare가 이 이력을 감지

## 해결 시도 방안

### A. 새 Repository 생성 (가장 확실)
```
새 repo: insureport (소문자만, 성공 사례 패턴)
InsuReport → insureport
```

### B. Repository 이름 변경
```
GitHub: InsuReport → insu-report
```

### C. Wrangler CLI 강제 생성
```bash
npx wrangler pages project create insureport --production-branch=main
```

### D. 성공한 프로젝트 복제
```
insurance-crm 프로젝트의 정확한 생성 과정 재현
```

