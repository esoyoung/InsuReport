// Cloudflare Pages Function for direct PDF AI validation
import {
  validateWithEnsemble,
  validateWithGemini,
  validateWithGPT4o,
  validateWithClaude
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

async function callAI(pdfBase64, parsedData, model, env) {
  switch (model) {
    case 'gemini':
      return await validateWithGemini(pdfBase64, parsedData, env);
    case 'gpt-4o':
      return await validateWithGPT4o(pdfBase64, parsedData, env);
    case 'claude':
      return await validateWithClaude(pdfBase64, parsedData, env);
    case 'auto':
    case 'ensemble':
    default:
      return await validateWithEnsemble(pdfBase64, parsedData, env);
  }
}
