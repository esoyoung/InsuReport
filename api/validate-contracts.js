// api/validate-contracts.js - Vercel Serverless Function for AI Contract Validation
import { GoogleGenerativeAI } from '@google/generative-ai';

// Vercel Serverless Functions config
// 주의: Vercel 페이로드 제한은 4.5MB (Hobby) / 4.5MB (Pro)
// Base64 인코딩 시 크기가 33% 증가하므로 실제 PDF는 ~3MB 이하여야 함
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // 최대 10MB body parser 허용
    },
  },
  maxDuration: 60, // 최대 60초 실행 (Vercel Pro 플랜 필요)
};

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Preflight 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, parsedData } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'pdfBase64가 필요합니다.' });
    }

    if (!parsedData) {
      return res.status(400).json({ error: 'parsedData가 필요합니다.' });
    }

    // 환경 변수에서 API 키 가져오기 (서버에서만 접근 가능)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다' });
    }

    console.log('🤖 AI 검증 요청 수신');

    // Gemini AI 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Gemini 1.5 Flash 모델 설정 (안정적인 무료 모델)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    // PDF 데이터 구성
    const pdfData = {
      inlineData: {
        data: pdfBase64,
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
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI 검증 완료');

    // JSON 파싱
    let validatedData;
    try {
      validatedData = JSON.parse(text);
    } catch (parseError) {
      // JSON 파싱 실패 시 마크다운 코드 블록 제거 시도
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        validatedData = JSON.parse(jsonText);
      } else {
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    return res.status(200).json(validatedData);

  } catch (error) {
    console.error('❌ AI 검증 중 오류:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
