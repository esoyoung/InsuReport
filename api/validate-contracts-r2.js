// api/validate-contracts-r2.js - AI validation using R2-stored PDF
import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // fileKey만 받으므로 작은 크기로 충분
    },
  },
  maxDuration: 60,
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
    const { fileKey, parsedData } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKey is required' });
    }

    if (!parsedData) {
      return res.status(400).json({ error: 'parsedData is required' });
    }

    // 환경 변수 확인
    const apiKey = process.env.GEMINI_API_KEY;
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return res.status(500).json({ error: 'R2 storage not configured' });
    }

    console.log('🤖 AI 검증 요청 수신 (R2 경로)');
    console.log(`📄 File Key: ${fileKey}`);

    // S3 클라이언트 생성
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // R2에서 PDF 다운로드
    console.log('📥 R2에서 PDF 다운로드 중...');
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const s3Response = await s3Client.send(getCommand);
    
    // Stream을 Buffer로 변환
    const chunks = [];
    for await (const chunk of s3Response.Body) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);
    const pdfSizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);
    
    console.log(`✅ PDF 다운로드 완료: ${pdfSizeMB}MB`);

    // Base64로 변환
    const pdfBase64 = pdfBuffer.toString('base64');

    // Gemini AI 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-001',  // 안정적인 무료 모델 (Gemini 2.0)
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    // PDF 데이터 구성
    const pdfData = {
      inlineData: {
        data: pdfBase64,
        mimeType: 'application/pdf',
      },
    };

    // 최적화된 프롬프트 (처리 시간 단축)
    const prompt = `
KB 보험 보장분석 리포트 검증 시스템. 원본 PDF에서 4개 섹션 추출 및 검증.

**입력 데이터:**
계약리스트: ${JSON.stringify(parsedData.계약리스트 || [])}
진단현황: ${JSON.stringify(parsedData.진단현황 || [])}

**추출 규칙:**

A. 보유 계약 리스트
- 보험사명, 상품명 정확 추출 (보험사: "메리츠화재", 상품명: "(무)상품명")
- 납입상태: "납입완료"/"완납" → "완료", 그 외 → "진행중"
- 월보험료: 완료 계약은 0, 진행중은 원본 금액
- 계약일: YYYY-MM-DD
- 납입주기, 납입기간, 만기, 가입당시금리 추출
- **중요**: 완료 계약은 총보험료 합계 제외

B. 진단현황
- 12페이지 "담보별 진단현황"에서 추출
- 권장금액, 가입금액, 부족금액(권장-가입), 상태
- 상태: 부족(<70%), 주의(70-99%), 충분(≥100%), 미가입(0)

C. 실효/해지계약
- 섹션 있으면 추출, 없으면 []
- 필드: 상태, 회사명, 상품명, 계약일, 납입주기, 납입기간, 만기, 월보험료

D. 상품별담보
- "상품별 가입담보상세" 섹션에서 상품별 그룹화
- 필드: 상품명, 보험사, 계약자, 피보험자, 납입주기, 납입기간, 만기, 보험기간, 월납보험료
- 담보목록: [{번호, 구분, 회사담보명, 신정원담보명, 가입금액}]

**출력 형식 (JSON):**
\`\`\`json
{
  "계약리스트": [
    {
      "번호": 1,
      "보험사": "메리츠화재",
      "상품명": "(무) New리치하우스가정종합보험1907",
      "계약일": "2019-08-26",
      "가입당시금리": "2.5%",
      "납입주기": "월납",
      "납입기간": "20년",
      "만기": "80세",
      "월보험료": 15000,
      "납입상태": "진행중"
    }
  ],
  "실효해지계약": [
    {
      "상태": "해지",
      "회사명": "삼성생명",
      "상품명": "(무)희망플러스저축보험",
      "계약일": "2015-03-10",
      "납입주기": "월납",
      "납입기간": "10년",
      "만기": "65세",
      "월보험료": 50000
    }
  ],
  "진단현황": [
    {
      "담보명": "일반사망",
      "권장금액": "1억원",
      "가입금액": "5000만원",
      "부족금액": "5000만원",
      "상태": "부족"
    },
    {
      "담보명": "암진단비",
      "권장금액": "3000만원",
      "가입금액": "3000만원",
      "부족금액": "0원",
      "상태": "충분"
    }
  ],
  "상품별담보": [
    {
      "상품명": "(무) New리치하우스가정종합보험1907",
      "보험사": "메리츠화재",
      "계약자": "강민재",
      "피보험자": "강민재",
      "납입주기": "월납",
      "납입기간": "30년",
      "만기": "90세만기",
      "보험기간": "90세만기",
      "월납보험료": "15,000원",
      "담보목록": [
        {
          "번호": 1,
          "구분": "주계약",
          "회사담보명": "화재손해담보",
          "신정원담보명": "화재보장",
          "가입금액": "1,000만원"
        },
        {
          "번호": 2,
          "구분": "특약",
          "회사담보명": "도난손해담보",
          "신정원담보명": "도난보장",
          "가입금액": "500만원"
        }
      ]
    }
  ],
  "수정사항": [
    "계약 2번: 보험사 '메리츠화재' 추가",
    "계약 8번: 납입상태를 '완료'로 변경",
    "실효/해지 1건 추출",
    "진단 '일반사망': 권장금액 1억원, 가입금액 5000만원으로 수정",
    "진단 '암진단비': 상태 '충분'으로 변경",
    "상품별 담보 2개 상품 추출"
  ],
  "총보험료": 456171,
  "활성월보험료": 319821
}
\`\`\`

**주의사항:**
- 원본 PDF 내용을 최우선으로 하세요
- 불확실한 정보는 규칙 기반 파싱 결과를 유지하세요
- 모든 계약과 담보를 빠짐없이 포함하세요
- **총보험료**: 납입상태가 "진행중"인 계약의 월보험료만 합산 (납입완료 계약 제외)
- **활성월보험료**: 납입상태가 "진행중"인 계약의 월보험료 합계 (납입완료 계약 제외)
- 담보별 진단현황은 12페이지 레이아웃과 분류를 유지하세요
`;

    // Gemini API 호출
    console.log('🤖 Gemini API 호출 중...');
    const result = await model.generateContent([prompt, pdfData]);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI 검증 완료');

    // JSON 파싱
    let validatedData;
    try {
      validatedData = JSON.parse(text);
    } catch (parseError) {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        validatedData = JSON.parse(jsonText);
      } else {
        throw new Error('AI 응답을 JSON으로 파싱할 수 없습니다.');
      }
    }

    return res.status(200).json(validatedData);

  } catch (error) {
    console.error('❌ AI 검증 중 오류:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
