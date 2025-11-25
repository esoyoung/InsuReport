// Cloudflare Pages Function for AI Validation
// Import from cloudflare-workers implementation
import { validateWithEnsemble, validateWithGemini, validateWithGPT4o, validateWithClaude } from '../../cloudflare-workers/src/ai-models.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { fileKey, parsedData, model = 'auto' } = await request.json();

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

    // Convert to base64
    const pdfArrayBuffer = await pdfObject.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
    const pdfSizeMB = (pdfArrayBuffer.byteLength / 1024 / 1024).toFixed(2);
    
    console.log(`✅ PDF loaded: ${pdfSizeMB}MB`);

    // Call AI
    let validatedData;
    switch (model) {
      case 'gemini':
        validatedData = await validateWithGemini(pdfBase64, parsedData, env);
        break;
      case 'gpt-4o':
        validatedData = await validateWithGPT4o(pdfBase64, parsedData, env);
        break;
      case 'claude':
        validatedData = await validateWithClaude(pdfBase64, parsedData, env);
        break;
      case 'auto':
      case 'ensemble':
      default:
        validatedData = await validateWithEnsemble(pdfBase64, parsedData, env);
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Completed in ${duration}ms`);

    return new Response(JSON.stringify({
      ...validatedData,
      _metadata: {
        processingTime: duration,
        pdfSize: `${pdfSizeMB}MB`,
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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
