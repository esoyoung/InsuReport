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

  // Test 1: Cloudflare AI Models
  if (env.AI) {
    const models = [
      { name: 'GPT-OSS 120B', id: '@cf/gpt-oss/gpt-oss-120b' },
      { name: 'GPT-OSS Alt', id: 'gpt-oss-120b' },
      { name: 'DeepSeek R1', id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b' },
      { name: 'Llama 3.1 70B', id: '@cf/meta/llama-3.1-70b-instruct' }
    ];

    for (const model of models) {
      try {
        const response = await env.AI.run(model.id, {
          messages: [
            {
              role: 'user',
              content: 'Reply with just "OK"'
            }
          ],
          max_tokens: 10
        });
        
        testResults.tests.push({
          name: `Cloudflare AI: ${model.name}`,
          status: 'success',
          response: response
        });
      } catch (error) {
        testResults.tests.push({
          name: `Cloudflare AI: ${model.name}`,
          status: 'error',
          error: error.message
        });
      }
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
