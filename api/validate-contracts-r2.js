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

    // 프롬프트 구성 (계약리스트 + 실효/해지 계약 + 진단현황 + 상품별 담보 검증)
    const prompt = `
당신은 KB 보험 보장분석 리포트 전문 검증 시스템입니다.

**임무:**
원본 PDF의 "보유 계약 리스트", "실효/해지계약현황", "담보별 진단현황", "상품별 가입담보상세" 섹션을 분석하여 아래 규칙 기반 파싱 결과를 검증하고 수정하세요.

**규칙 기반 파싱 결과 - 계약리스트:**
\`\`\`json
${JSON.stringify(parsedData.계약리스트 || [], null, 2)}
\`\`\`

**규칙 기반 파싱 결과 - 진단현황:**
\`\`\`json
${JSON.stringify(parsedData.진단현황 || [], null, 2)}
\`\`\`

**검증 및 수정 규칙:**

## A. 보유 계약 리스트 검증

1. **보험사명 정확성:**
   - 원본 PDF에서 정확한 보험사명을 추출하세요
   - 예: "메리츠", "메리츠화재", "삼성생명", "교보생명", "DB손보" 등
   - "(무)" 접두사는 상품명에 포함되므로 보험사로 인식하지 마세요
   - "—" (em dash) 기호는 무시하세요
   - 보험사명이 없으면 빈 문자열("")로 표시

2. **상품명 정확성:**
   - 원본 PDF의 정확한 상품명을 추출하세요
   - "(무)", "(무배당)" 등의 접두사는 상품명에 포함
   - 보험사명과 중복되지 않도록 주의

3. **납입 상태 추론:**
   - 원본 PDF에서 "납입완료", "완납", "종료" 등의 표시가 있는지 확인
   - 납입기간이 만료되었거나 완료 표시가 있으면 "완료"
   - 그 외에는 "진행중"으로 설정

4. **월보험료 검증:**
   - 원본 PDF의 월보험료 컬럼 값과 비교
   - 납입 완료 계약의 경우 월보험료는 0으로 설정
   - 숫자만 추출 (쉼표, "원" 등 제거)
   - **중요**: 납입상태가 "완료"인 계약은 총보험료 및 활성월보험료 합계에서 제외

5. **계약일 형식:**
   - YYYY-MM-DD 형식으로 통일

6. **기타 필드:**
   - 납입주기, 납입기간, 만기, 가입당시금리는 원본 PDF 기준으로 정확히 추출

## B. 담보별 진단현황 검증

1. **담보명 정확성:**
   - 원본 PDF의 12페이지 "담보별 진단현황" 섹션에서 정확한 담보명 추출
   - 카테고리별 그룹화 유지 (사망보장, 암보장, 뇌심장질환보장, 실손의료비보장, 상해/질병보장 등)

2. **금액 검증:**
   - 권장금액: 원본 PDF의 "권장" 또는 "추천" 컬럼 값
   - 가입금액: 원본 PDF의 "현재" 또는 "가입" 컬럼 값
   - 부족금액: 권장금액 - 가입금액 (음수 가능)
   - 단위: 원 단위 숫자 (쉼표 제거, "만원", "억원" 변환)

3. **상태 분류:**
   - "부족": 가입금액이 권장금액의 70% 미만
   - "주의": 가입금액이 권장금액의 70~99%
   - "충분": 가입금액이 권장금액의 100% 이상
   - "미가입": 가입금액이 0원 또는 표시 없음

## C. 실효/해지계약현황 검증

1. **원본 PDF 확인:**
   - "실효/해지계약현황" 또는 유사한 제목의 섹션이 있는지 확인
   - 없으면 빈 배열 반환

2. **추출 필드:**
   - 상태: "실효" 또는 "해지"
   - 회사명: 보험사명 (보험사명 규칙 동일)
   - 상품명: 상품명 전체
   - 계약일: YYYY-MM-DD 형식
   - 납입주기: 월납, 연납 등
   - 납입기간: XX년, XX세 등
   - 만기: XX세, 종신 등
   - 월보험료: 숫자만 (납입 완료 계약은 0)

## D. 상품별 가입담보상세 검증

1. **원본 PDF 확인:**
   - "상품별 가입담보상세" 또는 "상품별 가입현황" 섹션에서 추출
   - 각 상품(보험계약)별로 담보 목록을 그룹화

2. **추출 필드:**
   - 상품명: 보험 상품명
   - 보험사: 보험사명 (선택)
   - 계약자: 계약자 이름 (선택)
   - 피보험자: 피보험자 이름 (선택)
   - 납입주기: 월납, 연납 등 (선택)
   - 납입기간: XX년, XX세 (선택)
   - 만기: XX세, 종신 (선택)
   - 보험기간: 보험기간 정보 (선택)
   - 월납보험료: 월 납입 보험료 (선택)
   - 담보목록: 각 담보별 정보 배열
     - 번호: 담보 번호 (자동 부여)
     - 구분: 주계약/특약/특별약관 등
     - 회사담보명: 보험사가 사용하는 담보명
     - 신정원담보명: 표준화된 담보명 (있으면)
     - 가입금액: 담보별 가입금액

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
