import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Gemini AI 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 미들웨어
app.use(cors());
app.use(express.json());

// 메모리 저장소 설정 (파일은 메모리에만 저장)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/validate-contracts
 * PDF 파일과 파싱 데이터를 받아 Gemini로 검증
 */
app.post('/api/validate-contracts', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF 파일이 필요합니다.' });
    }

    if (!req.body.parsedData) {
      return res.status(400).json({ error: '파싱 데이터가 필요합니다.' });
    }

    const parsedData = JSON.parse(req.body.parsedData);
    const pdfBuffer = req.file.buffer;

    console.log('🤖 AI 검증 요청 수신');

    // Gemini 2.0 Flash 모델 설정
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    // PDF를 Base64로 변환
    const pdfData = {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    // 프롬프트 구성
    const prompt = `
당신은 KB 보험 보장분석 리포트 전문 검증 시스템입니다.

**임무:**
원본 PDF의 "보유 계약 리스트" 섹션을 분석하여 아래 규칙 기반 파싱 결과를 검증하고 수정하세요.

**규칙 기반 파싱 결과:**
\`\`\`json
${JSON.stringify(parsedData.계약리스트 || [], null, 2)}
\`\`\`

**검증 및 수정 규칙:**

1. **보험사명 정확성:**
   - 원본 PDF에서 정확한 보험사명을 추출하세요
   - 예: "메리츠", "메리츠화재", "삼성생명", "교보생명", "DB손보" 등
   - "(무)" 접두사는 상품명에 포함되므로 보험사로 인식하지 마세요
   - "—" (em dash) 기호는 무시하세요
   - 보험사명이 없으면 빈 문자열("")로 표시

2. **상품명 정확성:**
   - 원본 PDF의 정확한 상품명을 추출하세요
   - "(무)", "(무배당)" 등의 접두사는 상품명에 포함
   - 보험사명과 중복되지 않도록 주의

3. **납입 상태 추론:**
   - 원본 PDF에서 "납입완료", "완납", "종료" 등의 표시가 있는지 확인
   - 납입기간이 만료되었거나 완료 표시가 있으면 "완료"
   - 그 외에는 "진행중"으로 설정

4. **월보험료 검증:**
   - 원본 PDF의 월보험료 컬럼 값과 비교
   - 납입 완료 계약의 경우 월보험료는 0으로 설정
   - 숫자만 추출 (쉼표, "원" 등 제거)

5. **계약일 형식:**
   - YYYY-MM-DD 형식으로 통일

6. **기타 필드:**
   - 납입주기, 납입기간, 만기, 가입당시금리는 원본 PDF 기준으로 정확히 추출

**출력 형식 (JSON):**
\`\`\`json
{
  "계약리스트": [
    {
      "번호": 1,
      "보험사": "메리츠화재",
      "상품명": "(무) New리치하우스가정종합보험1907",
      "계약일": "2019-08-26",
      "가입당시금리": "2.5%",
      "납입주기": "월납",
      "납입기간": "20년",
      "만기": "80세",
      "월보험료": 15000,
      "납입상태": "진행중"
    }
  ],
  "수정사항": [
    "2번 계약: 보험사 '메리츠화재' 추가",
    "4번 계약: 상품명 추가",
    "8번 계약: 납입상태를 '완료'로 변경, 월보험료를 0으로 수정"
  ],
  "총보험료": 456171,
  "활성월보험료": 319821
}
\`\`\`

**주의사항:**
- 원본 PDF 내용을 최우선으로 하세요
- 불확실한 정보는 규칙 기반 파싱 결과를 유지하세요
- 모든 계약을 빠짐없이 포함하세요
- 총보험료는 모든 계약의 월보험료 합계
- 활성월보험료는 납입상태가 "진행중"인 계약의 월보험료 합계
`;

    // Gemini API 호출
    const result = await model.generateContent([prompt, pdfData]);
    const responseText = result.response.text();

    console.log('✅ Gemini 검증 완료');

    // JSON 파싱
    const validatedData = JSON.parse(responseText);

    res.json({
      validated: true,
      data: {
        ...parsedData,
        계약리스트: validatedData.계약리스트 || parsedData.계약리스트,
      },
      corrections: validatedData.수정사항 || [],
      totalPremium: validatedData.총보험료,
      activePremium: validatedData.활성월보험료,
      message: 'Validated by Gemini 2.0 Flash',
    });
  } catch (error) {
    console.error('❌ AI 검증 오류:', error);
    res.status(500).json({
      validated: false,
      error: error.message,
      message: 'Validation failed',
    });
  }
});

/**
 * GET /api/health
 * 헬스 체크
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    geminiConfigured: !!process.env.GEMINI_API_KEY 
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버 시작: http://localhost:${PORT}`);
  console.log(`🔑 Gemini API 키: ${process.env.GEMINI_API_KEY ? '설정됨 ✅' : '미설정 ❌'}`);
});
