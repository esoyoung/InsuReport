// src/utils/pdfParser.js

/**
 * KB 보장분석 PDF 파싱 유틸리티
 * 원본 PDF 구조 정확 분석 기반
 */

const sanitizeNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
};

const KNOWN_COMPANIES = [
  '삼성생명', '교보생명', '한화생명', '미래에셋생명', '라이나생명', 'AIA생명',
  'ING생명', '오렌지라이프', 'ABL생명', '농협생명', '신한라이프', '흥국생명',
  '동양생명', '푸본현대생명', '푸르덴셜생명', '메트라이프생명', 'DGB생명',
  'KB라이프생명', '교보라이프플래닛', 'DB생명', '에이스손해보험', 'AIG손해보험',
  '삼성화재', '현대해상', '메리츠화재', 'DB손해보험', 'DB손보', 'KB손해보험',
  '한화손해보험', '롯데손해보험', '흥국화재', 'MG손해보험', 'NH농협손해보험',
  '농협손해보험', '더케이손해보험', '우체국보험', '우정사업본부', 'AXA손해보험',
  '캐롯손해보험', 'Chubb손해보험', 'BNP파리바카디프생명', 'BNP파리바카디프손해보험',
  '메리츠', '메리츠생명'
];

const KNOWN_COMPANY_MAP = new Map(
  KNOWN_COMPANIES.map((name) => [name.replace(/\s+/g, ''), name])
);

const COMPANY_KEYWORD_PATTERN = /(생명|손해보험|화재|라이프|보험)$/;

function extractCompanyAndProduct(tokens) {
  if (!tokens || tokens.length === 0) {
    return { company: '', product: '' };
  }

  // 토큰 전처리: em dash, 하이픈, 빈 토큰 제거
  let workingTokens = tokens
    .filter((token) => token && token.trim().length > 0)
    .filter((token) => token !== '—' && token !== '-');

  if (workingTokens.length === 0) {
    return { company: '', product: '' };
  }

  // 전체 토큰 범위에서 보험사 탐색
  let foundCompany = null;
  let companyStartIndex = -1;
  let companyLength = 0;

  for (let start = 0; start < workingTokens.length; start += 1) {
    // (무)로 시작하는 토큰은 건너뛰기
    if (/^\(무/.test(workingTokens[start])) continue;

    const windowMax = Math.min(3, workingTokens.length - start);
    for (let length = windowMax; length >= 1; length -= 1) {
      const candidateTokens = workingTokens.slice(start, start + length);
      const normalizedCandidate = candidateTokens.join('').replace(/\s+/g, '');

      if (KNOWN_COMPANY_MAP.has(normalizedCandidate)) {
        foundCompany = KNOWN_COMPANY_MAP.get(normalizedCandidate);
        companyStartIndex = start;
        companyLength = length;
        break;
      }
    }
    if (foundCompany) break;
  }

  // 보험사를 찾은 경우
  if (foundCompany) {
    const productTokens = [
      ...workingTokens.slice(0, companyStartIndex),
      ...workingTokens.slice(companyStartIndex + companyLength)
    ];
    return {
      company: foundCompany,
      product: productTokens.join(' ').trim()
    };
  }

  // 보험사를 찾지 못한 경우 폴백 로직
  const [firstToken, ...restTokens] = workingTokens;
  
  // (무)로 시작하면 전체를 상품명으로
  if (/^\(무/.test(firstToken)) {
    return {
      company: '',
      product: workingTokens.join(' ').trim()
    };
  }

  // 보험 관련 키워드가 없으면 전체를 상품명으로
  if (!COMPANY_KEYWORD_PATTERN.test(firstToken)) {
    return {
      company: '',
      product: workingTokens.join(' ').trim()
    };
  }

  // 첫 토큰을 보험사로 추정
  return {
    company: firstToken,
    product: restTokens.join(' ').trim()
  };
}

// Y 좌표 기반 텍스트 추출
async function extractTextWithCoordinates(pdf) {
  const allText = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Y 좌표 기반 정렬
    const items = textContent.items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]; // Y 좌표 (위 -> 아래)
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4]; // X 좌표 (왼쪽 -> 오른쪽)
    });
    
    // 줄바꿈 처리
    let currentLine = '';
    let lastY = null;
    
    for (const item of items) {
      const currentY = item.transform[5];
      
      // 새로운 줄인지 확인 (Y 좌표 차이가 5 이상)
      if (lastY !== null && Math.abs(currentY - lastY) > 5) {
        allText.push(currentLine.trim());
        currentLine = '';
      }
      
      currentLine += item.str + ' ';
      lastY = currentY;
    }
    
    if (currentLine.trim()) {
      allText.push(currentLine.trim());
    }
    
    // 페이지 구분자
    allText.push('--- PAGE_BREAK ---');
  }
  
  return allText.join('\n');
}

