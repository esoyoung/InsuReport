/**
 * Cloudflare Workers - AI Validation Service
 * 
 * Features:
 * - 5 minutes CPU time (vs Vercel 60s)
 * - Direct R2 integration
 * - Multi-Model AI: Gemini / GPT-4o / Claude / Ensemble
 */

import { 
  validateWithGemini, 
  validateWithGPT4o, 
  validateWithClaude, 
  validateWithEnsemble 
} from './ai-models.js';

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
  const { fileKey, parsedData, model = 'auto' } = await request.json();

  if (!fileKey || !parsedData) {
    return jsonResponse({ 
      error: 'fileKey and parsedData required' 
    }, 400, corsHeaders);
  }

  console.log(`🤖 AI validation request (R2): ${fileKey}, model: ${model}`);
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

  // Call AI with selected model
  const validatedData = await callAI(pdfBase64, parsedData, model, env);

  const duration = Date.now() - startTime;
  console.log(`✅ AI validation completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);

  return jsonResponse({
    ...validatedData,
    _metadata: {
      processingTime: duration,
      pdfSize: `${pdfSizeMB}MB`,
      cpuLimit: '300000ms (5 minutes)',
      aiModel: validatedData.model || model
    }
  }, 200, corsHeaders);
}

/**
 * AI Validation with direct PDF upload
 */
async function handleAIValidationDirect(request, env, corsHeaders) {
  const { pdfBase64, parsedData, model = 'auto' } = await request.json();

  if (!pdfBase64 || !parsedData) {
    return jsonResponse({ 
      error: 'pdfBase64 and parsedData required' 
    }, 400, corsHeaders);
  }

  console.log(`🤖 AI validation request (direct), model: ${model}`);
  const startTime = Date.now();

  // Call AI with selected model
  const validatedData = await callAI(pdfBase64, parsedData, model, env);

  const duration = Date.now() - startTime;
  console.log(`✅ AI validation completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);

  return jsonResponse({
    ...validatedData,
    _metadata: {
      processingTime: duration,
      cpuLimit: '300000ms (5 minutes)',
      aiModel: validatedData.model || model
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
 * Call AI with model selection
 */
async function callAI(pdfBase64, parsedData, model, env) {
  console.log(`🔀 AI Model: ${model}`);
  
  switch (model) {
    case 'gemini':
      return await validateWithGemini(pdfBase64, parsedData, env);
    
    case 'gpt-4o':
      return await validateWithGPT4o(pdfBase64, parsedData, env);
    
    case 'claude':
      return await validateWithClaude(pdfBase64, parsedData, env);
    
    case 'auto':
    case 'ensemble':
      return await validateWithEnsemble(pdfBase64, parsedData, env);
    
    default:
      throw new Error(`Unknown AI model: ${model}. Supported: gemini, gpt-4o, claude, auto, ensemble`);
  }
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
