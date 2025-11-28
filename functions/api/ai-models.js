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

**📋 추출할 섹션:**

1. **설계사정보** (PDF 표지에서 추출)
   - **설계사명**: 표지 하단의 설계사 이름
   - **전화번호**: 설계사 연락처 (010-XXXX-XXXX 형식)
   - **소속**: "인카다이렉트 IMC사업단" (고정값)
   - **⚠️ 중요**: 표지 페이지 하단에 설계사 이름과 전화번호가 표시됨

2. **고객정보**
   - 고객명, 나이, 성별
   - **보유계약수**: 유지 중인 계약만 ("님의 보유 계약 리스트" 표에서 추출)
   - **월보험료**: 유지 중인 계약의 월보험료 합계

3. **계약리스트** ("님의 보유 계약 리스트" 표)
   각 계약당:
   - 보험사, 상품명, 가입일, 납입방법, 납입기간, 만기나이, 월보험료
   - **상태**: "유지" (보유 계약 리스트에 있는 계약은 모두 유지 중)
   - **납입상태**: "납입중" 또는 "납입완료" (계약일 + 납입기간 계산)
     * 계산 방법: 계약일 + 납입기간 = 납입완료일
     * 오늘 날짜(2025-11-28) > 납입완료일 → "납입완료"
     * 오늘 날짜(2025-11-28) ≤ 납입완료일 → "납입중"
     * 예: 가입일 2010-10-01 + 납입기간 10년 = 2020-10-01 < 2025-11-28 → 납입완료
   - **납입완료보험료**: 납입완료 계약의 경우, 이미 납입한 총 보험료 (월보험료 × 납입기간)

   **⚠️ 중요 - 보유 계약 리스트**: 
   - PDF의 "님의 보유 계약 리스트" 표에 나열된 계약만 추출
   - 이 표는 **현재 유지 중인 계약만** 표시됨

4. **실효해지계약** ("님의 실효/해지 계약 현황" 표)
   각 계약당:
   - 보험사, 상품명, 가입일, 해지일, 해지사유
   - **상태**: "해지" 또는 "실효"
   - **월보험료**: 0 (이미 해지되어 보험료 납입 없음)

   **⚠️ 중요 - 실효/해지 계약**: 
   - PDF의 "님의 실효/해지 계약 현황" 표가 별도로 있음
   - 이 표는 **이미 해지된 계약**만 표시됨
   - 보유 계약 리스트와 **완전히 별개**의 표임

5. **진단현황** ("님의 상품별 진단현황" 표)
   각 진단당:
   - 담보명, 권장금액, 가입금액, 부족금액, 진단 (부족/충분/미가입)

   **⚠️ 중요 - 진단현황 순서**: 
   - PDF의 "님의 상품별 진단현황" 표에 나열된 **순서 그대로** 추출
   - 절대 정렬하지 말고, PDF 표의 상단부터 하단까지 순서대로
   - 예: PDF 표가 "상해사망" → "질병사망" → "일반암" 순이면, JSON도 동일 순서

**🔍 주의사항:**
- 보험사명이 여러 줄에 걸쳐 있으면 합쳐서 하나로 작성
- 금액은 쉼표 제거하고 숫자만 (예: "1,500만" → 15000000)
- 날짜 형식: YYYY-MM-DD
- 담보명 정규화: "상해사망" = "상해 사망" = "상해사망담보"
- **진단현황 순서 중요**: PDF 표의 순서를 절대 변경하지 말 것 (알파벳, 중요도 정렬 금지)

**💰 납입완료 계약 처리:**
- **판단 방법**: 계약일 + 납입기간 = 납입완료일
  * 납입기간이 "10년" → 계약일에서 10년 후
  * 납입기간이 "60세" → 고객 나이 60세가 되는 날
  * 납입기간이 "종신" → 납입중 (평생 납입)
  * 오늘 날짜(2025-11-28)과 비교하여 판단