/**
 * 설계사 정보 파싱 (1페이지 표지)
 * 담당 컨설턴트 정보 추출: 담당자명, 소속, 연락처, 이메일, 분석일자
 */
function parseAgentInfo(text) {
  const agentInfo = {
    담당자명: '', // 설계사명 → 담당자명으로 변경
    소속: '인카다이렉트 IMC사업단', // 고정값
    전화번호: '',
    이메일: '',
    분석일자: ''
  };
  
  // ============================================================================
  // 1페이지 표지에서 담당 컨설턴트 정보 추출
  // ============================================================================
  
  // 1페이지만 추출 (첫 번째 PAGE_BREAK 전까지)
  const firstPageMatch = text.match(/^([\s\S]*?)--- PAGE_BREAK ---/);
  const firstPageText = firstPageMatch ? firstPageMatch[1] : text;
  
  // 담당자명 추출 (다양한 패턴)
  // 패턴 1: "담당 컨설턴트 한인철" 또는 "담당자 한인철"
  let nameMatch = firstPageText.match(/담당\s*(?:컨설턴트|자|설계사)[\s:]*([가-힣]{2,4})/);
  
  // 패턴 2: "컨설턴트: 한인철" 또는 "설계사: 한인철"
  if (!nameMatch) {
    nameMatch = firstPageText.match(/(?:컨설턴트|설계사)[\s:]+([가-힣]{2,4})/);
  }
  
  // 패턴 3: 표지 하단에 이름만 있는 경우 (전화번호 바로 위)
  if (!nameMatch) {
    nameMatch = firstPageText.match(/([가-힣]{2,4})\s*\n\s*010[-\s]?\d{4}[-\s]?\d{4}/);
  }
  
  // 패턴 4: "한인철" 같은 3글자 이름을 직접 추출 (지점, 본부 등 제외)
  if (!nameMatch) {
    const excludeWords = ['지점', '본부', '사업단', '팀장', '부장', '과장'];
    const allNames = firstPageText.match(/[가-힣]{2,4}/g) || [];
    for (const name of allNames) {
      if (!excludeWords.includes(name) && name.length >= 2) {
        nameMatch = [null, name];
        break;
      }
    }
  }
  
  if (nameMatch) {
    const extractedName = nameMatch[1].trim();
    // "지점", "본부" 같은 단어 제외
    if (!['지점', '본부', '사업단', '팀장', '부장', '과장'].includes(extractedName)) {
      agentInfo.담당자명 = extractedName;
    }
  }
  
  // 전화번호 추출 (010-XXXX-XXXX 형식)
  const phoneMatch = firstPageText.match(/010[-\s]?(\d{4})[-\s]?(\d{4})/);
  if (phoneMatch) {
    agentInfo.전화번호 = `010-${phoneMatch[1]}-${phoneMatch[2]}`;
  }
  
  // 이메일 추출
  const emailMatch = firstPageText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    agentInfo.이메일 = emailMatch[1];
  }
  
  // 분석일자 추출 (YYYY-MM-DD 또는 YYYY.MM.DD 형식)
  const dateMatch = firstPageText.match(/분석일자[\s:]*(\d{4})[-.\s]?(\d{2})[-.\s]?(\d{2})/);
  if (dateMatch) {
    agentInfo.분석일자 = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  } else {
    // 분석일자 명시 없이 날짜만 있는 경우
    const simpleDateMatch = firstPageText.match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
    if (simpleDateMatch) {
      agentInfo.분석일자 = `${simpleDateMatch[1]}-${simpleDateMatch[2]}-${simpleDateMatch[3]}`;
    }
  }
  
  console.log('👔 담당자 정보:', agentInfo);
  
  // 최소한 담당자명이 있어야 유효한 데이터로 간주
  if (!agentInfo.담당자명) {
    console.warn('⚠️ 담당자명을 찾을 수 없습니다 (표지 정보 부족)');
    return {}; // 빈 객체 반환 (AI가 채울 수 있도록)
  }
  
  return agentInfo;
}

