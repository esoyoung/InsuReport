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
 * ✅ Claude Sonnet 4.5 (Anthropic) - ACTIVE
 *    - Cost: ~$100/1000 calls (4-page PDF)
 *    - API Key: ANTHROPIC_API_KEY ✓ configured
 *    - PDF Vision: ✓ Direct PDF processing
 *    - Korean: ✓ Excellent support
 *    - Status: Stable, accurate JSON output
 *    - Best for: Accurate PDF parsing, no item omission
 *    - Model: claude-sonnet-4-5-20250929
 * 
 * ⚠️ Claude 3.5 Haiku (Anthropic) - NOT RECOMMENDED
 *    - Cost: ~$8/1000 calls (92% cheaper)
 *    - Issue: Poor JSON format compliance
 *    - Model: claude-3-5-haiku-20241022
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
 * Claude Sonnet 4.5 - Primary Model (Stable & Accurate)
 * Reverted from Haiku due to poor JSON format compliance
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
      model: 'claude-sonnet-4-5-20250929',  // Sonnet 4.5 for stable JSON output
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
- **모든 계약을 빠짐없이 추출하세요**
- 각 계약마다:
  - 보험사명, 상품명 정확 추출 (보험사: "메리츠화재", 상품명: "(무)상품명")
  - 납입상태: "납입완료"/"완납" → "완료", 그 외 → "진행중"
  - 월보험료: 완료 계약은 0, 진행중은 원본 금액
  - 계약일: YYYY-MM-DD
  - 납입주기, 납입기간, 만기, 가입당시금리 추출
- ⚠️ **월보험료 합계 (총보험료/활성월보험료) - 직접 파싱 (매우 중요)**:
  - **절대 계산하지 마세요 - 5페이지 우측 상단에서 직접 읽으세요**
  - 5페이지 상단 우측에 "월보험료: XXX,XXX원" 형태로 표시된 값을 찾으세요
  - 예시 (강민재): "월보험료: 153,500원" → 153500
  - 예시 (안영균): "월보험료: 427,097원" → 427097
  - 이 값을 그대로 "총보험료"와 "활성월보험료"에 사용
  - **다시 강조**: 계약 리스트에서 합산하지 마세요 - 우측 상단 필드에서 직접 읽으세요

B. 진단현황 ⚠️ **🚨 매우 중요 - 절대 누락 금지 🚨**
- 📍 **"담보별 진단현황" 표 위치**: PDF의 마지막 페이지에 위치 (12, 18, 24페이지 등)
- ⚠️ **이 표를 찾아서 모든 행을 빠짐없이 추출하세요**
- ⚠️ **테이블 구조**: 진단명 / 권장금액(원) / 가입금액(원) / 부족금액(원) 형식
- 🔴 **중요**: 권장금액과 가입금액을 정확히 읽으세요. "0원"이 대부분이면 잘못 읽은 것입니다!
- ⚠️ **자주 누락되는 항목 (반드시 확인)**:
  - "상해80%미만후유장해", "질병80%미만후유장해"
  - "경증치매진단"
  - "간병인/간호간병상해일당", "자동차사고보상"
  - 기타 모든 진단 항목
- 각 항목마다 다음 필드 추출:
  - 진단명: 정확한 이름
  - 권장금액: **표의 "권장금액(원)" 열에서 정확히 읽기** (숫자만, 콤마 제거)
  - 가입금액: **표의 "가입금액(원)" 열에서 정확히 읽기** (숫자만, 콤마 제거)
  - 부족금액: **반드시 계산** = 권장금액 - 가입금액
    - 양수(+): 부족 → colorClass: "text-red-600 font-bold"
    - 음수(-): 초과 → colorClass: "text-blue-600"
    - 0: 충족 → colorClass: ""
  - 상태: 부족(<70%), 주의(70-99%), 충분(≥100%), 미가입(0)
- **🔴 절대 규칙**: 참고 데이터에 31-32개 있으면 PDF 표에서도 모두 찾아서 반환
- **🔴 금액 검증**: 대부분의 항목이 "권장금액: 0, 가입금액: 0"이면 잘못 읽은 것입니다. 표를 다시 정확히 읽으세요!

C. 실효/해지계약 현황 📋
- PDF에서 "실효/해지계약" 또는 "효력상실/해지 계약" 섹션 찾기
- 섹션 없으면 빈 배열 [] 반환
- **모든 실효/해지 계약을 빠짐없이 추출하세요**
- 각 계약마다 다음 필드 추출:
  - **상태**: "실효", "해지", "효력상실" 등 PDF에 표시된 그대로
  - **회사명**: 보험사 정식 명칭 (예: "메리츠화재", "KB손해보험", "삼성생명")
  - **상품명**: 정확한 상품명 (예: "(무)메리츠 화재보험", "KB 건강보험")
  - **계약일**: YYYY-MM-DD 형식
  - **납입주기**: "월납", "연납", "일시납" 등
  - **납입기간**: 숫자 (년 단위, 예: 20, 30)
  - **만기**: YYYY-MM-DD 형식 (또는 "종신")
  - **월보험료**: 숫자 (원 단위, 콤마 제거)
  - **실효/해지일**: YYYY-MM-DD 형식 (있으면 추출)
  - **실효/해지사유**: 있으면 추출 (예: "보험료 미납", "계약자 요청")

