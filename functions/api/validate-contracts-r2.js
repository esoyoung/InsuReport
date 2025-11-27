// Cloudflare Pages Function for AI Validation (R2-based)
import {
  validateWithCloudflareAI,
  validateWithGemini,
  validateWithGPT4o,
  validateWithClaude,
  validateWithEnsemble
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
  // ============================================================================
  // 🎯 SINGLE MODEL STRATEGY - ONE ACTIVE MODEL AT A TIME
  // ============================================================================
  // ✅ Active Model: Claude 3.5 Sonnet (uncomment to use)
  // 💰 Cost: ~$30/1000 calls (4-page PDF)
  // 📝 Status: ANTHROPIC_API_KEY configured ✓
  // 🎯 Best for: PDF parsing accuracy, Korean insurance documents
  // ============================================================================
  console.log('🤖 Using Claude 3.5 Sonnet as primary model');
  return await validateWithClaude(pdfBase64, parsedData, env);

  // ============================================================================
  // 🔄 AVAILABLE ALTERNATIVES (Uncomment ONE to switch)
  // ============================================================================
  
  // Option 1: GPT-4o (High Accuracy, PDF Vision)
  // 💰 Cost: ~$10/1000 calls (4-page PDF)
  // 📝 Requires: OPENAI_API_KEY environment variable
  // 🎯 Best for: Accurate PDF parsing, balanced cost/performance
  // ----------------------------------------------------------------------------
  // console.log('🤖 Using GPT-4o as primary model');
  // return await validateWithGPT4o(pdfBase64, parsedData, env);

  // Option 2: Gemini (Fast & Cheap, PDF Vision)
  // 💰 Cost: ~$0.075/1000 calls (4-page PDF)
  // 📝 Requires: GEMINI_API_KEY environment variable
  // 🎯 Best for: Cost efficiency, fast processing
  // ⚠️ Note: Previously worked well, annual billing concern
  // ----------------------------------------------------------------------------
  // console.log('🤖 Using Gemini as primary model');
  // return await validateWithGemini(pdfBase64, parsedData, env);

  // Option 3: Cloudflare AI (Edge Computing, Text-only)
  // 💰 Cost: $5/month + usage
  // 📝 Requires: AI binding (already configured)
  // 🎯 Best for: Low latency, cost control
  // ⚠️ Warning: TEXT-ONLY (cannot read PDF directly, uses parsed data)
  // Models: DeepSeek R1 Distill Qwen 32B → Llama 3.1 70B (cascade)
  // ----------------------------------------------------------------------------
  // console.log('🤖 Using Cloudflare AI (text-only fallback)');
  // return await validateWithCloudflareAI(pdfBase64, parsedData, env);

  // ============================================================================
  // 🚫 DEPRECATED: Ensemble mode (multi-model cascade)
  // ============================================================================
  // ⚠️ Ensemble mode is disabled for clarity and cost control
  // Uncomment below to re-enable multi-model cascade (not recommended)
  // ----------------------------------------------------------------------------
  // return await validateWithEnsemble(pdfBase64, parsedData, env);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
