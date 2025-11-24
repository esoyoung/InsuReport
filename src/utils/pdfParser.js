import * as pdfjsLib from 'pdfjs-dist';
import { parseWithFallback } from './aiParser';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// AI 파싱 사용 여부 (환경 변수로 제어)


/**
 * PDF 파일을 파싱하여 보험 데이터 추출
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  let structuredPages = [];
  
  // 모든 페이지 텍스트 추출 (좌표 정보 포함)
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // 좌표 기반 정렬
    const sortedItems = textContent.items.sort((a, b) => {
      // Y좌표로 먼저 정렬 (위에서 아래)
      const yDiff = Math.abs(b.transform[5] - a.transform[5]);
      if (yDiff > 5) { // 5px 이상 차이나면 다른 행
        return b.transform[5] - a.transform[5];
      }
      // 같은 행이면 X좌표로 정렬 (왼쪽에서 오른쪽)
      return a.transform[4] - b.transform[4];
    });
    
    // 행별로 그룹화
    const lines = [];
    let currentLine = [];
    let currentY = null;
    
    sortedItems.forEach(item => {
      const y = Math.round(item.transform[5]);
      
      if (currentY === null || Math.abs(currentY - y) < 5) {
        currentLine.push(item.str);
        currentY = y;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '));
        }
        currentLine = [item.str];
        currentY = y;
      }
    });
    
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }
    
    const pageText = lines.join('\n');
    structuredPages.push({
      pageNumber: i,
      text: pageText,
      lines: lines
    });
    
    fullText += `\n===== PAGE ${i} =====\n` + pageText;
  }

  console.log('📄 PDF 텍스트 추출 완료 (총 ' + pdf.numPages + '페이지)');
  console.log('첫 500자:', fullText.substring(0, 500));

  // 데이터 파싱 (AI 파싱 → 실패 시 정규식 폴백)
  console.log('🤖 AI 파싱 시도');
  
  const parsedData = await parseWithFallback(
    fullText, 
    (text) => parseInsuranceData(text, structuredPages)
  );
  
  return parsedData;
}

/**
 * 텍스트에서 보험 데이터 추출
 */
function parseInsuranceData(text, structuredPages) {
  // 고객 정보 추출
  const customerInfo = extractCustomerInfo(text, structuredPages);
  
  // 계약 리스트 추출
  const contracts = extractContracts(text, structuredPages);
  
  // 담보 현황 추출
  const coverages = extractCoverages(text, structuredPages);
  
  // 진단 현황 추출
  const diagnosis = extractDiagnosis(text, structuredPages);

  console.log('✅ 파싱 결과:', { 
    customerInfo, 
    contracts: contracts.length, 
    coverages: coverages.length, 
    diagnosis: diagnosis.length 
  });

  return {
    customerInfo,
    contracts,
    coverages,
    diagnosis,
    rawText: text // 디버깅용
  };
}

/**
 * 고객 정보 추출
 */
function extractCustomerInfo(text, structuredPages) {
  // 패턴 1: "강민재님의 전체 보험계약 개요"
  let nameMatch = text.match(/([가-힣]+)님의\s*전체\s*보험계약/);
  
  // 패턴 2: "안영균 (61세 ,남자)" 형태
  if (!nameMatch) {
    nameMatch = text.match(/([가-힣]{2,4})\s*[\(（]\s*(\d+)세\s*[,，]\s*(남자|여자)\s*[\)）]/);
    if (nameMatch) {
      const ageGenderMatch = nameMatch;
      const name = nameMatch[1];
      const age = parseInt(nameMatch[2]);
      const gender = nameMatch[3];
      
      // 월 보험료 추출
      const premiumMatch = text.match(/월\s*납입\s*보험료\s*([\d,]+)\s*원/) ||
                          text.match(/합계.*?([\d,]+)\s*원/);
      
      // 계약 수
      const contractCountMatch = text.match(/총\s*계약수\s*(\d+)\s*건/) ||
                                text.match(/(\d+)\s*건.*?원/);
      
      return {
        name: name,
        age: age,
        gender: gender,
        contractCount: contractCountMatch ? parseInt(contractCountMatch[1]) : 0,
        monthlyPremium: premiumMatch ? parseInt(premiumMatch[1].replace(/,/g, '')) : 0,
        reportDate: new Date().toISOString().split('T')[0]
      };
    }
  }
  
  // 기본 패턴 처리
  const ageGenderMatch = text.match(/(\d+)세\s*[\(（]\s*(남자|여자)\s*[\)）]/);
  const premiumMatch = text.match(/월\s*납입\s*보험료\s*([\d,]+)\s*원/) ||
                       text.match(/합계.*?([\d,]+)\s*원/);
  const contractCountMatch = text.match(/총\s*계약수\s*(\d+)\s*건/);

  const customerInfo = {
    name: nameMatch ? nameMatch[1] : '알 수 없음',
    age: ageGenderMatch ? parseInt(ageGenderMatch[1]) : 0,
    gender: ageGenderMatch ? ageGenderMatch[2] : '알 수 없음',
    contractCount: contractCountMatch ? parseInt(contractCountMatch[1]) : 0,
    monthlyPremium: premiumMatch ? parseInt(premiumMatch[1].replace(/,/g, '')) : 0,
    reportDate: new Date().toISOString().split('T')[0]
  };

  console.log('👤 고객 정보:', customerInfo);
  return customerInfo;
}

