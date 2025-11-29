/**
 * ============================================================================
 * 🤖 AI VALIDATION SERVICE - KB Insurance PDF Validator
 * ============================================================================
 * 
 * Supported Models: Google Gemini, Anthropic Claude, OpenAI GPT-5-Codex
 * Switch between models by commenting/uncommenting in validate-contracts.js
 * 
 * ============================================================================
 * 📊 AVAILABLE MODELS
 * ============================================================================
 * 
 * ✅ OpenAI GPT-5-Codex (NEW - Highest Accuracy)
 *    - Cost: Variable based on usage
 *    - API Key: OPENAI_API_KEY (from .genspark_llm.yaml)
 *    - PDF Processing: ✓ Vision API with base64
 *    - Korean: ✓ Excellent support
 *    - JSON Output: ✓ Structured output with schema validation
 *    - Model: gpt-5-codex
 *    - Best for: Highest accuracy, complex data extraction, strict schema
 * 
 * ✅ Google Gemini 2.0 Flash (Primary - Recommended)
 *    - Cost: FREE (Rate limited) or ~$0.075 per 1M tokens
 *    - API Key: GEMINI_API_KEY
 *    - PDF Processing: ✓ Native PDF support
 *    - Korean: ✓ Excellent support
 *    - JSON Output: ✓ Native JSON mode
 *    - Model: gemini-2.0-flash-exp
 *    - Best for: Cost-effective, fast, accurate
 * 
 * ✅ Anthropic Claude Sonnet 4.5 (Alternative - High Accuracy)
 *    - Cost: ~$100/1000 calls (4-page PDF)
 *    - API Key: ANTHROPIC_API_KEY
 *    - PDF Processing: ✓ Direct PDF processing
 *    - Korean: ✓ Excellent support
 *    - JSON Output: ✓ Stable format
 *    - Model: claude-sonnet-4-5-20250929
 *    - Best for: Maximum accuracy, no item omission
 * 
 * ============================================================================
 */

import OpenAI from 'openai';

/**
 * Google Gemini 2.0 Flash - Primary Model (Free/Low Cost)
 */
export async function validateWithGemini(pdfBase64, parsedData, env) {
  const apiKey = env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = buildPrompt(parsedData);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: pdfBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  return parseAIResponse(aiResponse, 'gemini-2.0-flash-exp');
}

/**
 * Anthropic Claude Sonnet 4.5 - Alternative Model (High Accuracy)
 */
export async function validateWithClaude(pdfBase64, parsedData, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const prompt = buildPrompt(parsedData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const aiResponse = result.content?.[0]?.text;
  
  return parseAIResponse(aiResponse, 'claude-sonnet-4-5');
}

/**
 * OpenAI GPT-5-Codex - New Model (Highest Accuracy)
 */
export async function validateWithGPT5Codex(pdfBase64, parsedData, env) {
  // Load API key from environment (injected from .genspark_llm.yaml)
  const apiKey = env.OPENAI_API_KEY;
  const baseURL = env.OPENAI_BASE_URL || 'https://www.genspark.ai/api/llm_proxy/v1';
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured. Please set up LLM API key in GenSpark.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const prompt = buildPrompt(parsedData);

  // Convert PDF base64 to data URL for GPT-5 Vision API
  const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-5-codex',
      messages: [
        {
          role: 'system',
          content: `You are an expert insurance document analyzer with STRICT validation rules:

**DATA INTEGRITY (Highest Priority):**
1. Extract ONLY data that exists in PDF - NEVER fabricate, guess, or invent
2. Missing sections → empty array [] (NO fake data with null values)
3. Follow exact JSON schema - key names, types, structure must match 100%
4. Missing optional fields → null, Missing entire sections → []
5. Maintain exact order from templates - NEVER reorder or sort

**진단현황 CRITICAL RULES:**
1. Use ONLY the 35 coverage names provided in the template - NO variations allowed
2. Match PDF coverage names to template names exactly:
   - "상해 사망" → "상해사망"
   - "일반암 진단" → "일반암"
   - DO NOT create new coverage names like "상해사망보장", "암진단비"
3. Calculate diagnosis correctly:
   - 가입금액 = 0 → "미가입"
   - 가입금액 > 0 AND < 권장금액 → "부족"
   - 가입금액 ≥ 권장금액 → "충분"
4. Include ALL 35 coverages in the exact order provided
5. NEVER skip or reorder coverages

**EXAMPLE:**
권장금액: 200000000 (2억), 가입금액: 15000000 (1500만)
→ 진단: "부족" (NOT "미가입")

Your accuracy = precision (no false data) > recall (finding everything).`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: pdfDataUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: 'json_object' }
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('Empty response from GPT-5-Codex');
    }

    return parseAIResponse(aiResponse, 'gpt-5-codex');
  } catch (error) {
    console.error('GPT-5-Codex API error:', error);
    throw new Error(`GPT-5-Codex validation failed: ${error.message}`);
  }
}

