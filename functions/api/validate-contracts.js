// Cloudflare Pages Function for AI PDF validation
import {
  validateWithGemini,
  validateWithClaude
} from './ai-models.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { pdfBase64, parsedData } = await request.json();

    if (!pdfBase64 || !parsedData) {
      return new Response(JSON.stringify({
        error: 'pdfBase64 and parsedData required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 Starting AI validation');
    const startTime = Date.now();

    const validatedData = await callAI(pdfBase64, parsedData, env);
    const duration = Date.now() - startTime;

    console.log(`✅ AI validation completed in ${duration}ms`);

    return new Response(JSON.stringify({
      ...validatedData,
      _metadata: {
        processingTime: duration,
        aiModel: validatedData.model
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ AI validation error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function callAI(pdfBase64, parsedData, env) {
  // ============================================================================
  // 🎯 ACTIVE MODEL (한 번에 하나만 활성화)
  // ============================================================================
  
  // ✅ Google Gemini 2.0 Flash (PRIMARY - RECOMMENDED)
  // 💰 Cost: FREE (rate limited) or ~$0.075 per 1M tokens
  // 📝 API Key: GEMINI_API_KEY
  // 🚀 Best for: Cost-effective, fast, accurate
  // ----------------------------------------------------------------------------
  console.log('🤖 Using Google Gemini 2.0 Flash');
  return await validateWithGemini(pdfBase64, parsedData, env);

  // ============================================================================
  // 🔄 ALTERNATIVE MODEL (Uncomment to switch)
  // ============================================================================
  
  // ❌ Anthropic Claude Sonnet 4.5 (ALTERNATIVE)
  // 💰 Cost: ~$0.10/validation (4-page PDF)
  // 📝 API Key: ANTHROPIC_API_KEY
  // 🎯 Best for: Maximum accuracy, critical validations
  // ----------------------------------------------------------------------------
  // console.log('🤖 Using Anthropic Claude Sonnet 4.5');
  // return await validateWithClaude(pdfBase64, parsedData, env);
}