// 고객 정보 파싱
function parseCustomerInfo(text) {
  // "안영균 (61세 ,남자) 님의 전체 보장현황" 또는 "전체 계약리스트" 패턴
  const nameMatch = text.match(/([\w가-힣]+)\s*\((\d+)세\s*,\s*(남자|여자)\)\s*님의 전체/);
  
  if (!nameMatch) {
    console.warn('⚠️ 고객 정보를 찾을 수 없습니다');
    return null;
  }
  
  // ============================================================================
  // 계약요약현황 테이블에서 정확하게 추출
  // ============================================================================
  // 테이블 구조:
  // 보유계약  해지계약  실효계약  휴면계약  기타계약
  //    8         0         4         3         1
  // 월납입보험료총액
  // 427,097원
  
  // 1. 계약 수 추출 - 보유계약 숫자 (첫 번째 숫자)
  const contractCountMatch = text.match(/(?:보유계약|보유\s*계약)[\s\S]{0,100}?(\d+)\s+\d+\s+\d+/);
  
  // 2. 월보험료 추출 - "월납입보험료총액" 다음 줄의 금액
  // 패턴: 월납입보험료총액 다음에 나오는 숫자
  const premiumMatch = text.match(/월납입보험료총액[\s\S]{0,50}?([\d,]+)\s*원/);
  
  // Fallback: 6자리 이상 금액 찾기 (예: 427,097원)
  let monthlyPremium = 0;
  if (premiumMatch) {
    monthlyPremium = parseInt(premiumMatch[1].replace(/,/g, ''));
  } else {
    // Fallback: 6자리 숫자 패턴
    const fallbackPremiumMatches = text.match(/\d{3},\d{3}/g);
    if (fallbackPremiumMatches && fallbackPremiumMatches.length > 0) {
      monthlyPremium = parseInt(fallbackPremiumMatches[0].replace(/,/g, ''));
    }
  }
  
  const customerInfo = {
    이름: nameMatch[1],
    고객명: nameMatch[1], // 고객명 필드도 추가 (프롬프트와 일치)
    나이: parseInt(nameMatch[2]),
    성별: nameMatch[3],
    보유계약수: contractCountMatch ? parseInt(contractCountMatch[1]) : 0,
    월보험료: monthlyPremium
  };
  
  console.log('👤 고객 정보:', customerInfo);
  console.log(`  - 보유계약수: ${customerInfo.보유계약수}건`);
  console.log(`  - 월보험료: ${customerInfo.월보험료.toLocaleString()}원`);
  
  return customerInfo;
}

