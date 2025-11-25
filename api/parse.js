// api/parse.js - Vercel Serverless Function
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

  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'text 파라미터가 필요합니다' });
  }

  // 환경 변수에서 API 키 가져오기 (서버에서만 접근 가능)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다' });
  }

  const model = 'gemini-1.5-flash-latest';  // 안정적인 무료 모델
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `다음은 보험 보장분석 PDF에서 추출한 텍스트입니다. 이 내용을 정확하게 분석하여 JSON 형식으로 반환해주세요.

PDF 텍스트:
${text}

다음 형식의 JSON으로 반환해주세요:
{
  "customerInfo": {
    "name": "고객명",
    "age": 나이(숫자),
    "gender": "남" 또는 "여",
    "contractCount": 계약수(숫자),
    "monthlyPremium": 월보험료(숫자, 쉼표 제거)
  },
  "contracts": [
    {
      "company": "보험사명",
      "product": "상품명",
      "startDate": "YYYY-MM-DD",
      "paymentMethod": "납입방식",
      "endDate": "YYYY-MM-DD" 또는 "종신",
      "premium": 보험료(숫자)
    }
  ],
  "coverages": {
    "death": { "current": 금액, "recommended": 금액 },
    "cancer": { "current": 금액, "recommended": 금액 },
    "brainHeart": { "current": 금액, "recommended": 금액 },
    "actualCost": { "current": 금액, "recommended": 금액 }
  },
  "diagnosis": [
    {
      "category": "카테고리명",
      "items": [
        {
          "name": "담보명",
          "current": "금액 또는 상태",
          "status": "부족" | "충분" | "미가입"
        }
      ]
    }
  ]
}

주의사항:
- 숫자는 쉼표 없이 순수 숫자로
- 금액 단위는 만원으로 통일
- 날짜는 YYYY-MM-DD 형식
- JSON만 반환 (설명 없이)`;

  try {
    let response;
    let retries = 0;
    const maxRetries = 3;
    
    // 재시도 로직
    while (retries < maxRetries) {
      response = await fetch(url, {
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
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        })
      });

      // 429 에러면 재시도
      if (response.status === 429 && retries < maxRetries - 1) {
        retries++;
        const waitTime = Math.pow(2, retries) * 1000; // 2초, 4초, 8초
        console.log(`⏳ Rate limit, 재시도 ${retries}/${maxRetries} (${waitTime/1000}초 대기)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      break;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 오류:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Gemini API 오류: ${response.status}`,
        details: errorText
      });
    }


    const data = await response.json();
    
    // Gemini 응답에서 텍스트 추출
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const resultText = data.candidates[0].content.parts[0].text;
      
      // JSON 추출 (```json ``` 마크다운 제거)
      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       resultText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const parsedData = JSON.parse(jsonText);
        return res.status(200).json(parsedData);
      }
    }

    return res.status(500).json({ 
      error: 'Gemini 응답 파싱 실패',
      rawResponse: data
    });

  } catch (error) {
    console.error('파싱 오류:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
