// Cloudflare Pages Function for direct PDF AI validation
import {
  validateWithClaude,
  validateWithGPT4o
} from '../../cloudflare-workers/src/ai-models.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { pdfBase64, parsedData, model = 'auto' } = await request.json();

    if (!pdfBase64 || !parsedData) {
      return new Response(JSON.stringify({
        error: 'pdfBase64 and parsedData required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🤖 Direct AI validation (model: ${model})`);
    const startTime = Date.now();

    const validatedData = await callAI(pdfBase64, parsedData, model, env);
    const duration = Date.now() - startTime;

    console.log(`✅ Completed in ${duration}ms`);

    return new Response(JSON.stringify({
      ...validatedData,
      _metadata: {
        processingTime: duration,
        aiModel: validatedData.model || model
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error:', error);
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
  // 🎯 ACTIVE MODEL
  // ============================================================================
  // ✅ Claude 3.5 Sonnet (Primary)
  // 💰 Cost: ~$30/1000 calls (4-page PDF)
  // 📝 API Key: ANTHROPIC_API_KEY ✓
  // ============================================================================
  console.log('🤖 Using Claude 3.5 Sonnet');
  return await validateWithClaude(pdfBase64, parsedData, env);

  // ============================================================================
  // 🔄 ALTERNATIVE (Uncomment to switch)
  // ============================================================================
  // GPT-4o
  // 💰 Cost: ~$10/1000 calls
  // 📝 API Key: OPENAI_API_KEY (not configured)
  // ----------------------------------------------------------------------------
  // console.log('🤖 Using GPT-4o');
  // return await validateWithGPT4o(pdfBase64, parsedData, env);
}