/**
 * Build validation prompt
 */
function buildPrompt(parsedData) {
  return `
KB 보험 보장분석 리포트 검증 시스템. 원본 PDF에서 5개 섹션을 **정확한 페이지 위치와 명칭**으로 추출.

**⚠️ 최우선 원칙:**
1. 아래 "참고 데이터"는 규칙 기반 파싱 결과로, **오류가 있을 수 있습니다**
2. **반드시 원본 PDF를 직접 읽고** 데이터를 추출하세요
3. PDF 내용과 참고 데이터가 다르면 **PDF 내용이 항상 우선**입니다
4. 참고 데이터는 구조 파악용으로만 사용하세요
5. **PDF의 정확한 섹션 명칭과 페이지 위치를 반드시 준수**하세요

**📍 PDF 섹션별 정확한 명칭 및 위치:**

---

### 1️⃣ **담당자 정보** (PDF 1페이지 - 표지)
   - **섹션 정확 명칭**: "담당자 정보" 또는 표지 하단 설계사 정보
   - **위치**: PDF 첫 페이지 표지 하단
   - **추출 항목**:
     * **설계사명**: 표지 하단의 설계사 이름 (예: "홍길동")
     * **전화번호**: 설계사 연락처 (010-XXXX-XXXX 형식)
     * **소속**: "인카다이렉트 IMC사업단" (고정값)
   - **⚠️ 주의**: 이 섹션은 **1페이지에만** 존재, 다른 페이지와 혼동 금지

---

### 2️⃣ **고객정보 + 계약현황** (PDF 5페이지)
   - **섹션 정확 명칭**: "고객정보" 및 "계약현황" 영역
   - **위치**: PDF 5페이지 상단
   - **추출 항목**:
     * **고객명**: 고객 이름 (예: "홍길순")
     * **나이**: 고객 나이 (예: 45)
     * **성별**: 남 또는 여
     * **보유계약수**: 유지 중인 계약 개수 ("님의 보유 계약 리스트" 표 행 개수)
     * **월보험료**: 유지 중인 계약의 월보험료 합계 (숫자로만 추출)

---

### 3️⃣ **보유 계약 리스트** (PDF 5페이지)
   - **섹션 정확 명칭**: "님의 보유 계약 리스트" 표
   - **위치**: PDF 5페이지, 고객정보/계약현황 바로 아래
   - **테이블 특징**: 
     * 표 제목: "OOO님의 보유 계약 리스트" (고객명이 포함됨)
     * 컬럼: 보험사, 상품명, 계약일, 납입주기, 납입기간, 만기, 월보험료
     * **중요**: 이 표는 **현재 유지 중인 계약만** 표시됨 (해지/실효 계약 제외)
   
   - **각 계약당 추출 항목**:
     * **보험사**: 회사명 (예: "삼성화재")
     * **상품명**: 상품명 (예: "암보험 플러스")
     * **가입일**: 계약일 (YYYY-MM-DD 형식)
     * **납입방법**: 납입주기 (월납, 연납, 일시납)
     * **납입기간**: 납입기간 (예: "10년", "20년", "종신")
     * **만기나이**: 만기 (예: "80세", "종신")
     * **월보험료**: 월 보험료 (숫자로만 추출)
     * **상태**: "유지" (보유 계약 리스트에 있는 계약은 모두 유지 중)
     * **납입상태**: "납입중" 또는 "납입완료" (계약일 + 납입기간 계산)
       - 계산 방법: 계약일 + 납입기간 = 납입완료일
       - 오늘 날짜(2025-11-28) > 납입완료일 → "납입완료"
       - 오늘 날짜(2025-11-28) ≤ 납입완료일 → "납입중"
       - 예: 가입일 2010-10-01 + 납입기간 10년 = 2020-10-01 < 2025-11-28 → 납입완료
     * **납입완료보험료**: 납입완료 계약의 경우, 이미 납입한 총 보험료 (월보험료 × 경과월수)
     * **납입예정보험료**: 납입중인 계약의 경우, 앞으로 납입할 총 보험료 (월보험료 × 미경과월수)

---

### 4️⃣ **실효/해지 계약 현황** (PDF 변동 페이지 - 5페이지 이후)
   - **섹션 정확 명칭**: "OOO님의 실효/해지 계약 현황" 표
   - **위치**: 
     * 보유 계약 리스트 표 **바로 아래** 또는 다음 페이지
     * 페이지는 고정되지 않음 (보유 계약 수에 따라 변동)
     * **중요**: "보유 계약 리스트" 표 이후 섹션을 반드시 확인
   - **테이블 특징**: 
     * 표 제목: "OOO님의 실효/해지 계약 현황" (고객명 포함)
     * 컬럼: 보험사, 상품명, 계약일, 납입주기, 납입기간, 만기, 월보험료, 상태, 해지사유
     * **시각적 특징**: 별도 테이블, 회색 배경 또는 구분선으로 분리
     * **중요**: 이 표는 **보유 계약 리스트와 동일한 컬럼 구조**를 가짐 (+ 상태, 해지사유)
   
   - **각 계약당 추출 항목 (보유 계약 리스트와 동일 + 상태)**:
     * **보험사**: 회사명
     * **상품명**: 상품명
     * **가입일**: 계약일 (YYYY-MM-DD 형식)
     * **납입방법**: 납입주기 (월납, 연납, 일시납)
     * **납입기간**: 납입기간
     * **만기나이**: 만기 (예: "80세", "종신")
     * **월보험료**: 월 보험료 (숫자)
     * **상태**: "해지" 또는 "실효" (PDF에 표시된 상태 그대로 추출)
     * **해지사유**: 해지 사유 (예: "만기", "중도해지", "자진해지", null 가능)
   
   - **⚠️ 중요 규칙**: 
     * **해지일은 추출하지 않음** (PDF에 표시되지 않는 경우가 많아 제외)
     * 보유 계약 리스트와 **동일한 필드 구조** 사용 (+ 상태, 해지사유만 추가)
     * 없는 필드는 null로 처리 (가입일, 납입방법, 납입기간, 만기, 월보험료, 해지사유)

   - **🚨 3단계 검증 프로세스 (철저히 수행):**
   
     **1단계: 표 검색 (최우선)**
       * **표 이름 검색**: "님의 실효/해지 계약 현황", "실효·해지 계약", "해지 계약 현황", "종료된 계약"
       * **컬럼명 확인**: "해지일", "해지사유", "종료일", "상태" 컬럼이 있는지 확인
       * **위치**: 보유 계약 리스트 표 **바로 아래** 또는 다음 페이지
       * **시각적 특징**: 별도 테이블, 회색 배경 또는 구분선으로 분리
   
     **2단계: 키워드 검색 (표가 없을 경우)**
       * PDF 전체에서 다음 키워드 검색:
         - "실효", "해지", "중도해지", "해약", "종료", "만기종료"
         - "계약종료", "해지계약", "실효계약", "탈퇴"
       * 키워드 주변 텍스트에서 계약 정보 추출 시도
       * 날짜 패턴 (YYYY-MM-DD 또는 YYYY.MM.DD) 찾기
   
     **3단계: 텍스트 마이닝 (최종 수단)**
       * 보유 계약 리스트에 **없지만** PDF 어디선가 언급된 계약
       * "해지", "실효" 단어가 포함된 모든 계약명 추출
       * 상태가 "종료", "만기", "해지됨"으로 표시된 계약
   
   - **🔍 추출 정확도 체크리스트**:
     * [ ] PDF 전체를 처음부터 끝까지 스캔했는가?
     * [ ] "님의 보유 계약 리스트" 이후 섹션을 꼼꼼히 확인했는가?
     * [ ] 작은 글씨, 각주, 페이지 하단도 확인했는가?
     * [ ] 최소 1회 이상 "실효", "해지" 키워드 검색을 시도했는가?
   
   - **📋 반환 규칙 (엄격히 준수):**
     * **🚨 PDF에 실효/해지 계약 섹션이 없으면 빈 배열 [] 반환**
     * **실제로 없는 경우**: 
       - 3단계 검증을 모두 시도했으나 찾지 못한 경우
       - **반드시 빈 배열 []만 반환** (null이나 임의 데이터 금지)
       - 수정사항에 "실효/해지 계약 섹션이 PDF에 없음" 명시
   
   - **찾았으나 정보 부족**: 
     * 계약은 존재하나 해지일이나 해지사유가 누락된 경우
     * 있는 정보만 채우고 누락된 필드는 null
     * 수정사항에 "해지일 정보 누락" 등 명시
   
   - **확신 없음**: 
     * 의심스러운 데이터는 **포함하지 말 것**
     * 명확하지 않으면 빈 배열 [] 반환
   
   **⚠️ 절대 금지**:
   - ❌ 보유 계약 리스트와 혼동 금지
   - ❌ 임의로 데이터 생성 금지 (해지일 만들어내기 금지)
   - ❌ 1단계만 확인하고 포기하지 말 것
   - ❌ null 값으로 채운 가짜 데이터 생성 금지


---

### 5️⃣ **전체 담보 진단 현황** (PDF 변동 페이지 - 실효/해지 계약 현황 다음 페이지)
   - **섹션 정확 명칭**: "OOO님의 전체 담보 진단 현황" 표
   - **위치**: 
     * "실효/해지 계약 현황" 표 **바로 다음 페이지**
     * 페이지는 고정되지 않음 (실효/해지 계약 수에 따라 변동)
     * **중요**: "실효/해지 계약 현황" 다음 페이지를 반드시 확인
   - **테이블 특징**: 
     * 표 제목: "OOO님의 전체 담보 진단 현황" (고객명 포함)
     * 컬럼: 담보명, 권장금액, 가입금액, 부족금액, 진단/상태
     * **중요**: 이 표는 **35개 담보 항목**이 반드시 순서대로 나열됨
   
   - **각 진단 항목당 추출 데이터**:
     * **담보명**: 표의 담보명 컬럼에서 추출 (정확한 담보명 사용, 아래 35개 템플릿 참조)
     * **권장금액**: 표의 '권장' 또는 '적정금액' 컬럼 (PDF 원본 값, **필수**)
     * **가입금액**: 표의 '가입금액' 컬럼 (미가입이면 0, **필수**)
     * **부족금액**: 권장금액 - 가입금액 (음수면 0, 충족이면 0)
     * **진단**: 
       - "미가입" - 가입금액 = 0
       - "부족" - 부족금액 > 0
       - "충분" - 가입금액 ≥ 권장금액

   - **🎯 진단현황 순서 보장 (필수 규칙)**: 
   
     **원칙 1: 템플릿 순서 절대 준수**
       * 아래 35개 템플릿 순서를 **절대 변경하지 말 것**
       * PDF 표 순서와 관계없이 **템플릿 순서로 재배치**
       * 담보를 **절대 재정렬하지 말 것** (알파벳, 금액, 중요도 정렬 금지)
       * **템플릿에 있는 35개 담보는 모두 포함**할 것 (PDF에 없어도 포함)
   
     **원칙 2: 정확한 담보명 매칭**
       * PDF 담보명을 아래 35개 템플릿 담보명 중 하나로 **정확히 매칭**
       * 매칭 예시:
         - PDF "상해 사망" → 템플릿 "상해사망"
         - PDF "일반암 진단" → 템플릿 "일반암"
         - PDF "암진단비" → 템플릿 "일반암"
       * **새로운 담보명 생성 금지** (예: "상해사망보장", "암진단비" 등 변형 금지)
     
     **원칙 3: 미가입 항목 처리**
       * PDF에 담보명이 없는 경우: 
         - 가입금액=0, 권장금액=0, 부족금액=0, 상태="미가입"
       * PDF에 담보명은 있으나 가입금액이 없는 경우: 
         - 가입금액=0, 부족금액=권장금액, 상태="미가입"
   
     **원칙 4: 데이터 추출 필수 규칙**
       * PDF 표에서 권장금액과 가입금액을 **반드시 함께 추출**할 것
       * 권장금액만 있고 가입금액이 비어있으면 → 가입금액=0
       * 가입금액만 있고 권장금액이 비어있으면 → 권장금액=가입금액
       * 둘 다 비어있으면 → 둘 다 0으로 설정
   
     **원칙 5: 부족금액 계산 로직**
       * 미가입: 가입금액=0 → 부족금액 = 권장금액
       * 부족: 가입금액 > 0 AND 가입금액 < 권장금액 → 부족금액 = 권장금액 - 가입금액
       * 충분: 가입금액 ≥ 권장금액 → 부족금액 = 0 


   **📝 필수 담보명 리스트 (35개 항목 - 이 이름만 사용할 것):**
   
   **🚨 중요: 아래 담보명을 정확히 사용하고, 새로운 담보명을 만들지 말 것**
   
   **[사망장해/치매간병]**
   1. 상해사망
   2. 질병사망
   3. 상해80%미만후유장해
   4. 질병80%미만후유장해
   5. 장기요양간병비
   6. 경증치매진단
   7. 간병인/간호간병상해일당
   8. 간병인/간호간병질병일당
   
   **[3대질병(암/뇌/심장) 진단]**
   9. 일반암
   10. 유사암
   11. 고액암
   12. 고액(표적)항암치료비
   13. 뇌혈관질환
   14. 뇌졸중
   15. 뇌출혈
   16. 허혈성심장질환
   17. 급성심근경색증
   
   **[실손의료비]**
   18. 상해입원의료비
   19. 상해통원의료비
   20. 질병입원의료비
   21. 질병통원의료비
   22. 3대비급여실손
   
   **[수술입원]**
   23. 상해수술비
   24. 질병수술비
   25. 암수술비
   26. 뇌혈관질환수술비
   27. 허혈성심장질환수술비
   28. 상해입원일당
   29. 질병입원일당
   
   **[운전자 기타]**
   30. 벌금(대인/스쿨존/대물)
   31. 교통사고처리지원금
   32. 변호사선임비용
   33. 자동차사고부상
   34. 가족/일상/자녀배상
   35. 화재벌금

   **📋 담보명 매칭 규칙:**
   
   PDF에서 추출한 담보명을 위 35개 중 하나로 매칭:
   - "상해 사망" → "상해사망"
   - "일반암 진단" → "일반암"
   - "뇌졸중 진단" → "뇌졸중"
   - "허혈성 심장질환" → "허혈성심장질환"
   
   **⚠️ 절대 금지:**
   - ❌ 위 35개 외 새로운 담보명 생성 금지
   - ❌ 담보명 변형 금지 (예: "상해사망보장" → 사용 불가)
   - ❌ 영어나 약어 사용 금지
   
   **📊 진단 상태 계산 로직:**
   - **미가입**: 가입금액 = 0
   - **부족**: 가입금액 > 0 AND 가입금액 < 권장금액
   - **충분**: 가입금액 ≥ 권장금액
   
   **예시:**
   - 권장금액 200,000,000원, 가입금액 15,000,000원 → 진단: "부족"
   - 권장금액 200,000,000원, 가입금액 0원 → 진단: "미가입"
   - 권장금액 200,000,000원, 가입금액 200,000,000원 → 진단: "충분"

**🔍 주의사항:**
- 보험사명이 여러 줄에 걸쳐 있으면 합쳐서 하나로 작성
- 금액은 쉼표 제거하고 숫자만 (예: "1,500만" → 15000000)
- 날짜 형식: YYYY-MM-DD
- 담보명 정규화: "상해사망" = "상해 사망" = "상해사망담보"

**💰 납입 관련 계산 규칙:**

1. **납입상태 판단**: 계약일 + 납입기간 = 납입완료일
   * 납입기간이 "10년" → 계약일에서 10년(120개월) 후
   * 납입기간이 "60세" → 고객 나이 60세가 되는 날
   * 납입기간이 "종신" → 납입중 (평생 납입)
   * 오늘 날짜(2025-11-28)과 비교하여 판단

2. **경과월수 계산**: 계약일부터 오늘(2025-11-28)까지의 개월수
   * 예: 2010-10-01 계약 → 2025-11-28까지 약 181개월 경과
   * 납입완료일 이후는 경과월수 = 납입기간(개월수)

3. **미경과월수 계산**: 납입기간(개월수) - 경과월수
   * 예: 10년납(120개월), 10개월 경과 → 110개월 미경과
   * 납입완료 계약은 미경과월수 = 0

4. **납입완료보험료**: 월보험료 × 경과월수
   * 예: 월 50,000원, 10개월 경과 → 500,000원
   * 납입완료 계약: 월보험료 × 납입기간(개월수)
   * 예: 월 50,000원, 10년납 → 6,000,000원

5. **납입예정보험료**: 월보험료 × 미경과월수
   * 예: 월 50,000원, 110개월 미경과 → 5,500,000원
   * 납입완료 계약: 0원

6. **계약별 월보험료**:
   * 납입중: 원래 월보험료 유지
   * 납입완료: 0원 (더 이상 납입하지 않음)

7. **고객정보 집계**:
   * 월보험료: 납입중인 계약만 합산
   * 총납입완료보험료: 모든 계약의 납입완료보험료 합계
   * 총납입예정보험료: 납입중 계약의 납입예정보험료 합계

**📊 PDF 표 구조 정확히 구분:**
- **"님의 보유 계약 리스트"**: 현재 유지 중인 계약 (월보험료 납입 중)
- **"님의 실효/해지 계약 현황"**: 이미 해지된 계약 (월보험료 납입 없음)
- 이 두 표는 **별도의 표**이며, 절대 합산하지 않음
- 고객정보의 계약수는 "보유 계약 리스트"의 건수만 계산
- 고객정보의 월보험료는 **납입중인 계약만** 합산 (납입완료 계약 제외)

**📅 계산 예시:**

**케이스 1: 납입완료 계약**
- 계약일: 2010-10-01
- 납입기간: 10년(120개월)
- 월보험료: 50,000원
- 납입완료일: 2020-10-01
- 오늘: 2025-11-28 > 2020-10-01 → **납입완료** ✅
- 경과월수: 120개월 (납입기간)
- 미경과월수: 0개월
- 납입완료보험료: 50,000원 × 120개월 = 6,000,000원
- 납입예정보험료: 0원
- 현재 월보험료: 0원

**케이스 2: 납입중 계약**
- 계약일: 2020-01-01
- 납입기간: 20년(240개월)
- 월보험료: 100,000원
- 납입완료일: 2040-01-01
- 오늘: 2025-11-28 < 2040-01-01 → **납입중** ✅
- 경과월수: 약 71개월
- 미경과월수: 약 169개월
- 납입완료보험료: 100,000원 × 71개월 = 7,100,000원
- 납입예정보험료: 100,000원 × 169개월 = 16,900,000원
- 현재 월보험료: 100,000원

**📊 참고 데이터 (오류 가능성 있음):**
${JSON.stringify(parsedData, null, 2)}

**📤 응답 형식 (STRICT JSON SCHEMA - 정확히 따를 것):**

**🚨 중요: 다음 JSON 스키마를 정확히 따르지 않으면 시스템 오류 발생**

{
  "설계사정보": {
    "설계사명": "string",
    "전화번호": "010-XXXX-XXXX",
    "소속": "인카다이렉트 IMC사업단"
  },
  "고객정보": {
    "고객명": "string",
    "나이": number,
    "성별": "남자" | "여자",
    "보유계약수": number,
    "월보험료": number,
    "총납입완료보험료": number,
    "총납입예정보험료": number
  },
  "계약리스트": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "납입방법": "월납" | "연납" | "일시납",
      "납입기간": "string",
      "만기나이": "string",
      "월보험료": number,
      "납입상태": "납입중" | "납입완료",
      "경과월수": number,
      "미경과월수": number,
      "납입완료보험료": number,
      "납입예정보험료": number,
      "상태": "유지"
    }
  ],
  "실효해지계약": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "납입방법": "월납" | "연납" | "일시납",
      "납입기간": "string",
      "만기나이": "string",
      "월보험료": number,
      "상태": "해지" | "실효"
    }
  ],
  "진단현황": [
    {
      "담보명": "상해사망",
      "권장금액": 200000000,
      "가입금액": 15000000,
      "부족금액": 185000000,
      "진단": "부족"
    },
    {
      "담보명": "질병사망",
      "권장금액": 150000000,
      "가입금액": 0,
      "부족금액": 150000000,
      "진단": "미가입"
    },
    {
      "담보명": "상해80%미만후유장해",
      "권장금액": 100000000,
      "가입금액": 100000000,
      "부족금액": null,
      "진단": "충분"
    },
    {
      "담보명": "질병80%미만후유장해",
      "권장금액": 50000000,
      "가입금액": 30000000,
      "부족금액": 20000000,
      "진단": "부족"
    }
    // ... (35개 담보를 위 순서대로 모두 포함)
    // 담보명은 반드시 위에 제시된 35개 중 하나여야 함
  ],
  "수정사항": ["string"]
}

**🔒 JSON 스키마 검증 규칙:**

1. **필수 키**: 위 5개 키는 반드시 포함 (설계사정보, 고객정보, 계약리스트, 실효해지계약, 진단현황)
2. **키 이름 정확성**: 키 이름은 위와 정확히 일치해야 함 (공백, 특수문자 포함)
3. **배열 타입**: 계약리스트, 실효해지계약, 진단현황은 반드시 배열 (빈 배열 []도 허용)
4. **숫자 타입**: 금액, 나이, 월수 등은 반드시 number 타입 (문자열 금지)
5. **진단현황 순서**: 35개 담보를 템플릿 순서대로 배치 (재정렬 절대 금지)

**⚠️ 절대 금지 사항:**
- ❌ 키 이름 변경 (예: "실효해지계약" → "해지계약")
- ❌ 배열을 객체로 반환 (예: 계약리스트가 객체로 반환)
- ❌ 담보 순서 재정렬 (알파벳, 금액, 중요도 순 정렬 금지)
- ❌ 데이터 누락 (35개 담보 모두 포함, PDF에 없어도 포함)
`;
}

