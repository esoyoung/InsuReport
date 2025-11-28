/**
 * ============================================================================
 * 🤖 AI VALIDATION SERVICE - KB Insurance PDF Validator
 * ============================================================================
 * 
 * Supported Models: Google Gemini & Anthropic Claude
 * Switch between models by commenting/uncommenting in validate-contracts.js
 * 
 * ============================================================================
 * 📊 AVAILABLE MODELS
 * ============================================================================
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
  
  return parseAIResponse(aiResponse);
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
  
  return parseAIResponse(aiResponse);
}

/**
 * Build validation prompt
 */
function buildPrompt(parsedData) {
  return `
KB 보험 보장분석 리포트 검증 시스템. 원본 PDF에서 4개 섹션 추출 및 검증.

**⚠️ 중요 지침:**
1. 아래 "참고 데이터"는 규칙 기반 파싱 결과로, **오류가 있을 수 있습니다**
2. **반드시 원본 PDF를 직접 읽고** 데이터를 추출하세요
3. PDF 내용과 참고 데이터가 다르면 **PDF 내용이 항상 우선**입니다
4. 참고 데이터는 구조 파악용으로만 사용하세요

**📋 추출할 섹션:**

1. **설계사정보** (PDF 표지에서 추출)
   - **설계사명**: 표지 하단의 설계사 이름
   - **전화번호**: 설계사 연락처 (010-XXXX-XXXX 형식)
   - **소속**: "인카다이렉트 IMC사업단" (고정값)
   - **⚠️ 중요**: 표지 페이지 하단에 설계사 이름과 전화번호가 표시됨

2. **고객정보**
   - 고객명, 나이, 성별
   - **보유계약수**: 유지 중인 계약만 ("님의 보유 계약 리스트" 표에서 추출)
   - **월보험료**: 유지 중인 계약의 월보험료 합계

3. **계약리스트** ("님의 보유 계약 리스트" 표)
   각 계약당:
   - 보험사, 상품명, 가입일, 납입방법, 납입기간, 만기나이, 월보험료
   - **상태**: "유지" (보유 계약 리스트에 있는 계약은 모두 유지 중)
   - **납입상태**: "납입중" 또는 "납입완료" (계약일 + 납입기간 계산)
     * 계산 방법: 계약일 + 납입기간 = 납입완료일
     * 오늘 날짜(2025-11-28) > 납입완료일 → "납입완료"
     * 오늘 날짜(2025-11-28) ≤ 납입완료일 → "납입중"
     * 예: 가입일 2010-10-01 + 납입기간 10년 = 2020-10-01 < 2025-11-28 → 납입완료
   - **납입완료보험료**: 납입완료 계약의 경우, 이미 납입한 총 보험료 (월보험료 × 경과월수)
   - **납입예정보험료**: 납입중인 계약의 경우, 앞으로 납입할 총 보험료 (월보험료 × 미경과월수)

   **⚠️ 중요 - 보유 계약 리스트**: 
   - PDF의 "님의 보유 계약 리스트" 표에 나열된 계약만 추출
   - 이 표는 **현재 유지 중인 계약만** 표시됨

4. **실효해지계약** ("님의 실효/해지 계약 현황" 표)
   각 계약당:
   - 보험사, 상품명, 가입일, 해지일, 해지사유
   - **상태**: "해지" 또는 "실효"
   - **월보험료**: 0 (이미 해지되어 보험료 납입 없음)

   **🚨 중요 - 실효/해지 계약 추출 강화 (3단계 검증)**:
   
   **1단계: 표 검색 (최우선)**
   - **표 이름**: "님의 실효/해지 계약 현황", "실효·해지 계약", "해지 계약 현황", "종료된 계약"
   - **표 특징**: "해지일", "해지사유", "종료일", "상태" 컬럼 포함
   - **위치**: 보통 보유 계약 리스트 표 **바로 아래** 또는 다음 페이지
   - **시각적 특징**: 별도 테이블, 회색 배경 또는 구분선으로 분리
   
   **2단계: 키워드 검색 (표가 없을 경우)**
   - PDF 전체에서 다음 키워드 검색:
     * "실효", "해지", "중도해지", "해약", "종료", "만기종료"
     * "계약종료", "해지계약", "실효계약", "탈퇴"
   - 키워드 주변 텍스트에서 계약 정보 추출 시도
   - 날짜 패턴 (YYYY-MM-DD 또는 YYYY.MM.DD) 찾기
   
   **3단계: 텍스트 마이닝 (최종 수단)**
   - 보유 계약 리스트에 **없지만** PDF 어디선가 언급된 계약
   - "해지", "실효" 단어가 포함된 모든 계약명 추출
   - 상태가 "종료", "만기", "해지됨"으로 표시된 계약
   
   **🔍 추출 정확도 체크리스트**:
   - [ ] PDF 전체를 처음부터 끝까지 스캔했는가?
   - [ ] "님의 보유 계약 리스트" 이후 섹션을 꼼꼼히 확인했는가?
   - [ ] 작은 글씨, 각주, 페이지 하단도 확인했는가?
   - [ ] 최소 1회 이상 "실효", "해지" 키워드 검색을 시도했는가?
   
   **📋 반환 규칙**:
   - **실제로 없는 경우**: 빈 배열 [] 반환
   - **찾았으나 정보 부족**: 있는 정보만 채우고 나머지는 null
   - **확신 없음**: 의심되는 데이터라도 포함 (수정사항에 "불확실" 명시)
   
   **⚠️ 절대 금지**:
   - 보유 계약 리스트와 혼동 금지
   - 임의로 데이터 생성 금지
   - 1단계만 확인하고 포기하지 말 것


5. **진단현황** ("님의 상품별 진단현황" 표)
   각 진단당:
   - **담보명**: 표의 담보명 컬럼에서 추출
   - **권장금액**: 표의 '권장' 또는 '적정금액' 컬럼 (PDF 원본 값)
   - **가입금액**: 표의 '가입금액' 컬럼 (미가입이면 0)
   - **부족금액**: 권장금액 - 가입금액 (음수면 0, 충족이면 0)
   - **진단**: 
     * "부족" - 부족금액 > 0
     * "충분" - 가입금액 ≥ 권장금액
     * "미가입" - 가입금액 = 0

   **🎯 중요 - 진단현황 순서 보장 강화**: 
   
   **원칙: PDF 원본 순서 > 템플릿 순서**
   - **1순위**: 아래 35개 템플릿 순서에 따르고 해당 항목과 권장금액, 가입급액을 정확히 매칭 
   - 담보를 **절대 재정렬하지 말 것** (알파벳, 금액, 중요도 정렬 금지)
     
   **미가입 항목 처리**:
   - PDF에 없는 담보: 가입금액=0, 부족금액=권장금액, 상태="미가입"
   - 권장금액: 템플릿에 정의된 기본값을 우선으로 하고, 템플릿에 정의된 값이 없는 경우 PDF에 정의된 값
   
   **부족금액 계산 로직**:
   - 부족: 부족금액 = 권장금액 - 가입금액 (양수 값이면 부족 표시)
   - 충족: 권장금액 - 가입금액이 음수 값이면 null 표시 
   - 미가입: 부족금액 = 권장금액, 권장금액을 표시하고 부족 표시 


   **📝 기본 순서 템플릿 (35개 항목, 6개 카테고리):**
   
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

**📤 응답 형식 (JSON):**
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
    "보유계약수": number (유지 중인 계약만, "보유 계약 리스트" 표 기준),
    "월보험료": number (납입중인 계약의 월보험료 합계, 납입완료 제외),
    "총납입완료보험료": number (모든 계약의 납입완료보험료 합계),
    "총납입예정보험료": number (납입중 계약의 납입예정보험료 합계)
  },
  "계약리스트": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "납입방법": "월납" | "연납" | "일시납",
      "납입기간": "string",
      "만기나이": "number세" | "종신",
      "월보험료": number (납입중이면 월보험료, 납입완료면 0),
      "납입상태": "납입중" | "납입완료",
      "경과월수": number (계약일부터 오늘까지 경과한 개월수),
      "미경과월수": number (납입중인 경우, 남은 납입 개월수, 납입완료면 0),
      "납입완료보험료": number (월보험료 × 경과월수, 납입완료면 월보험료 × 납입기간),
      "납입예정보험료": number (납입중이면 월보험료 × 미경과월수, 납입완료면 0),
      "상태": "유지"
    }
  ],
  "실효해지계약": [
    {
      "보험사": "string",
      "상품명": "string",
      "가입일": "YYYY-MM-DD",
      "해지일": "YYYY-MM-DD",
      "해지사유": "string",
      "상태": "해지" | "실효"
    }
  ],
  "진단현황": [
    {
      "담보명": "string" (위 31개 템플릿 순서대로),
      "권장금액": number (PDF 원본 값, 항상 표시),
      "가입금액": number (미가입이면 0),
      "부족금액": number | null (부족이면 권장-가입, 충분/미가입이면 null),
      "진단": "부족" | "충분" | "미가입"
    }


**⚠️ 중요 - 진단현황 순서 엄수:**
- PDF "님의 상품별 진단현황" 표의 첫 번째 행부터 마지막 행까지 순서대로
- 절대 알파벳 순으로 정렬하지 말 것
- 절대 중요도나 금액 순으로 정렬하지 말 것
- PDF 표의 시각적 순서를 정확히 보존
  "수정사항": ["string"] (참고 데이터 대비 수정한 내용)
}
`;
}

/**
 * Parse AI response
 */
function parseAIResponse(responseText) {
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
console.log('🔍 AI 반환 키 목록:', Object.keys(parsed));
console.log('🔍 실효해지계약 관련 키:', Object.keys(parsed).filter(k => k.includes('실효') || k.includes('해지')));

// 🚨 중요: 실효해지계약 키 이름 정규화 (AI가 다양한 이름으로 반환 가능)
const terminatedKeys = ['실효해지계약', '실효·해지계약', '실효/해지계약', 'lapsedContracts', 'terminatedContracts'];
let terminatedData = null;

for (const key of terminatedKeys) {
  if (parsed[key]) {
    terminatedData = parsed[key];
    console.log(`✅ 실효해지계약 데이터 발견! 키: "${key}", 개수: ${terminatedData.length}`);
    break;
  }
}

// 정규화된 키로 저장
parsed.실효해지계약 = terminatedData || [];

// 원래 키 정리 (중복 방지)
terminatedKeys.forEach(key => {
  if (key !== '실효해지계약' && parsed[key]) {
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

    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', cleanedText.substring(0, 200));
    throw new Error(`JSON parse error: ${error.message}`);
  }
}
