/**
 * ============================================================================
 * 🤖 AI VALIDATION SERVICE - KB Insurance PDF Validator
 * ============================================================================
 * 
 * Supported Models: Google Gemini & Anthropic Claude
 * Switch between models by commenting/uncommenting in validate-contracts.js
 * 
 * ============================================================================
 * 📊 AVAILABLE MODELS
 * ============================================================================
 * 
 * ✅ Google Gemini 2.0 Flash (Primary - Recommended)
 *    - Cost: FREE (Rate limited) or ~$0.075 per 1M tokens
 *    - API Key: GEMINI_API_KEY
 *    - PDF Processing: ✓ Native PDF support
 *    - Korean: ✓ Excellent support
 *    - JSON Output: ✓ Native JSON mode
 *    - Model: gemini-2.0-flash-exp
 *    - Best for: Cost-effective, fast, accurate
 * 
 * ✅ Anthropic Claude Sonnet 4.5 (Alternative - High Accuracy)
 *    - Cost: ~$100/1000 calls (4-page PDF)
 *    - API Key: ANTHROPIC_API_KEY
 *    - PDF Processing: ✓ Direct PDF processing
 *    - Korean: ✓ Excellent support
 *    - JSON Output: ✓ Stable format
 *    - Model: claude-sonnet-4-5-20250929
 *    - Best for: Maximum accuracy, no item omission
 * 
 * ============================================================================
 */

/**
 * Google Gemini 2.0 Flash - Primary Model (Free/Low Cost)
 */
export async function validateWithGemini(pdfBase64, parsedData, env) {
  const apiKey = env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = buildPrompt(parsedData);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: pdfBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  return parseAIResponse(aiResponse);
}

/**
 * Anthropic Claude Sonnet 4.5 - Alternative Model (High Accuracy)
 */
export async function validateWithClaude(pdfBase64, parsedData, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const prompt = buildPrompt(parsedData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const aiResponse = result.content?.[0]?.text;
  
  return parseAIResponse(aiResponse);
}

/**
 * Build validation prompt
 */
function buildPrompt(parsedData) {
  return `
KB 보험 보장분석 리포트 검증 시스템. 원본 PDF에서 4개 섹션 추출 및 검증.

**⚠️ 중요 지침:**
1. 아래 "참고 데이터"는 규칙 기반 파싱 결과로, **오류가 있을 수 있습니다**
2. **반드시 원본 PDF를 직접 읽고** 데이터를 추출하세요
3. PDF 내용과 참고 데이터가 다르면 **PDF 내용이 항상 우선**입니다
4. 참고 데이터는 구조 파악용으로만 사용하세요

**📋 추출할 4개 섹션:**

1. **고객정보**
   - 고객명, 나이, 성별, 계약수, 월보험료

2. **계약리스트** (전체 보험 계약 목록)
   각 계약당:
   - 보험사, 상품명, 가입일, 납입방법, 납입기간, 만기나이, 월보험료, 상태

   **⚠️ 중요**: 
   - 해지된 계약도 **반드시 포함**하되, 상태를 "해지"로 표시
   - 해지된 계약의 월보험료는 0원 또는 원래 금액 (해지일 기준)
   - 해지일과 해지사유가 있으면 함께 기록

3. **담보별현황** (보장항목별 가입금액 및 충족률)
   각 담보당:
   - 담보명, 가입금액, 적정금액, 부족금액, 충족률

4. **진단현황** (담보별 부족/충분/미가입 진단)
   각 진단당:
   - 담보명, 가입금액, 적정금액, 부족금액, 진단 (부족/충분/미가입)

**🔍 주의사항:**
- 보험사명이 여러 줄에 걸쳐 있으면 합쳐서 하나로 작성
- 금액은 쉼표 제거하고 숫자만 (예: "1,500만" → 15000000)
- 날짜 형식: YYYY-MM-DD
- 해지된 계약: 상태="해지", 해지일/해지사유 기록
- 담보명 정규화: "상해사망" = "상해 사망" = "상해사망담보"

**📊 참고 데이터 (오류 가능성 있음):**
${JSON.stringify(parsedData, null, 2)}

**📤 응답 형식 (JSON):**
{
  "고객정보": {
    "고객명": "string",
    "나이": number,
    "성별": "남자" | "여자",
    "계약수": number,
    "월보험료": number
  },
  "계약리스트": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "납입방법": "월납" | "연납" | "일시납",
      "납입기간": "string",
      "만기나이": "number세" | "종신",
      "월보험료": number,
      "상태": "유지" | "해지" | "실효",
      "해지일": "YYYY-MM-DD" (해지인 경우),
      "해지사유": "string" (해지인 경우)
    }
  ],
  "담보별현황": [
    {
      "담보명": "string",
      "가입금액": number,
      "적정금액": number,
      "부족금액": number,
      "충족률": "XX%"
    }
  ],
  "진단현황": [
    {
      "담보명": "string",
      "가입금액": number,
      "적정금액": number,
      "부족금액": number,
      "진단": "부족" | "충분" | "미가입"
    }
  ],
  "총보험료": number,
  "활성월보험료": number (해지/실효 제외),
  "수정사항": ["string"] (참고 데이터 대비 수정한 내용)
}
`;
}

/**
 * Parse AI response
 */
function parseAIResponse(responseText) {
  if (!responseText) {
    throw new Error('Empty AI response');
  }

  // Remove markdown code blocks if present
  let cleanedText = responseText.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/```\n?/g, '');
  }

  try {
    const parsed = JSON.parse(cleanedText);
    
    // Validate required fields
    if (!parsed.고객정보 || !parsed.계약리스트 || !parsed.진단현황) {
      throw new Error('Missing required fields in AI response');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', cleanedText.substring(0, 200));
    throw new Error(`JSON parse error: ${error.message}`);
  }
}
