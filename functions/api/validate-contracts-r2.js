// Cloudflare Pages Function for AI Validation (R2-based)
import {
  validateWithEnsemble,
  validateWithGemini,
  validateWithGPT4o,
  validateWithClaude
} from '../../cloudflare-workers/src/ai-models.js';

import { validateWithParallelGemini } from '../../cloudflare-workers/src/parallelAIValidator.js';

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

    // 병렬 처리 모드 (5MB 이상 PDF만 적용)
    if (parallel && pdfSizeMB >= 5) {
      console.log('🚀 병렬 처리 모드 활성화');
      
      const validatedData = await validateWithParallelGemini(pdfArrayBuffer, parsedData, env);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Completed in ${duration}ms (parallel mode)`);
      
      return new Response(JSON.stringify({
        ...validatedData,
        _metadata: {
          ...validatedData._metadata,
          pdfSize: `${pdfSizeMB}MB`
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 단일 처리 모드 (기존 방식)
    console.log('📄 단일 처리 모드');
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
    const validatedData = await callAI(pdfBase64, parsedData, model, env);

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

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