// 계약 리스트 파싱 (보유 계약 리스트 기반)
function parseContractList(text) {
  const contracts = [];

  const contractSectionMatch = text.match(/님의\s*(?:보유|전체)\s*계약\s*리스트([\s\S]*?)(?=님의\s*(?:전체\s*담보|담보별 가입 현황|보유 담보|전체 담보 진단 현황|보장현황)|충청GA사업단|--- PAGE_BREAK ---|$)/);

  if (!contractSectionMatch) {
    console.warn('⚠️ 계약 리스트 섹션을 찾을 수 없습니다');
    return [];
  }

  const sectionLines = contractSectionMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);

  const filteredLines = sectionLines.filter((line) => {
    if (!line) return false;
    if (/^번호\s+보험사/.test(line)) return false;
    if (/^단위/.test(line)) return false;
    if (/^합계/.test(line)) return false;
    return true;
  });

  const cleanedSection = filteredLines.join('\n');

  const rowRegex = /(\d+)\s+([\s\S]*?)(?=(?:\n\d+\s+)|$)/g;
  let match;

  while ((match = rowRegex.exec(cleanedSection)) !== null) {
    const rowNumber = match[1];
    const rowBody = match[2].trim();
    if (!rowBody) continue;

    const normalizedRow = rowBody.replace(/\s+/g, ' ').trim();
    const dateMatch = normalizedRow.match(/(\d{4}-\d{2}-\d{2})/);

    if (!dateMatch) continue;

    const date = dateMatch[1];
    const dateIndex = normalizedRow.indexOf(date);
    const beforeDate = normalizedRow.slice(0, dateIndex).trim();
    const afterDate = normalizedRow.slice(dateIndex + date.length).trim();

    if (!beforeDate) continue;

    const beforeTokens = beforeDate.split(' ').filter(Boolean);
    const { company, product } = extractCompanyAndProduct(beforeTokens);

    const originalAfterTokens = afterDate.split(' ').filter(Boolean);
    const interestRateMatch = afterDate.match(/(\d+(?:\.\d+)?)%/);
    const interestRate = interestRateMatch ? `${interestRateMatch[1]}%` : '';

    const workingTokens = originalAfterTokens.filter((token) => !/%/.test(token));

    let payCycle = (workingTokens.shift() || '').trim();
    let paymentPeriod = (workingTokens.shift() || '').trim();
    let maturityRaw = (workingTokens.shift() || '').trim();

    const premiumMatch = [...afterDate.matchAll(/([\d,]+)\s*원?/g)].pop();
    const monthlyPremium = premiumMatch ? sanitizeNumber(premiumMatch[1]) : 0;

    const fallbackTokens = originalAfterTokens;

    if (!payCycle) {
      const fallbackCycle = fallbackTokens.find((token) => /납/.test(token));
      if (fallbackCycle) {
        payCycle = fallbackCycle;
      }
    }

    if (!paymentPeriod) {
      const fallbackPeriod = fallbackTokens.find((token) => /(년|세|종신)/.test(token));
      if (fallbackPeriod) {
        paymentPeriod = fallbackPeriod;
      }
    }

    let maturity = maturityRaw.replace(/만기$/, '');
    if (!maturity) {
      const fallbackMaturity = fallbackTokens.find((token) => /(세|종신)/.test(token));
      if (fallbackMaturity) {
        maturity = fallbackMaturity.replace(/만기$/, '');
      }
    }

    if (!company && !product && !monthlyPremium) {
      continue;
    }

    contracts.push({
      번호: Number(rowNumber),
      회사명: company || '', // 보험사 → 회사명으로 변경
      상품명: product || '',
      계약일: date,
      가입일: date,
      가입당시금리: interestRate || '',
      납입주기: payCycle || '-',
      납입기간: paymentPeriod || '-',
      만기: maturity || '-',
      월보험료: monthlyPremium
    });
  }

  console.log(`📋 보유 계약 리스트 추출: ${contracts.length}건`);

  return contracts;
}

// 담보별 현황 파싱
function parseCoverageStatus(text) {
  const coverages = [];
  
  // "님의 담보별 가입 현황" 또는 "님의 상품별 가입현황" 섹션 찾기
  const coverageSectionMatch = text.match(/님의 (?:담보별 가입 현황|상품별 가입현황)([\s\S]*?)(?=님의 전체 담보|충청GA사업단|--- PAGE_BREAK ---|$)/);
  
  if (!coverageSectionMatch) {
    console.warn('⚠️ 담보별 현황 섹션을 찾을 수 없습니다');
    return [];
  }
  
  console.log('⚠️ 담보별 현황 파싱 개발 중...');
  
  return coverages;
}

// 담보별 진단현황 파싱
/**
 * 실효/해지 계약 파싱
 * "님의 실효/해지 계약 현황" 섹션에서 데이터 추출
 */
/**
 * 실효/해지 계약 파싱 (재설계 버전)
 * "실효/해지 계약 현황" 섹션 추출
 * 
 * 개선사항:
 * ✅ 2줄짜리 상품명 지원 (줄바꿈 병합)
 * ✅ 회사명 추출 개선 (KNOWN_COMPANY_MAP 활용)
 * ✅ 월보험료 정확 추출 (마지막 4자리 이상 숫자)
 * ✅ 상태(해지/실효) 일반 텍스트로 표시
 */
