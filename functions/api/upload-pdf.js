// Cloudflare Pages Function for uploading PDFs directly to R2
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileKey = `pdfs/${timestamp}-${randomId}-${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    await env.PDF_BUCKET.put(fileKey, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    console.log(`✅ Uploaded to R2: ${fileKey} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`);

    return new Response(JSON.stringify({
      success: true,
      fileKey,
      size: arrayBuffer.byteLength,
      contentType: file.type
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
