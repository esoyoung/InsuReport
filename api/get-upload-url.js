// api/get-upload-url.js - Generate pre-signed URL for R2 upload
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const config = {
  maxDuration: 10,
};

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // R2 설정 확인
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.error('❌ R2 credentials not configured');
      return res.status(500).json({ 
        error: 'R2 storage not configured',
        message: 'Please set R2 environment variables in Vercel'
      });
    }

    // S3 호환 클라이언트 생성 (Cloudflare R2)
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // 고유한 파일 키 생성
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileKey = `pdfs/${timestamp}-${randomString}-${fileName}`;

    // Pre-signed URL 생성 (1시간 유효)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType || 'application/pdf',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1시간
    });

    console.log(`✅ Pre-signed URL generated: ${fileKey}`);

    res.status(200).json({
      uploadUrl,
      fileKey,
      expiresIn: 3600,
    });

  } catch (error) {
    console.error('❌ Error generating pre-signed URL:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
