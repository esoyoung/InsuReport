/**
 * Multi-Model AI Service
 * 
 * Supported models:
 * - Gemini 2.0 Flash (Google) - Fast & Cheap
 * - GPT-4o (OpenAI) - High Accuracy
 * - Claude 3.5 Sonnet (Anthropic) - Balanced
 */

/**
 * Gemini 2.0 Flash - Current default
 */
export async function validateWithGemini(pdfBase64, parsedData, env) {
  const apiKey = env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = buildPrompt(parsedData);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
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
  return parseAIResponse(result.candidates?.[0]?.content?.parts?.[0]?.text);
}

/**
 * GPT-4o - High accuracy OCR
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
 * Claude 3.5 Sonnet - Balanced
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
      model: 'claude-3-5-sonnet-20241022',
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
 * Ensemble: Primary-Fallback strategy
 */
export async function validateWithEnsemble(pdfBase64, parsedData, env) {
  console.log('🔀 Starting ensemble validation (Gemini → GPT-4o → Claude)');

  // 1st: Try Gemini (Fast & Cheap)
  try {
    const geminiResult = await validateWithGemini(pdfBase64, parsedData, env);
    const confidence = calculateConfidence(geminiResult);
    
    console.log(`✅ Gemini result - Confidence: ${(confidence * 100).toFixed(1)}%`);
    
    if (confidence > 0.85) {
      return { 
        model: 'gemini', 
        confidence,
        ...geminiResult 
      };
    }
    
    console.log(`⚠️ Gemini confidence low (${(confidence * 100).toFixed(1)}%), trying GPT-4o...`);
  } catch (error) {
    console.error('❌ Gemini failed:', error.message);
  }

  // 2nd: Try GPT-4o (High Accuracy)
  if (env.OPENAI_API_KEY) {
    try {
      const gpt4oResult = await validateWithGPT4o(pdfBase64, parsedData, env);
      console.log('✅ GPT-4o result - High confidence');
      
      return { 
        model: 'gpt-4o', 
        confidence: 0.95,
        ...gpt4oResult 
      };
    } catch (error) {
      console.error('❌ GPT-4o failed:', error.message);
    }
  }

  // 3rd: Try Claude (Fallback)
  if (env.ANTHROPIC_API_KEY) {
    try {
      const claudeResult = await validateWithClaude(pdfBase64, parsedData, env);
      console.log('✅ Claude result - Fallback');
      
      return { 
        model: 'claude', 
        confidence: 0.90,
        ...claudeResult 
      };
    } catch (error) {
      console.error('❌ Claude failed:', error.message);
    }
  }

  throw new Error('All AI models failed');
}

/**
 * Build validation prompt
 */
function buildPrompt(parsedData) {
  return `
KB 보험 보장분석 리포트 검증 시스템. 원본 PDF에서 4개 섹션 추출 및 검증.

**입력 데이터:**
계약리스트: ${JSON.stringify(parsedData.계약리스트 || [])}
진단현황: ${JSON.stringify(parsedData.진단현황 || [])}

**추출 규칙:**

A. 보유 계약 리스트
- 보험사명, 상품명 정확 추출 (보험사: "메리츠화재", 상품명: "(무)상품명")
- 납입상태: "납입완료"/"완납" → "완료", 그 외 → "진행중"
- 월보험료: 완료 계약은 0, 진행중은 원본 금액
- 계약일: YYYY-MM-DD
- 납입주기, 납입기간, 만기, 가입당시금리 추출
- **중요**: 완료 계약은 총보험료 합계 제외

B. 진단현황
- 12페이지 "담보별 진단현황"에서 추출
- 권장금액, 가입금액, 부족금액(권장-가입), 상태
- 상태: 부족(<70%), 주의(70-99%), 충분(≥100%), 미가입(0)

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
  "진단현황": [...],
  "상품별담보": [...],
  "수정사항": [...],
  "총보험료": 0,
  "활성월보험료": 0
}
\`\`\`

**주의사항:**
- 원본 PDF 우선
- 불확실하면 파싱 결과 유지
- 모든 계약/담보 포함
- 총보험료: 진행중 계약만
- 활성월보험료: 진행중 계약만
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

/**
 * Calculate confidence score
 */
function calculateConfidence(result) {
  let score = 1.0;
  
  // 1. Check missing fields
  if (!result.계약리스트 || result.계약리스트.length === 0) {
    score -= 0.2;
  }
  
  if (!result.진단현황 || result.진단현황.length === 0) {
    score -= 0.2;
  }
  
  // 2. Validate premium total
  const expectedTotal = result.계약리스트
    ?.filter(c => c.납입상태 === '진행중')
    ?.reduce((sum, c) => sum + (parseFloat(c.월보험료) || 0), 0) || 0;
  
  const actualTotal = parseFloat(result.총보험료) || 0;
  const totalDiff = Math.abs(expectedTotal - actualTotal);
  
  if (totalDiff > 10000) { // 10,000원 이상 차이
    score -= 0.3;
  }
  
  // 3. Check invalid dates
  const invalidDates = result.계약리스트?.filter(c => {
    return !/^\d{4}-\d{2}-\d{2}$/.test(c.계약일);
  }).length || 0;
  
  score -= invalidDates * 0.05;
  
  return Math.max(0, score);
}
