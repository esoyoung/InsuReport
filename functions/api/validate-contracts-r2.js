// Cloudflare Pages Function for AI Validation (R2-based)
import {
  validateWithClaude,
  validateWithGPT4o
} from '../../cloudflare-workers/src/ai-models.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { fileKey, parsedData, model = 'auto', parallel = false } = await request.json();

    if (!fileKey || !parsedData) {
      return new Response(JSON.stringify({
        error: 'fileKey and parsedData required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🤖 AI validation: ${fileKey}, model: ${model}`);
    const startTime = Date.now();

    // Get PDF from R2
    const pdfObject = await env.PDF_BUCKET.get(fileKey);

    if (!pdfObject) {
      return new Response(JSON.stringify({
        error: `PDF not found: ${fileKey}`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get PDF ArrayBuffer
    const pdfArrayBuffer = await pdfObject.arrayBuffer();
    const pdfSizeMB = (pdfArrayBuffer.byteLength / 1024 / 1024).toFixed(2);

    console.log(`✅ PDF loaded: ${pdfSizeMB}MB`);

    // Single model validation
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
    const validatedData = await callAI(pdfBase64, parsedData, env);

    const duration = Date.now() - startTime;
    console.log(`✅ Completed in ${duration}ms`);

    return new Response(JSON.stringify({
      ...validatedData,
      _metadata: {
        processingTime: duration,
        pdfSize: `${pdfSizeMB}MB`,
        aiModel: validatedData.model || model,
        mode: 'single'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      details: error.toString()
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
  // 🎯 Best for: Accurate PDF parsing, Korean documents
  // ============================================================================
  console.log('🤖 Using Claude 3.5 Sonnet');
  return await validateWithClaude(pdfBase64, parsedData, env);

  // ============================================================================
  // 🔄 ALTERNATIVE (Uncomment to switch)
  // ============================================================================
  // GPT-4o
  // 💰 Cost: ~$10/1000 calls (4-page PDF)
  // 📝 API Key: OPENAI_API_KEY (not configured)
  // 🎯 Best for: Balanced cost/accuracy
  // ----------------------------------------------------------------------------
  // console.log('🤖 Using GPT-4o');
  // return await validateWithGPT4o(pdfBase64, parsedData, env);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
