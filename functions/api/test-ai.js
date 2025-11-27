// Cloudflare AI Test Endpoint
export async function onRequestGet(context) {
  const { env } = context;
  
  const testResults = {
    timestamp: new Date().toISOString(),
    bindings: {
      AI: !!env.AI,
      PDF_BUCKET: !!env.PDF_BUCKET,
      GEMINI_API_KEY: !!env.GEMINI_API_KEY,
      OPENAI_API_KEY: !!env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY
    },
    tests: []
  };

  // Test 1: Cloudflare AI Binding (Llama 3.2 11B Vision)
  if (env.AI) {
    try {
      // Accept license first
      try {
        await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: 'agree',
          max_tokens: 10
        });
      } catch (licenseError) {
        // Ignore license errors
      }

      // Run actual test
      const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
        prompt: 'Reply with just "OK" if you can read this message.',
        max_tokens: 10
      });
      
      testResults.tests.push({
        name: 'Cloudflare AI (Llama 3.2 11B Vision)',
        status: 'success',
        response: response
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Cloudflare AI (Llama 3.2 11B Vision)',
        status: 'error',
        error: error.message,
        stack: error.stack
      });
    }
  } else {
    testResults.tests.push({
      name: 'Cloudflare AI',
      status: 'skipped',
      reason: 'AI binding not configured'
    });
  }

  // Test 2: R2 Bucket
  if (env.PDF_BUCKET) {
    try {
      const list = await env.PDF_BUCKET.list({ limit: 1 });
      testResults.tests.push({
        name: 'R2 Bucket',
        status: 'success',
        objectCount: list.objects.length
      });
    } catch (error) {
      testResults.tests.push({
        name: 'R2 Bucket',
        status: 'error',
        error: error.message
      });
    }
  }

  return new Response(JSON.stringify(testResults, null, 2), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
