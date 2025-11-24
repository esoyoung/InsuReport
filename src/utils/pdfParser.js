import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * PDF 파일을 파싱하여 보험 데이터 추출
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  // 모든 페이지 텍스트 추출
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n===== PAGE ${i} =====\n` + pageText;
  }

  console.log('📄 PDF 텍스트 추출 완료:', fullText.substring(0, 500));

  // 데이터 파싱
  const parsedData = parseInsuranceData(fullText);
  
  return parsedData;
}

/**
 * 텍스트에서 보험 데이터 추출
 */
function parseInsuranceData(text) {
  // 고객 정보 추출
  const customerInfo = extractCustomerInfo(text);
  
  // 계약 리스트 추출
  const contracts = extractContracts(text);
  
  // 담보 현황 추출
  const coverages = extractCoverages(text);
  
  // 진단 현황 추출
  const diagnosis = extractDiagnosis(text);

  console.log('✅ 파싱 결과:', { customerInfo, contracts: contracts.length, coverages: coverages.length, diagnosis: diagnosis.length });

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
function extractCustomerInfo(text) {
  // 이름 추출 (예: "강민재님의 전체 보험계약 개요")
  const nameMatch = text.match(/([가-힣]+)님의\s*전체\s*보험계약/);
  
  // 나이/성별 추출 (예: "32세 (여자)" 또는 "32세(여자)")
  const ageGenderMatch = text.match(/(\d+)세\s*[\(（]\s*(남자|여자)\s*[\)）]/);
  
  // 총 계약수 (예: "총 계약수 2건")
  const contractCountMatch = text.match(/총\s*계약수\s*(\d+)\s*건/);
  
  // 월 납입 보험료 (예: "월 납입 보험료 205,220 원")
  const premiumMatch = text.match(/월\s*납입\s*보험료\s*([\d,]+)\s*원/) ||
                       text.match(/합계.*?([\d,]+)\s*원/);
  
  // 분석 기준일 (예: "2025-11-24")
  const dateMatch = text.match(/분석\s*기준일\s*(\d{4})-(\d{2})-(\d{2})/) ||
                    text.match(/분석\s*기준일\s*(\d{4})\.(\d{2})\.(\d{2})/);

  const customerInfo = {
    name: nameMatch ? nameMatch[1] : '알 수 없음',
    age: ageGenderMatch ? parseInt(ageGenderMatch[1]) : 0,
    gender: ageGenderMatch ? ageGenderMatch[2] : '알 수 없음',
    contractCount: contractCountMatch ? parseInt(contractCountMatch[1]) : 0,
    monthlyPremium: premiumMatch ? parseInt(premiumMatch[1].replace(/,/g, '')) : 0,
    reportDate: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : new Date().toISOString().split('T')[0]
  };

  console.log('👤 고객 정보:', customerInfo);
  return customerInfo;
}

/**
 * 계약 리스트 추출
 */
function extractContracts(text) {
  const contracts = [];
  
  // "전체 계약 리스트" 섹션 찾기
  const contractSection = text.match(/전체\s*계약\s*리스트([\s\S]*?)(?:담보별\s*현황|안내사항|$)/);
  
  if (!contractSection) {
    console.warn('⚠️ 전체 계약 리스트 섹션을 찾을 수 없습니다');
    return [];
  }

  const sectionText = contractSection[1];
  
  // 각 계약 정보 추출
  // 패턴: 번호 보험사 상품명 가입일 납입방식 납입기간 만기 월보험료
  const lines = sectionText.split('\n').filter(line => line.trim());
  
  let currentContract = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 번호 패턴 (1, 2, 3...)
    const noMatch = line.match(/^(\d+)\s/);
    if (noMatch) {
      if (currentContract) {
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
    }
    
    // 보험사 (메리츠 화재, KB손해보험 등)
    if (currentContract && line.includes('화재') || line.includes('손해보험') || line.includes('생명')) {
      currentContract.company = line.replace(/^\d+\s*/, '').trim();
    }
    
    // 상품명 (무배당, (무) 등으로 시작)
    if (currentContract && (line.includes('무배당') || line.includes('(무)'))) {
      currentContract.productName = line.trim();
    }
    
    // 가입일 (2019.02.21 또는 2008.12.05)
    const dateMatch = line.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (currentContract && dateMatch) {
      currentContract.startDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
    
    // 납입방식 (월납, 년납)
    if (currentContract && (line.includes('월납') || line.includes('년납'))) {
      currentContract.paymentType = line.includes('월납') ? '월납' : '년납';
    }
    
    // 납입기간 (20년, 10년)
    const periodMatch = line.match(/(\d+)\s*년/);
    if (currentContract && periodMatch && !currentContract.paymentPeriod) {
      currentContract.paymentPeriod = `${periodMatch[1]}년`;
    }
    
    // 만기 (74세, 80세, 종신)
    const maturityMatch = line.match(/(\d+)\s*세/) || line.match(/(종신)/);
    if (currentContract && maturityMatch && !currentContract.maturityAge) {
      currentContract.maturityAge = maturityMatch[1] + (maturityMatch[1] !== '종신' ? '세' : '');
    }
    
    // 월 보험료 (60,590 원, 144,630 원)
    const premiumMatch = line.match(/([\d,]+)\s*원/);
    if (currentContract && premiumMatch && currentContract.premium === 0) {
      const amount = parseInt(premiumMatch[1].replace(/,/g, ''));
      if (amount > 1000) { // 너무 큰 숫자는 총액일 가능성
        currentContract.premium = amount;
      }
    }
  }
  
  // 마지막 계약 추가
  if (currentContract) {
    contracts.push(currentContract);
  }

  console.log('📋 계약 리스트:', contracts);
  return contracts;
}

/**
 * 담보 현황 추출
 */
function extractCoverages(text) {
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

  // "담보별 현황" 섹션 찾기
  const coverageSection = text.match(/담보별\s*현황([\s\S]*?)(?:담보별\s*진단현황|$)/);
  
  if (!coverageSection) {
    console.warn('⚠️ 담보별 현황 섹션을 찾을 수 없습니다');
    return coverages;
  }

  const sectionText = coverageSection[1];

  coverageTypes.forEach(type => {
    // 담보명 찾기
    const regex = new RegExp(`${type.name}\\s+([\\d,]+)\\s*만원?\\s+([\\d,]+)\\s*만원?\\s+(\\d+)%`, 'i');
    const match = sectionText.match(regex);
    
    let current = 0;
    let recommended = 0;
    
    if (match) {
      current = parseInt(match[1].replace(/,/g, ''));
      recommended = parseInt(match[2].replace(/,/g, ''));
    } else {
      // "미가입" 체크
      const notEnrolledRegex = new RegExp(`${type.name}\\s+미가입`, 'i');
      if (notEnrolledRegex.test(sectionText)) {
        current = 0;
        recommended = 0;
      }
    }

    coverages.push({
      ...type,
      current,
      recommended
    });
  });

  console.log('🛡️ 담보 현황:', coverages);
  return coverages;
}

/**
 * 진단 현황 추출
 */
function extractDiagnosis(text) {
  const diagnosis = [];
  
  // "담보별 진단현황" 섹션 찾기
  const diagnosisSection = text.match(/담보별\s*진단현황([\s\S]*?)(?:중요\s*확인사항|$)/);
  
  if (!diagnosisSection) {
    console.warn('⚠️ 담보별 진단현황 섹션을 찾을 수 없습니다');
    return diagnosis;
  }

  const sectionText = diagnosisSection[1];
  const lines = sectionText.split('\n').filter(line => line.trim());
  
  let currentItem = null;
  
  for (const line of lines) {
    // 번호 패턴 (1, 2, 3...)
    const noMatch = line.match(/^(\d+)\s/);
    if (noMatch) {
      if (currentItem) {
        diagnosis.push(currentItem);
      }
      currentItem = {
        no: parseInt(noMatch[1]),
        coverageName: '',
        current: 0,
        recommended: 0,
        difference: 0,
        status: ''
      };
    }
    
    if (!currentItem) continue;
    
    // 담보명 (예: "1억", "000만", "상해사망")
    if (!currentItem.coverageName && !line.match(/^(\d+)\s/)) {
      currentItem.coverageName = line.trim();
    }
    
    // 현재 보장 (예: "8,500 만원", "1,500 만원")
    const currentMatch = line.match(/현재\s*보장\s*([\d,]+)\s*만원?/);
    if (currentMatch) {
      currentItem.current = parseInt(currentMatch[1].replace(/,/g, ''));
    }
    
    // 차액 (예: "- 8,500 만원", "+2,000 만원")
    const diffMatch = line.match(/차액\s*([+-]?)\s*([\d,]+)\s*만원?/);
    if (diffMatch) {
      const sign = diffMatch[1] === '-' ? -1 : 1;
      currentItem.difference = sign * parseInt(diffMatch[2].replace(/,/g, ''));
    }
    
    // 진단 상태 (⚠ 부족, ✓ 충분, ⊗ 미가입)
    if (line.includes('⚠') || line.includes('부족')) {
      currentItem.status = '부족';
    } else if (line.includes('✓') || line.includes('충분')) {
      currentItem.status = '충분';
    } else if (line.includes('⊗') || line.includes('미가입')) {
      currentItem.status = '미가입';
    }
  }
  
  // 마지막 항목 추가
  if (currentItem) {
    diagnosis.push(currentItem);
  }

  console.log('📊 진단 현황:', diagnosis.length, '개 항목');
  return diagnosis;
}

/**
 * 금액 문자열을 숫자로 변환 (만원 단위)
 * 예: "1억 3,000만" -> 13000, "5,000만" -> 5000
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  let amount = 0;
  
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
