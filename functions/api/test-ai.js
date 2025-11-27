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

  // Test 1: Cloudflare AI Binding
  if (env.AI) {
    try {
      const response = await env.AI.run('@cf/qwen/qwen2-vl-7b-instruct', {
        messages: [
          {
            role: 'user',
            content: 'Reply with just "OK" if you can read this message.'
          }
        ],
        max_tokens: 10
      });
      
      testResults.tests.push({
        name: 'Cloudflare AI',
        status: 'success',
        response: response
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Cloudflare AI',
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