function parseTerminatedContracts(text) {
  const contracts = [];
  
  // ============================================================================
  // 🔍 실효/해지 계약 섹션 감지 (다양한 키워드 지원)
  // ============================================================================
  const sectionKeywords = [
    /님의\s*실효\s*\/?\s*해지\s*계약\s*현황/i,
    /실효\s*·?\s*해지\s*계약/i,
    /해지\s*계약\s*현황/i,
    /종료된\s*계약/i
  ];
  
  let sectionMatch = null;
  for (const keyword of sectionKeywords) {
    const match = text.match(keyword);
    if (match) {
      sectionMatch = match;
      break;
    }
  }
  
  if (!sectionMatch) {
    console.log('ℹ️ 실효/해지 계약 섹션 없음 (정상 - 해지 계약이 없는 경우)');
    return [];
  }
  
  // 섹션 시작 위치 찾기
  const sectionStartIndex = text.indexOf(sectionMatch[0]);
  const sectionText = text.slice(sectionStartIndex);
  
  // 다음 주요 섹션 전까지만 추출 (진단 현황, 상세 페이지 등)
  const nextSectionMatch = sectionText.match(/님의\s*전체\s*담보\s*진단\s*현황|님의\s*상품별|보험료\s*납입\s*현황/i);
  const endIndex = nextSectionMatch ? sectionText.indexOf(nextSectionMatch[0]) : sectionText.length;
  const targetText = sectionText.slice(0, endIndex);
  
  // ============================================================================
  // 📋 2줄짜리 행 병합 로직 (핵심 개선)
  // ============================================================================
  let lines = targetText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);
  
  // 헤더 행 제거
  lines = lines.filter(line => {
    if (!line) return false;
    if (/^번호\s+(회사명|보험사)/.test(line)) return false;
    if (/^상태\s+(회사명|보험사)/.test(line)) return false;
    if (/^단위/.test(line)) return false;
    if (/^합계/.test(line)) return false;
    return true;
  });
  
  // 번호로 시작하지 않는 줄은 이전 줄과 병합 (2줄짜리 상품명 처리)
  const mergedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    
    // 번호로 시작하면 새로운 행
    if (/^\d+\s+/.test(currentLine)) {
      mergedLines.push(currentLine);
    } else {
      // 번호가 없으면 이전 행에 병합
      if (mergedLines.length > 0) {
        mergedLines[mergedLines.length - 1] += ' ' + currentLine;
      }
    }
  }
  
  console.log(`📋 실효/해지 계약: ${mergedLines.length}개 행 감지 (2줄 병합 완료)`);
  
  // ============================================================================
  // 각 행 파싱 (완전 재설계)
  // ============================================================================
  for (const line of mergedLines) {
    const normalizedLine = line.replace(/\s+/g, ' ').trim();
    
    console.log(`\n🔍 원본 행: ${normalizedLine.substring(0, 100)}...`);
    
    // 번호 추출
    const numberMatch = normalizedLine.match(/^(\d+)\s+/);
    if (!numberMatch) {
      console.warn(`  ⚠️ 번호 없음, 스킵`);
      continue;
    }
    
    const 번호 = Number(numberMatch[1]);
    const restText = normalizedLine.slice(numberMatch[0].length).trim();
    
    console.log(`  번호: ${번호}`);
    console.log(`  나머지: ${restText.substring(0, 80)}...`);
    
    // ============================================================================
    // 날짜 기준으로 분할 (YYYY-MM-DD)
    // ============================================================================
    const dateMatch = restText.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      console.warn(`  ⚠️ ${번호}번 행: 가입일 없음, 스킵`);
      continue;
    }
    
    const 가입일 = dateMatch[1];
    const dateIndex = restText.indexOf(가입일);
    const beforeDate = restText.slice(0, dateIndex).trim();
    const afterDate = restText.slice(dateIndex + 가입일.length).trim();
    
    console.log(`  날짜 이전: "${beforeDate}"`);
    console.log(`  날짜 이후: "${afterDate}"`);
    
    // ============================================================================
    // 날짜 이전: 회사명 + 상품명 추출 (완전 재설계)
    // ============================================================================
    let 회사명 = '';
    let 상품명 = '';
    
    // Step 1: 상태 제거 (해지*, 실효*)
    let cleaned = beforeDate
      .replace(/해지\*/g, '')
      .replace(/실효\*/g, '')
      .trim();
    
    console.log(`  상태 제거 후: "${cleaned}"`);
    
    // Step 2: 회사명 패턴 탐지
    // "無MG웃는얼굴..." → "MG손해보험" + "웃는얼굴..."
    const mgMatch = cleaned.match(/^(無|무|\(무\))?\s*MG\s*(.+)/i);
    if (mgMatch) {
      회사명 = 'MG손해보험';
      상품명 = mgMatch[2].trim();
      console.log(`  ✅ MG 패턴 감지: 회사명="${회사명}", 상품명="${상품명}"`);
    } else {
      // 일반 회사명 찾기
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      
      let companyFound = false;
      for (let i = 0; i < tokens.length; i++) {
        for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
          const candidate = tokens.slice(i, i + len).join('').replace(/\s+/g, '');
          
          if (KNOWN_COMPANY_MAP.has(candidate)) {
            회사명 = KNOWN_COMPANY_MAP.get(candidate);
            상품명 = tokens.slice(i + len).join(' ').trim();
            companyFound = true;
            console.log(`  ✅ 회사명 발견: "${회사명}", 상품명="${상품명}"`);
            break;
          }
        }
        if (companyFound) break;
      }
      
      // 회사명을 찾지 못한 경우
      if (!companyFound && tokens.length > 0) {
        회사명 = tokens[0].replace(/^(無|무|\(무\))/, '');
        상품명 = tokens.slice(1).join(' ').trim();
        console.log(`  ⚠️ 회사명 미발견, 첫 토큰 사용: 회사명="${회사명}", 상품명="${상품명}"`);
      }
    }
    
    // ============================================================================
    // 날짜 이후: 납입주기, 납입기간, 만기, 상태, 월보험료 추출
    // ============================================================================
    const afterTokens = afterDate.split(' ').filter(Boolean);
    
    console.log(`  날짜 이후 토큰: [${afterTokens.slice(0, 10).join(', ')}]`);
    
    // 상태 찾기 (해지 또는 실효)
    const 상태 = afterTokens.find(token => /^(해지|실효)$/.test(token)) || '해지';
    
    // 납입주기 찾기
    const 납입주기 = afterTokens.find(token => /(월납|연납|일시납|전기납)/.test(token)) || '-';
    
    // 납입기간 찾기 (N년 또는 종신)
    const 납입기간 = afterTokens.find(token => /^\d+년$|^종신$/.test(token)) || '-';
    
    // 만기 찾기 (N세 또는 종신)
    const 만기 = afterTokens.find(token => /^\d+세$|^종신$/.test(token)) || '-';
    
    // 월보험료 찾기: "원" 바로 앞의 숫자
    let 월보험료 = 0;
    const premiumMatch = afterDate.match(/([\d,]+)\s*원/);
    if (premiumMatch) {
      월보험료 = sanitizeNumber(premiumMatch[1]);
      console.log(`  💰 월보험료: ${월보험료.toLocaleString()}원 (원본: ${premiumMatch[1]})`);
    }
    
    // ============================================================================
    // 유효성 검증
    // ============================================================================
    if (!회사명 && !상품명) {
      console.warn(`  ⚠️ ${번호}번 행: 회사명/상품명 없음, 스킵`);
      continue;
    }
    
    console.log(`  ✅ 최종: 번호=${번호}, 상태=${상태}, 회사명="${회사명}", 상품명="${상품명}", 월보험료=${월보험료.toLocaleString()}원`);
    
    contracts.push({
      번호,
      상태,           // 해지 또는 실효 (일반 텍스트)
      회사명: 회사명 || '',
      상품명: 상품명 || '',
      가입일,
      납입방법: 납입주기,
      납입기간,
      만기나이: 만기,
      월보험료
    });
  }
  
  console.log(`📊 실효/해지 계약: ${contracts.length}건 추출 완료`);
  
  // 디버그: 추출된 계약 정보 출력
  if (contracts.length > 0) {
    console.log('  📋 실효/해지 계약 목록:');
    contracts.forEach((c) => {
      console.log(`    ${c.번호}. [${c.상태}] ${c.회사명} - ${c.상품명} (${c.월보험료.toLocaleString()}원)`);
    });
  }
  
  return contracts;
}

