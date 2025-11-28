# 📚 프로젝트 문서 및 참조 자료

이 폴더는 InsuReport 프로젝트의 참조 문서, 이미지, 샘플 데이터를 관리합니다.

## 📁 폴더 구조

```
docs/
├── references/     - 참조 문서 (가이드, 용어집, 사양서 등)
├── images/         - 참조 이미지 (스크린샷, 다이어그램, UI 목업 등)
├── samples/        - 샘플 PDF (테스트용 보장분석 리포트)
└── api/            - API 관련 문서
```

---

## 📄 references/ - 참조 문서

프로젝트 이해에 필요한 문서를 저장합니다.

**추천 파일 종류**:
- KB 보장분석 가이드
- 보험 용어집
- 제품 카탈로그
- 업무 프로세스 문서
- 법규 및 규정 문서

**예시**:
```
references/
├── kb-insurance-guide.pdf
├── insurance-terms.xlsx
├── product-catalog.pdf
└── business-process.docx
```

---

## 🖼️ images/ - 참조 이미지

시각적 참조 자료를 저장합니다.

**추천 파일 종류**:
- KB 리포트 구조 스크린샷
- UI/UX 디자인 목업
- 워크플로우 다이어그램
- 테이블 레이아웃 예시
- 로고 및 브랜딩 에셋

**예시**:
```
images/
├── kb-report-structure.jpg
├── ui-design-mockup.png
├── workflow-diagram.png
└── table-layout-example.png
```

**Git 포함**: ✅ 이미지는 Git에 커밋됨

---

## 📋 samples/ - 샘플 PDF

테스트용 KB 보장분석 PDF를 저장합니다.

**용도**:
- AI 파싱 테스트
- UI 검증
- 버그 재현
- 데모 및 프레젠테이션

**예시**:
```
samples/
├── sample-report-1.pdf
├── sample-report-2.pdf
└── edge-case-example.pdf
```

**Git 포함**: ⚠️ 대용량 파일은 제외 (`.gitignore` 참고)
- 작은 샘플(< 1MB): Git에 포함 가능
- 큰 파일: 다운로드 링크만 README에 기재

---

## 🔧 api/ - API 문서

AI API 관련 참조 문서를 저장합니다.

**추천 파일 종류**:
- Gemini API 사용법
- Claude API 레퍼런스
- API 키 관리 가이드
- 에러 코드 정리

**예시**:
```
api/
├── gemini-api-reference.md
├── claude-api-reference.md
└── api-error-codes.md
```

---

## 📝 사용 가이드

### 파일 추가하기

1. **로컬에서** (본인 컴퓨터):
   ```bash
   # 저장소 클론
   git clone https://github.com/esoyoung/InsuReport.git
   cd InsuReport
   
   # 파일 추가
   cp /path/to/document.pdf docs/references/
   
   # Git 커밋
   git add docs/references/document.pdf
   git commit -m "docs: add reference document"
   git push origin main
   ```

2. **GitHub 웹에서**:
   - 저장소 → `docs/references/` 폴더 이동
   - **Add file** → **Upload files**
   - 파일 드래그 앤 드롭
   - **Commit changes**

### 파일 확인하기

- **GitHub**: https://github.com/esoyoung/InsuReport/tree/main/docs
- **로컬**: 프로젝트 폴더의 `docs/` 디렉토리

---

## ⚠️ 주의사항

### 1. 개인정보 보호
- ❌ 실제 고객 정보가 포함된 PDF 업로드 금지
- ✅ 테스트용 샘플은 개인정보 제거 후 업로드

### 2. 파일 크기 관리
- ❌ 10MB 이상 파일은 Git에 올리지 마세요
- ✅ 대용량 파일은 Google Drive 등에 저장하고 링크만 기재

### 3. 파일명 규칙
- ✅ 영문 소문자 + 하이픈 사용: `kb-report-sample.pdf`
- ❌ 한글, 공백, 특수문자 지양: `KB 리포트 샘플(최종).pdf`
- ✅ 버전 표기: `design-mockup-v2.png`

---

## 🔗 관련 문서

- [프로젝트 README](../README.md)
- [AI 설정 가이드](../AI_SETUP.md)
- [배포 가이드](../DEPLOYMENT.md)

---

**업데이트**: 2025-11-28  
**관리**: 프로젝트 팀