/**
 * 계약 리스트 추출 (개선)
 */
function extractContracts(text, structuredPages) {
  const contracts = [];
  
  // "전체 계약 리스트" 페이지 찾기
  const contractPage = structuredPages.find(page => 
    page.text.includes('전체 계약 리스트') || 
    page.text.includes('가입하신 모든 보험상품')
  );
  
  if (!contractPage) {
    console.warn('⚠️ 전체 계약 리스트 페이지를 찾을 수 없습니다');
    return [];
  }

  const lines = contractPage.lines;
  let currentContract = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 숫자로 시작하는 행 (계약 번호)
    const noMatch = line.match(/^(\d+)\s+/);
    if (noMatch && parseInt(noMatch[1]) <= 20) { // 계약 번호는 보통 20 이하
      if (currentContract && currentContract.company) {
        contracts.push(currentContract);
      }
      
      currentContract = {
        no: parseInt(noMatch[1]),
        company: '',
        productName: '',
        startDate: '',
        paymentType: '',
        paymentPeriod: '',
        maturityAge: '',
        premium: 0
      };
      
      // 같은 행에 보험사명이 있을 수 있음
      const restLine = line.substring(noMatch[0].length);
      if (restLine.length > 2) {
        // 보험사명 추출
        const companyMatch = restLine.match(/^([가-힣A-Za-z]+)/);
        if (companyMatch) {
          currentContract.company = companyMatch[1];
        }
      }
      continue;
    }
    
    if (!currentContract) continue;
    
    // 보험사명 (화재, 생명, 손해보험 등)
    if (!currentContract.company && (
      line.includes('화재') || 
      line.includes('생명') || 
      line.includes('손해보험') ||
      line.includes('우정사업')
    )) {
      currentContract.company = line.split(/\s+/)[0];
    }
    
    // 상품명 (무배당, (무) 등으로 시작)
    if (!currentContract.productName && (
      line.includes('무배당') || 
      line.includes('(무)') ||
      line.includes('보험')
    )) {
      // 숫자나 날짜 이전까지가 상품명
      const productMatch = line.match(/^([가-힣\sA-Za-z\(\)]+?)(?:\d{4}|\d{1,3},\d{3})/);
      if (productMatch) {
        currentContract.productName = productMatch[1].trim();
      } else {
        currentContract.productName = line.trim();
      }
    }
    
    // 가입일 (2005.05.11, 2019-02-21 형태)
    const dateMatch = line.match(/(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})/);
    if (dateMatch && !currentContract.startDate) {
      currentContract.startDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }
    
    // 납입방식
    if (line.includes('월납') || line.includes('년납')) {
      currentContract.paymentType = line.includes('월납') ? '월납' : '년납';
    }
    
    // 납입기간 (20년, 10년)
    const periodMatch = line.match(/(\d+)\s*년\s*납/) || line.match(/(\d+)\s*년(?!세)/);
    if (periodMatch && !currentContract.paymentPeriod) {
      currentContract.paymentPeriod = `${periodMatch[1]}년`;
    }
    
    // 만기 (74세, 80세, 종신)
    const maturityMatch = line.match(/(\d+)\s*세\s*만기/) || line.match(/만기\s*(\d+)\s*세/) || line.match(/(종신)/);
    if (maturityMatch && !currentContract.maturityAge) {
      currentContract.maturityAge = maturityMatch[1] + (maturityMatch[1] !== '종신' ? '세' : '');
    }
    
    // 월 보험료 (60,590 원)
    const premiumMatch = line.match(/([\d,]+)\s*원/);
    if (premiumMatch && currentContract.premium === 0) {
      const amount = parseInt(premiumMatch[1].replace(/,/g, ''));
      // 합리적인 금액 범위 (1,000원 ~ 1,000,000원)
      if (amount >= 1000 && amount <= 1000000) {
        currentContract.premium = amount;
      }
    }
  }
  
  // 마지막 계약 추가
  if (currentContract && currentContract.company) {
    contracts.push(currentContract);
  }

  console.log('📋 계약 리스트:', contracts);
  return contracts;
}

/**
 * 담보 현황 추출
 */
