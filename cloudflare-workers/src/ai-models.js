/**
 * ============================================================================
 * 🎯 AI SERVICE - KB Insurance PDF Validator
 * ============================================================================
 * 
 * Strategy: ONE active model at a time for clarity and cost control
 * Switch models by commenting/uncommenting in validate-contracts-r2.js
 * 
 * ============================================================================
 * 📊 AVAILABLE MODELS (status as of 2025-11-27)
 * ============================================================================
 * 
 * ✅ Claude 3.5 Sonnet (Anthropic) - ACTIVE
 *    - Cost: ~$30/1000 calls (4-page PDF)
 *    - API Key: ANTHROPIC_API_KEY ✓ configured
 *    - PDF Vision: ✓ Direct PDF processing
 *    - Korean: ✓ Excellent support
 *    - Status: Working, ready to use
 *    - Best for: Accurate PDF parsing
 * 
 * 🔄 GPT-4o (OpenAI) - AVAILABLE
 *    - Cost: ~$10/1000 calls (4-page PDF)
 *    - API Key: OPENAI_API_KEY (not configured)
 *    - PDF Vision: ✓ Direct PDF processing
 *    - Korean: ✓ Excellent support
 *    - Status: Ready when API key added
 *    - Best for: Balanced cost/accuracy
 * 
 * ============================================================================
 */

/**
 * Claude 3.5 Sonnet - Primary Model
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
  return parseAIResponse(result.content?.[0]?.text);
}

/**
 * GPT-4o - Alternative Model (High accuracy)
 */
export async function validateWithGPT4o(pdfBase64, parsedData, env) {
  const apiKey = env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = buildPrompt(parsedData);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:application/pdf;base64,${pdfBase64}` 
              } 
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return parseAIResponse(result.choices?.[0]?.message?.content);
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

**참고 데이터 (검증 필요):**
계약리스트: ${JSON.stringify(parsedData.계약리스트 || [])}
진단현황: ${JSON.stringify(parsedData.진단현황 || [])}

**추출 규칙:**

A. 보유 계약 리스트
- 5페이지 "보유 계약 리스트" 표에서 추출
- 각 계약마다:
  - 보험사명, 상품명 정확 추출 (보험사: "메리츠화재", 상품명: "(무)상품명")
  - 납입상태: "납입완료"/"완납" → "완료", 그 외 → "진행중"
  - 월보험료: 완료 계약은 0, 진행중은 원본 금액
  - 계약일: YYYY-MM-DD
  - 납입주기, 납입기간, 만기, 가입당시금리 추출
- ⚠️ **월보험료 합계 (매우 중요)**:
  - **절대 계산하지 말 것!**
  - **5페이지 우측 상단**에 있는 "월보험료" 금액을 직접 파싱
  - 이 값을 "총보험료"와 "활성월보험료"에 그대로 사용
  - 예: 5페이지 우측 상단 "월보험료: 153,500원" → 총보험료: 153500
  - 위치: 페이지 상단 요약 정보 섹션 (테이블 위쪽)

B. 진단현황 ⚠️ **매우 중요 - 누락 금지**
- 12페이지 "담보별 진단현황" 표에서 **모든 행** 추출
- **필수**: 테이블의 모든 진단 항목을 빠짐없이 추출하세요
- 각 항목마다 다음 필드 추출:
  - 진단명: 정확한 이름 (예: "사망", "암진단", "뇌출혈진단" 등)
  - 권장금액: 표에서 읽은 그대로 (숫자만)
  - 가입금액: 표에서 읽은 그대로 (숫자만)
  - 부족금액: **반드시 계산** = 권장금액 - 가입금액
    - 양수(+): 부족 → colorClass: "text-red-600 font-bold"
    - 음수(-): 초과 → colorClass: "text-blue-600"
    - 0: 충족 → colorClass: ""
  - 상태: 부족(<70%), 주의(70-99%), 충분(≥100%), 미가입(0)
- **중요**: 참고 데이터에 31개 있으면 PDF에서도 31개 모두 찾아야 함

C. 실효/해지계약
- 섹션 있으면 추출, 없으면 []
- 필드: 상태, 회사명, 상품명, 계약일, 납입주기, 납입기간, 만기, 월보험료

D. 상품별담보
- "상품별 가입담보상세" 섹션에서 상품별 그룹화
- 필드: 상품명, 보험사, 계약자, 피보험자, 납입주기, 납입기간, 만기, 보험기간, 월납보험료
- 담보목록: [{번호, 구분, 회사담보명, 신정원담보명, 가입금액}]

**출력 형식 (JSON):**
\`\`\`json
{
  "계약리스트": [...],
  "실효해지계약": [...],
  "진단현황": [
    {
      "진단명": "사망",
      "권장금액": 100000000,
      "가입금액": 50000000,
      "부족금액": 50000000,
      "colorClass": "text-red-600 font-bold",
      "상태": "부족"
    },
    {
      "진단명": "암진단",
      "권장금액": 50000000,
      "가입금액": 80000000,
      "부족금액": -30000000,
      "colorClass": "text-blue-600",
      "상태": "충분"
    }
  ],
  "상품별담보": [...],
  "수정사항": [...],
  "총보험료": 0,
  "활성월보험료": 0
}
\`\`\`

**주의사항:**
- **원본 PDF가 최우선**: PDF에서 직접 읽은 내용을 사용
- **진단현황 누락 금지**: 12페이지 표의 모든 행을 빠짐없이 추출
- **부족금액 계산 필수**: 권장금액 - 가입금액 (부족=빨강, 초과=파랑)
- **⚠️ 월보험료 합계는 계산 금지**: 5페이지 **우측 상단** "월보험료" 항목에서 직접 파싱
- **데이터 구조 엄수**: 각 필드를 정확한 위치에 배치 (이상한 곳에 붙이지 말 것)
- 보험사명 정확히 확인: "새마을금고중앙회", "KB손해보험", "메리츠화재" 등 PDF에 표기된 그대로
- 불확실한 경우: 빈 칸으로 두거나 null 사용 (추측 금지)
- 모든 계약/담보 포함
`;
}

/**
 * Parse AI response to JSON
 */
function parseAIResponse(text) {
  if (!text) {
    throw new Error('No response from AI');
  }

  try {
    return JSON.parse(text);
  } catch (parseError) {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonText);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}