function parseDiagnosisStatus(text) {
  const diagnoses = [];
  
  // ============================================================================
  // 🎯 35개 필수 담보 템플릿 (AI 프롬프트와 100% 일치)
  // ============================================================================
  // ⚠️ 중요: 이 순서와 명칭은 ai-models.js의 프롬프트와 정확히 일치해야 함
  // 변경 시 ai-models.js도 함께 수정 필요
  // ============================================================================
  const damboItems = [
    // [사망장해/치매간병] (8개)
    '상해사망',
    '질병사망',
    '상해80%미만후유장해',
    '질병80%미만후유장해',
    '장기요양간병비',
    '경증치매진단',
    '간병인/간호간병상해일당',
    '간병인/간호간병질병일당',
    
    // [3대질병(암/뇌/심장) 진단] (10개)
    '일반암',
    '유사암',
    '고액암',
    '고액(표적)항암치료비',
    '뇌혈관질환',
    '뇌졸중',
    '뇌출혈',
    '허혈성심장질환',
    '급성심근경색증',
    '심근경색증',
    
    // [의료비] (5개)
    '상해입원의료비',
    '상해통원의료비',
    '질병입원의료비',
    '질병통원의료비',
    '3대비급여실손',
    
    // [수술비] (5개)
    '상해수술비',
    '질병수술비',
    '암수술비',
    '뇌혈관질환수술비',
    '허혈성심장질환수술비',
    
    // [입원/일상/상해] (4개)
    '상해입원일당',
    '질병입원일당',
    '골절진단비',
    '보철치료비',
    
    // [배상책임/벌금] (3개)
    '가족/일상/자녀배상',
    '벌금(대인/스쿨존/대물)',
    '교통사고처리지원금'
    // ⚠️ 총 35개 항목 (AI 프롬프트와 일치)
  ];
  
  // "님의 전체 담보 진단 현황" 섹션 찾기
  const diagnosisSectionMatch = text.match(/님의 전체 담보 진단 현황([\s\S]*?)$/);
  
  if (!diagnosisSectionMatch) {
    console.warn('⚠️ 진단 현황 섹션을 찾을 수 없습니다');
    return [];
  }
  
  const sectionText = diagnosisSectionMatch[1];
  
  for (const dambo of damboItems) {
    const escapedDambo = dambo.replace(/[()]/g, '\\$&');
    const damboPattern = new RegExp(`${escapedDambo}\\s+([\\d.,억만천]+)\\s+([\\d.,억만천]+)\\s+([-+]?[\\d.,억만천]+)\\s+(충분|부족|미가입)`);
    const match = sectionText.match(damboPattern);
    
    if (match) {
      diagnoses.push({
        담보명: dambo,
        권장금액: match[1],
        가입금액: match[2],
        부족금액: match[3],
        상태: match[4]
      });
    }
  }
  
  console.log(`📊 진단 현황: ${diagnoses.length}개 추출`);
  
  return diagnoses;
}

