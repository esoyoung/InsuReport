/**
 * Cloudflare Workers - AI Validation Service
 * 
 * Features:
 * - 5 minutes CPU time (vs Vercel 60s)
 * - Direct R2 integration
 * - Gemini API with PDF multimodal processing
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route: Health check
      if (path === '/health') {
        return jsonResponse({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          cpuLimit: '300000ms (5 minutes)',
          environment: env.ENVIRONMENT || 'unknown'
        }, 200, corsHeaders);
      }

      // Route: AI validation from R2
      if (path === '/api/validate-contracts-r2' && request.method === 'POST') {
        return await handleAIValidationFromR2(request, env, corsHeaders);
      }

      // Route: AI validation with direct PDF upload
      if (path === '/api/validate-contracts' && request.method === 'POST') {
        return await handleAIValidationDirect(request, env, corsHeaders);
      }

      // Route: Upload PDF to R2
      if (path === '/api/upload-pdf' && request.method === 'POST') {
        return await handlePDFUpload(request, env, corsHeaders);
      }

      // 404
      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: error.message,
        stack: error.stack 
      }, 500, corsHeaders);
    }
  },
};

/**
 * AI Validation from R2-stored PDF
 */
async function handleAIValidationFromR2(request, env, corsHeaders) {
  const { fileKey, parsedData } = await request.json();

  if (!fileKey || !parsedData) {
    return jsonResponse({ 
      error: 'fileKey and parsedData required' 
    }, 400, corsHeaders);
  }

  console.log('🤖 AI validation request (R2):', fileKey);
  const startTime = Date.now();

  // Get PDF from R2
  const pdfObject = await env.PDF_BUCKET.get(fileKey);
  
  if (!pdfObject) {
    return jsonResponse({ 
      error: `PDF not found in R2: ${fileKey}` 
    }, 404, corsHeaders);
  }

  // Convert to base64
  const pdfArrayBuffer = await pdfObject.arrayBuffer();
  const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
  const pdfSizeMB = (pdfArrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  
  console.log(`✅ PDF loaded from R2: ${pdfSizeMB}MB`);

  // Call Gemini API
  const validatedData = await callGeminiAPI(pdfBase64, parsedData, env);

  const duration = Date.now() - startTime;
  console.log(`✅ AI validation completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);

  return jsonResponse({
    ...validatedData,
    _metadata: {
      processingTime: duration,
      pdfSize: `${pdfSizeMB}MB`,
      cpuLimit: '300000ms (5 minutes)'
    }
  }, 200, corsHeaders);
}

/**
 * AI Validation with direct PDF upload
 */
async function handleAIValidationDirect(request, env, corsHeaders) {
  const { pdfBase64, parsedData } = await request.json();

  if (!pdfBase64 || !parsedData) {
    return jsonResponse({ 
      error: 'pdfBase64 and parsedData required' 
    }, 400, corsHeaders);
  }

  console.log('🤖 AI validation request (direct)');
  const startTime = Date.now();

  // Call Gemini API
  const validatedData = await callGeminiAPI(pdfBase64, parsedData, env);

  const duration = Date.now() - startTime;
  console.log(`✅ AI validation completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);

  return jsonResponse({
    ...validatedData,
    _metadata: {
      processingTime: duration,
      cpuLimit: '300000ms (5 minutes)'
    }
  }, 200, corsHeaders);
}

/**
 * Upload PDF to R2
 */
async function handlePDFUpload(request, env, corsHeaders) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  if (!file) {
    return jsonResponse({ error: 'No file uploaded' }, 400, corsHeaders);
  }

  // Generate file key
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileKey = `pdfs/${timestamp}-${randomId}-${file.name}`;

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer();
  await env.PDF_BUCKET.put(fileKey, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  console.log(`✅ PDF uploaded to R2: ${fileKey} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`);

  return jsonResponse({
    success: true,
    fileKey,
    size: arrayBuffer.byteLength,
    contentType: file.type
  }, 200, corsHeaders);
}

/**
 * Call Gemini API for AI validation
 */
async function callGeminiAPI(pdfBase64, parsedData, env) {
  const apiKey = env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Optimized prompt (same as Vercel version)
  const prompt = `
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

  // Gemini API request
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
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
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini API');
  }

  // Parse JSON response
  let validatedData;
  try {
    validatedData = JSON.parse(text);
  } catch (parseError) {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonText = jsonMatch[1] || jsonMatch[0];
      validatedData = JSON.parse(jsonText);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  return validatedData;
}

/**
 * Utility: JSON response
 */
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Utility: ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
