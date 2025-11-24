/**
 * AI 기반 PDF 텍스트 분석
 * Gemini API를 사용하여 보험 데이터 추출
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * AI를 사용하여 보험 데이터 추출
 */
export async function parseWithAI(pdfText) {
  if (!GEMINI_API_KEY) {
    console.error('❌ Gemini API Key가 설정되지 않았습니다');
    throw new Error('Gemini API Key가 필요합니다. .env 파일에 VITE_GEMINI_API_KEY를 설정하세요.');
  }

  const prompt = `
다음은 보험 보장분석 리포트 PDF에서 추출한 텍스트입니다.
이 텍스트를 분석하여 구조화된 JSON 형식으로 데이터를 추출해주세요.

=== PDF 텍스트 ===
${pdfText}
===================

다음 형식의 JSON을 반환해주세요:

{
  "customerInfo": {
    "name": "고객명",
    "age": 나이(숫자),
    "gender": "남자 또는 여자",
    "contractCount": 총 계약수(숫자),
    "monthlyPremium": 월 보험료(숫자, 콤마 제거),
    "reportDate": "YYYY-MM-DD"
  },
  "contracts": [
    {
      "no": 번호(숫자),
      "company": "보험사명",
      "productName": "상품명",
      "startDate": "YYYY-MM-DD",
      "paymentType": "월납 또는 년납",
      "paymentPeriod": "납입기간",
      "maturityAge": "만기",
      "premium": 월보험료(숫자)
    }
  ],
  "coverages": [
    {
      "key": "영문키",
      "name": "담보명",
      "category": "카테고리",
      "current": 현재보장금액(만원단위숫자),
      "recommended": 권장보장금액(만원단위숫자)
    }
  ],
  "diagnosis": [
    {
      "coverageName": "담보명",
      "current": 현재보장(만원단위숫자),
      "recommended": 권장보장(만원단위숫자),
      "difference": 차액(만원단위숫자, +/-),
      "status": "부족, 충분, 미가입 중 하나"
    }
  ]
}

중요한 규칙:
1. 숫자는 콤마(,)를 제거하고 순수 숫자로 변환
2. 금액은 만원 단위로 통일
3. 날짜는 YYYY-MM-DD 형식
4. 찾을 수 없는 정보는 빈 문자열("") 또는 0으로 표시
5. JSON만 반환하고 다른 설명은 추가하지 마세요
6. 반드시 유효한 JSON 형식이어야 합니다
`;

  try {
    console.log('🤖 Gemini AI로 분석 시작...');
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1, // 낮은 온도로 일관성 있는 결과
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Gemini API 응답이 비어있습니다');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('🤖 AI 응답:', generatedText.substring(0, 500));

    // JSON 추출 (코드 블록 제거)
    let jsonText = generatedText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // JSON 파싱
    const parsedData = JSON.parse(jsonText);
    
    console.log('✅ AI 파싱 완료:', {
      고객명: parsedData.customerInfo.name,
      계약수: parsedData.contracts.length,
      담보수: parsedData.coverages.length,
      진단수: parsedData.diagnosis.length
    });

    return parsedData;

  } catch (error) {
    console.error('❌ AI 파싱 실패:', error);
    throw error;
  }
}

/**
 * AI 파싱 실패 시 폴백: 기존 정규식 파싱
 */
export async function parseWithFallback(pdfText, regularParser) {
  try {
    // 먼저 AI로 시도
    const aiResult = await parseWithAI(pdfText);
    return {
      ...aiResult,
      parsingMethod: 'AI'
    };
  } catch (error) {
    console.warn('⚠️ AI 파싱 실패, 정규식 파싱으로 폴백:', error.message);
    
    // AI 실패 시 기존 정규식 파싱
    const fallbackResult = regularParser(pdfText);
    return {
      ...fallbackResult,
      parsingMethod: 'Regex'
    };
  }
}
