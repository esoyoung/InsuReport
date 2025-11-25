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
  '캐롯손해보험', 'Chubb손해보험', 'BNP파리바카디프생명', 'BNP파리바카디프손해보험'
];

const KNOWN_COMPANY_MAP = new Map(
  KNOWN_COMPANIES.map((name) => [name.replace(/\s+/g, ''), name])
);

function extractCompanyAndProduct(tokens) {
  if (!tokens || tokens.length === 0) {
    return { company: '', product: '' };
  }

  const maxLength = Math.min(3, tokens.length);

  for (let length = maxLength; length >= 1; length -= 1) {
    const candidateTokens = tokens.slice(0, length);
    const normalizedCandidate = candidateTokens.join('').replace(/\s+/g, '');

    if (KNOWN_COMPANY_MAP.has(normalizedCandidate)) {
      const companyName = KNOWN_COMPANY_MAP.get(normalizedCandidate);
      const remainderTokens = tokens.slice(length);
      return {
        company: companyName,
        product: remainderTokens.join(' ').trim()
      };
    }
  }

  const [firstToken, ...remainder] = tokens;
  return {
    company: firstToken,
    product: remainder.join(' ').trim()
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

// 고객 정보 파싱
function parseCustomerInfo(text) {
  // "안영균 (61세 ,남자) 님의 전체 보장현황" 또는 "전체 계약리스트" 패턴
  const nameMatch = text.match(/([\w가-힣]+)\s*\((\d+)세\s*,\s*(남자|여자)\)\s*님의 전체/);
  
  if (!nameMatch) {
    console.warn('⚠️ 고객 정보를 찾을 수 없습니다');
    return null;
  }
  
  // 계약 수 추출 - "8 0 4 3 1" 패턴에서 첫 번째 숫자
  const contractCountMatch = text.match(/님의 전체 (?:보장현황|계약리스트)[\s\S]{0,50}?\n\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+/);
  
  // 월보험료 추출 - 6자리 숫자 (예: 427,097)
  const premiumMatches = text.match(/\d{3},\d{3}/g);
  const premium = premiumMatches && premiumMatches.length > 0 ? premiumMatches[0] : '0';
  
  const customerInfo = {
    이름: nameMatch[1],
    나이: parseInt(nameMatch[2]),
    성별: nameMatch[3],
    계약수: contractCountMatch ? parseInt(contractCountMatch[1]) : 0,
    월보험료: parseInt(premium.replace(/,/g, ''))
  };
  
  console.log('👤 고객 정보:', customerInfo);
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
    const workingTokens = [...originalAfterTokens];

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
      번호: rowNumber,
      보험사: company || '',
      상품명: product || '',
      가입일: date,
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
function parseDiagnosisStatus(text) {
  const diagnoses = [];
  
  const damboItems = [
    '상해사망', '질병사망', '장기요양간병비', '간병인/간호간병질병일당',
    '일반암', '유사암', '고액암', '고액(표적)항암치료비',
    '뇌혈관질환', '뇌졸중', '뇌출혈', '허혈성심장질환', '급성심근경색증',
    '상해입원의료비', '상해통원의료비', '질병입원의료비', '질병통원의료비',
    '3대비급여실손', '상해수술비', '질병수술비', '암수술비',
    '뇌혈관질환수술비', '허혈성심장질환수술비',
    '상해입원일당', '질병입원일당', '벌금(대인/스쿨존/대물)',
    '교통사고처리지원금', '변호사선임비용', '골절진단비',
    '보철치료비', '가족/일상/자녀배상', '화재벌금'
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
    const damboPattern = new RegExp(`${escapedDambo}\\s+([\\d,억만천]+)\\s+([\\d,억만천]+)\\s+([-+]?[\\d,억만천]+)\\s+(충분|부족|미가입)`);
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
    const 고객정보 = parseCustomerInfo(fullText);
    const 계약리스트 = parseContractList(fullText);
    const 담보현황 = parseCoverageStatus(fullText);
    const 진단현황 = parseDiagnosisStatus(fullText);
    
    const result = {
      고객정보,
      계약리스트,
      담보현황,
      진단현황
    };
    
    console.log('✅ 파싱 완료:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ PDF 파싱 오류:', error);
    throw new Error(`PDF 파싱 실패: ${error.message}`);
  }
}

export const parseKBInsurancePDF = parsePDF;