// 메인 파싱 함수
export async function parsePDF(file) {
  try {
    console.log('📄 PDF 파싱 시작...');
    
    // PDF.js로 파일 로드
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`📄 총 ${pdf.numPages} 페이지`);
    
    // Y 좌표 기반 텍스트 추출
    const fullText = await extractTextWithCoordinates(pdf);
    
    // 각 섹션 파싱
    const 설계사정보 = parseAgentInfo(fullText); // ✅ 설계사정보 파싱 구현 (1페이지 표지)
    const 고객정보 = parseCustomerInfo(fullText);
    const 계약리스트 = parseContractList(fullText);
    const 실효해지계약 = parseTerminatedContracts(fullText); // ✅ 실효/해지계약 파싱 구현
    const 진단현황 = parseDiagnosisStatus(fullText);
    
    const result = {
      설계사정보,
      고객정보,
      계약리스트,
      실효해지계약,
      진단현황
    };
    
    console.log('✅ 파싱 완료 (설계사정보, 고객정보, 계약리스트, 실효해지계약, 진단현황):', {
      설계사정보: Object.keys(설계사정보).length > 0 ? '있음' : '없음',
      고객정보: 고객정보 ? '있음' : '없음',
      계약리스트: 계약리스트?.length || 0,
      실효해지계약: 실효해지계약?.length || 0,
      진단현황: 진단현황?.length || 0
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ PDF 파싱 오류:', error);
    throw new Error(`PDF 파싱 실패: ${error.message}`);
  }
}

export const parseKBInsurancePDF = parsePDF;