- 납입완료 계약은 **월보험료가 0원**이어야 함 (더 이상 납입하지 않음)
- 고객정보의 월보험료는 **납입중인 계약만** 합산 (납입완료 제외)
- 납입완료보험료는 별도 계산 (이미 납입한 총액)

**📊 PDF 표 구조 정확히 구분:**
- **"님의 보유 계약 리스트"**: 현재 유지 중인 계약 (월보험료 납입 중)
- **"님의 실효/해지 계약 현황"**: 이미 해지된 계약 (월보험료 납입 없음)
- 이 두 표는 **별도의 표**이며, 절대 합산하지 않음
- 고객정보의 계약수는 "보유 계약 리스트"의 건수만 계산
- 고객정보의 월보험료는 **납입중인 계약만** 합산 (납입완료 계약 제외)

**📅 납입완료일 계산 예시:**
- 계약일 2010-10-01 + 납입기간 10년 = 2020-10-01 (납입완료일)
- 2025-11-28 > 2020-10-01 → 납입완료 ✅
- 계약일 2020-01-01 + 납입기간 20년 = 2040-01-01 (납입완료일)
- 2025-11-28 < 2040-01-01 → 납입중 ✅

**📊 참고 데이터 (오류 가능성 있음):**
${JSON.stringify(parsedData, null, 2)}

**📤 응답 형식 (JSON):**
{
  "설계사정보": {
    "설계사명": "string",
    "전화번호": "010-XXXX-XXXX",
    "소속": "인카다이렉트 IMC사업단"
  },
  "고객정보": {
    "고객명": "string",
    "나이": number,
    "성별": "남자" | "여자",
    "보유계약수": number (유지 중인 계약만, "보유 계약 리스트" 표 기준),
    "월보험료": number (납입중인 계약의 월보험료 합계, 납입완료 제외),
    "납입완료보험료": number (납입완료 계약의 총 납입액)
  },
  "계약리스트": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "납입방법": "월납" | "연납" | "일시납",
      "납입기간": "string",
      "만기나이": "number세" | "종신",
      "월보험료": number (납입중이면 월보험료, 납입완료면 0),
      "납입상태": "납입중" | "납입완료",
      "납입완료보험료": number (납입완료인 경우만, 이미 납입한 총액),
      "상태": "유지"
    }
  ],
  "실효해지계약": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "해지일": "YYYY-MM-DD",
      "해지사유": "string",
      "상태": "해지" | "실효"
    }
  ],
  "진단현황": [
    {
      "담보명": "string",
      "권장금액": number (PDF의 '권장' 또는 '적정금액' 컬럼),
      "가입금액": number,
      "부족금액": number,
      "진단": "부족" | "충분" | "미가입"
    }


**⚠️ 중요 - 진단현황 순서 엄수:**
- PDF "님의 상품별 진단현황" 표의 첫 번째 행부터 마지막 행까지 순서대로
- 절대 알파벳 순으로 정렬하지 말 것
- 절대 중요도나 금액 순으로 정렬하지 말 것
- PDF 표의 시각적 순서를 정확히 보존
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
    
    // 담보별현황은 더 이상 사용하지 않음 (진단현황으로 통합)
    if (parsed.담보별현황) {
      delete parsed.담보별현황;
    }
    
    // 실효해지계약이 없으면 빈 배열로 초기화
    if (!parsed.실효해지계약) {
      parsed.실효해지계약 = [];
    }
    
    // 설계사정보가 없으면 기본값으로 초기화
    if (!parsed.설계사정보) {
      parsed.설계사정보 = {
        설계사명: '',
        전화번호: '',
        소속: '인카다이렉트 IMC사업단'
      };
    }
    
    // 소속이 비어있으면 기본값 설정
    if (!parsed.설계사정보.소속) {
      parsed.설계사정보.소속 = '인카다이렉트 IMC사업단';
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', cleanedText.substring(0, 200));
    throw new Error(`JSON parse error: ${error.message}`);
  }
}