D. 상품별담보
- "상품별 가입담보상세" 섹션에서 상품별 그룹화
- 필드: 상품명, 보험사, 계약자, 피보험자, 납입주기, 납입기간, 만기, 보험기간, 월납보험료
- 담보목록: [{번호, 구분, 회사담보명, 신정원담보명, 가입금액}]

**출력 형식 (JSON):**
\`\`\`json
{
  "계약리스트": [...],
  "실효해지계약": [
    {
      "상태": "실효",
      "회사명": "메리츠화재",
      "상품명": "(무)메리츠 화재보험",
      "계약일": "2015-03-15",
      "납입주기": "월납",
      "납입기간": 20,
      "만기": "2035-03-15",
      "월보험료": 45000,
      "실효해지일": "2023-08-10",
      "실효해지사유": "보험료 미납"
    },
    {
      "상태": "해지",
      "회사명": "KB손해보험",
      "상품명": "(무)KB 건강보험",
      "계약일": "2018-06-20",
      "납입주기": "월납",
      "납입기간": 15,
      "만기": "2033-06-20",
      "월보험료": 32000,
      "실효해지일": "2024-01-05",
      "실효해지사유": "계약자 요청"
    }
  ],
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
  "총보험료": 153500,
  "활성월보험료": 153500
}
\`\`\`

**총보험료/활성월보험료 파싱 예시:**
- 5페이지 우측 상단에서 "월보험료" 필드를 직접 읽어서 사용
- 예시 (강민재 PDF):
  - 5페이지 우측 상단 → "월보험료: 153,500원" 확인
  - 콤마 제거 → 153500
  - 총보험료: 153500, 활성월보험료: 153500
- 예시 (안영균 PDF):
  - 5페이지 우측 상단 → "월보험료: 427,097원" 확인
  - 콤마 제거 → 427097
  - 총보험료: 427097, 활성월보험료: 427097

**주의사항:**
- **원본 PDF가 최우선**: PDF에서 직접 읽은 내용을 사용
- **진단현황 누락 금지**: 12페이지 표의 모든 행을 빠짐없이 추출
- **부족금액 계산 필수**: 권장금액 - 가입금액 (부족=빨강, 초과=파랑)
- **⚠️ 월보험료 합계 - 5페이지 우측 상단에서 직접 파싱**: 
  - 절대 계산하지 마세요
  - 5페이지 우측 상단에 "월보험료: XXX,XXX원" 표시 확인
  - 이 값을 그대로 "총보험료"와 "활성월보험료"에 사용
  - 계약 리스트에서 합산 금지
- **데이터 구조 엄수**: 각 필드를 정확한 위치에 배치 (이상한 곳에 붙이지 말 것)
- 보험사명 정확히 확인: "새마을금고중앙회", "KB손해보험", "메리츠화재" 등 PDF에 표기된 그대로
- 불확실한 경우: 빈 칸으로 두거나 null 사용 (추측 금지)
- 모든 계약/담보 포함
- **🚨 JSON 형식 엄수**: 
  - 배열 마지막 항목 뒤에 콤마(,) 붙이지 마세요
  - 객체 마지막 속성 뒤에 콤마(,) 붙이지 마세요
  - 올바른 JSON 형식으로만 응답하세요
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
      let jsonText = jsonMatch[1] || jsonMatch[0];
      
      // 🔧 Enhanced JSON cleanup for Claude's large responses
      // 1. Remove trailing commas before closing brackets
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      
      // 2. Remove multiple consecutive commas
      jsonText = jsonText.replace(/,{2,}/g, ',');
      
      // 3. Remove comments (Claude sometimes adds these)
      jsonText = jsonText.replace(/\/\/[^\n]*\n/g, '');
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // 4. Fix incomplete JSON arrays - if last char is comma, close the array/object
      jsonText = jsonText.trim();
      if (jsonText.endsWith(',')) {
        // Count unclosed brackets
        const openBrackets = (jsonText.match(/\[/g) || []).length;
        const closeBrackets = (jsonText.match(/\]/g) || []).length;
        const openBraces = (jsonText.match(/\{/g) || []).length;
        const closeBraces = (jsonText.match(/\}/g) || []).length;
        
        // Remove trailing comma
        jsonText = jsonText.slice(0, -1);
        
        // Add missing closing brackets
        jsonText += ']'.repeat(openBrackets - closeBrackets);
        jsonText += '}'.repeat(openBraces - closeBraces);
      }
      
      try {
        return JSON.parse(jsonText);
      } catch (secondError) {
        console.error('JSON parsing failed even after cleanup:', secondError.message);
        console.error('Position:', secondError.message.match(/position (\d+)/)?.[1]);
        
        // Final attempt: find the error position and try to fix it
        const errorPos = parseInt(secondError.message.match(/position (\d+)/)?.[1] || '0');
        if (errorPos > 0) {
          console.error('Problematic JSON segment:', jsonText.substring(Math.max(0, errorPos - 100), Math.min(jsonText.length, errorPos + 100)));
        }
        
        throw new Error(`Failed to parse AI response as JSON: ${secondError.message}`);
      }
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}