function extractCoverages(text, structuredPages) {
  const coverageTypes = [
    { key: 'deathInjury', name: '상해사망', category: '사망·장해' },
    { key: 'deathDisease', name: '질병사망', category: '사망·장해' },
    { key: 'disabilityInjury', name: '상해80%미만후유장해', category: '사망·장해' },
    { key: 'disabilityDisease', name: '질병80%미만후유장해', category: '사망·장해' },
    { key: 'cancerGeneral', name: '일반암', category: '암 진단' },
    { key: 'cancerMinor', name: '유사암', category: '암 진단' },
    { key: 'cancerExpensive', name: '고액암', category: '암 진단' },
    { key: 'cancerTreatment', name: '고액(표적)항암치료비', category: '암 진단' },
    { key: 'stroke', name: '뇌졸중', category: '뇌/심장 진단' },
    { key: 'cerebralHemorrhage', name: '뇌출혈', category: '뇌/심장 진단' },
    { key: 'ischemicHeart', name: '허혈성심장질환', category: '뇌/심장 진단' },
    { key: 'acuteMyocardial', name: '급성심근경색증', category: '뇌/심장 진단' },
    { key: 'medicalInjury', name: '상해입원의료비', category: '실손 의료비' },
    { key: 'medicalDisease', name: '질병입원의료비', category: '실손 의료비' },
    { key: 'medicalOutpatient', name: '통원의료비', category: '실손 의료비' },
  ];

  const coverages = [];

  // "담보별 현황" 페이지 찾기
  const coveragePage = structuredPages.find(page => 
    page.text.includes('담보별 현황') || 
    page.text.includes('보장항목별')
  );
  
  if (!coveragePage) {
    console.warn('⚠️ 담보별 현황 페이지를 찾을 수 없습니다');
    return coverages;
  }

  coverageTypes.forEach(type => {
    // 정규식으로 담보명 + 금액 추출
    const regex = new RegExp(`${type.name}\\s+([\\d,]+)\\s*만`, 'i');
    const match = coveragePage.text.match(regex);
    
    let current = 0;
    let recommended = 0;
    
    if (match) {
      current = parseInt(match[1].replace(/,/g, ''));
      recommended = current; // 기본적으로 현재값과 동일
    }

    coverages.push({
      ...type,
      current,
      recommended
    });
  });

  console.log('🛡️ 담보 현황:', coverages.length, '개 항목');
  return coverages;
}

/**
 * 진단 현황 추출
 */
function extractDiagnosis(text, structuredPages) {
  const diagnosis = [];
  
  // "담보별 진단현황" 페이지들 찾기
  const diagnosisPages = structuredPages.filter(page => 
    page.text.includes('진단현황') || 
    page.text.includes('부족') || 
    page.text.includes('충분') ||
    page.text.includes('미가입')
  );
  
  if (diagnosisPages.length === 0) {
    console.warn('⚠️ 담보별 진단현황 페이지를 찾을 수 없습니다');
    return diagnosis;
  }

  diagnosisPages.forEach(page => {
    const lines = page.lines;
    
    lines.forEach(line => {
      // 권장/가입/상태 패턴 찾기
      // 예: "운전자/기타 벌금(대인/스쿨존/대물) 권장 3,000만 가입 3,500만 충분 +500만"
      const match = line.match(/([가-힣\/\(\)]+)\s+권장\s+([\d,]+만?)\s+가입\s+([\d,]+만?|0)\s+(충분|부족|미가입)\s*([+-]?[\d,]+만?)?/);
      
      if (match) {
        const coverageName = match[1].trim();
        const recommended = parseAmount(match[2]);
        const current = match[3] === '0' ? 0 : parseAmount(match[3]);
        const status = match[4];
        const difference = match[5] ? parseAmount(match[5]) : 0;
        
        diagnosis.push({
          coverageName,
          current,
          recommended,
          difference,
          status
        });
      }
    });
  });

  console.log('📊 진단 현황:', diagnosis.length, '개 항목');
  return diagnosis;
}

/**
 * 금액 문자열을 숫자로 변환 (만원 단위)
 */
function parseAmount(amountStr) {
  if (!amountStr || amountStr === '0') return 0;
  
  let amount = 0;
  
  // +/- 부호 제거
  amountStr = amountStr.replace(/[+-]/g, '');
  
  // 억 처리
  const eokMatch = amountStr.match(/(\d+)억/);
  if (eokMatch) {
    amount += parseInt(eokMatch[1]) * 10000;
  }
  
  // 만 처리
  const manMatch = amountStr.match(/(\d{1,3}(?:,?\d{3})*)만/);
  if (manMatch) {
    amount += parseInt(manMatch[1].replace(/,/g, ''));
  }
  
  // 순수 숫자만 있는 경우
  if (!eokMatch && !manMatch) {
    const numMatch = amountStr.match(/(\d{1,3}(?:,?\d{3})*)/);
    if (numMatch) {
      amount = parseInt(numMatch[1].replace(/,/g, ''));
    }
  }
  
  return amount;
}