/**
 * Parse AI response
 */
function parseAIResponse(responseText, modelName = 'unknown') {
  if (!responseText) {
    throw new Error('Empty AI response');
  }

  // Remove markdown code blocks if present
  let cleanedText = responseText.trim();
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/```\n?/g, '');
  }

  try {
    const parsed = JSON.parse(cleanedText);
    
  
  // 🔍 디버그: AI가 반환한 모든 키 확인
  // 🔍 중요: JSON 파싱 전 원본 확인 (실효해지계약 키 손실 디버깅)
console.log('📄 AI 원본 응답 (처음 500자):', cleanedText.substring(0, 500));
console.log('📄 실효해지계약 키워드 존재?:', cleanedText.includes('실효해지계약'));
console.log('🔍 AI 반환 키 목록:', Object.keys(parsed));
console.log('🔍 실효해지계약 관련 키:', Object.keys(parsed).filter(k => k.includes('실효') || k.includes('해지')));

// 🚨 중요: 실효해지계약 키 이름 정규화 (AI가 다양한 이름으로 반환 가능)
const terminatedKeys = [
  '실효해지계약', 
  '실효·해지계약', 
  '실효/해지계약',
  '실효 해지계약',
  '해지계약',
  '실효계약', 
  'lapsedContracts', 
  'terminatedContracts',
  'cancelledContracts'
];
let terminatedData = null;
console.log('📊 전체 JSON 구조:', JSON.stringify(parsed, null, 2).substring(0, 2000));

// 1차: 정확한 키 매칭    
for (const key of terminatedKeys) {
  if (parsed[key]) {
    terminatedData = parsed[key];
    console.log(`✅ 실효해지계약 데이터 발견! 키: "${key}", 개수: ${terminatedData.length}`);
    break;
  }
}

// 2차: 부분 매칭 (키에 "실효" 또는 "해지" 포함)
if (!terminatedData) {
  const allKeys = Object.keys(parsed);
  const matchedKey = allKeys.find(key => 
    key.includes('실효') || key.includes('해지') || 
    key.toLowerCase().includes('lapsed') || 
    key.toLowerCase().includes('terminated') ||
    key.toLowerCase().includes('cancelled')
  );
  
  if (matchedKey && Array.isArray(parsed[matchedKey])) {
    terminatedData = parsed[matchedKey];
    console.log(`✅ 실효해지계약 데이터 발견 (부분 매칭)! 키: "${matchedKey}", 개수: ${terminatedData.length}`);
  }
}

// 정규화된 키로 저장
parsed.실효해지계약 = terminatedData || [];
console.log(`📋 최종 실효해지계약 개수: ${parsed.실효해지계약.length}`);

// 원래 키 정리 (중복 방지)
terminatedKeys.forEach(key => {
  if (key !== '실효해지계약' && parsed[key]) {
    delete parsed[key];
  }
});

// 부분 매칭으로 찾은 키도 정리
const allKeys = Object.keys(parsed);
allKeys.forEach(key => {
  if (key !== '실효해지계약' && 
      (key.includes('실효') || key.includes('해지') || 
       key.toLowerCase().includes('lapsed') || 
       key.toLowerCase().includes('terminated'))) {
    delete parsed[key];
  }
});

    
    // 담보별현황은 더 이상 사용하지 않음 (진단현황으로 통합)
    if (parsed.담보별현황) {
      delete parsed.담보별현황;
    }
    
    // 실효해지계약이 없으면 빈 배열로 초기화
    if (!parsed.실효해지계약) {
      parsed.실효해지계약 = [];
    }
    
    // 설계사정보가 없으면 기본값으로 초기화
    if (!parsed.설계사정보) {
      parsed.설계사정보 = {
        설계사명: '',
        전화번호: '',
        소속: '인카다이렉트 IMC사업단'
      };
    }
    
    // 소속이 비어있으면 기본값 설정
    if (!parsed.설계사정보.소속) {
      parsed.설계사정보.소속 = '인카다이렉트 IMC사업단';
    }

    // 모델 정보 추가
    parsed.model = modelName;

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', cleanedText.substring(0, 200));
    throw new Error(`JSON parse error: ${error.message}`);
  }
}
