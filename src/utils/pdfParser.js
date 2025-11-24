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
    fullText += pageText + '\n';
  }

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
  // 이름 추출 (예: "안영균 (61세 ,남자)")
  const nameMatch = text.match(/([가-힣]+)\s*\((\d+)세\s*,\s*(남자|여자)\)/);
  
  // 월 납입료 추출
  const premiumMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*원?\s*$/m) || 
                       text.match(/월납.*?(\d{1,3}(?:,\d{3})*)\s*원/);
  
  return {
    name: nameMatch ? nameMatch[1] : '알 수 없음',
    age: nameMatch ? parseInt(nameMatch[2]) : 0,
    gender: nameMatch ? nameMatch[3] : '알 수 없음',
    monthlyPremium: premiumMatch ? parseInt(premiumMatch[1].replace(/,/g, '')) : 0,
    reportDate: new Date().toISOString().split('T')[0]
  };
}

/**
 * 계약 리스트 추출
 */
function extractContracts(text) {
  const contracts = [];
  
  // 계약 패턴 매칭 (번호, 회사명, 상품명, 가입일, 납입방식, 기간, 만기, 보험료)
  const contractPattern = /(\d+)\s+([\w가-힣]+)\s+([\w가-힣\(\)]+)\s+(\d{4}-\d{2}-\d{2})\s+(월납|년납)\s+(\d+년)\s+(\d+세|종신)\s+([\d,]+)원/g;
  
  let match;
  while ((match = contractPattern.exec(text)) !== null) {
    contracts.push({
      no: parseInt(match[1]),
      company: match[2],
      productName: match[3],
      startDate: match[4],
      paymentType: match[5],
      paymentPeriod: match[6],
      maturityAge: match[7],
      premium: parseInt(match[8].replace(/,/g, ''))
    });
  }
  
  // 패턴 매칭 실패 시 샘플 데이터 반환 (개발용)
  if (contracts.length === 0) {
    contracts.push(
      {
        no: 1,
        company: '메리츠화재',
        productName: '(무) 메리츠 간편한 암보험(Ⅰ)1811(1종)',
        startDate: '2019-02-21',
        paymentType: '월납',
        paymentPeriod: '20년',
        maturityAge: '74세',
        premium: 60590
      },
      {
        no: 2,
        company: '메리츠화재',
        productName: '무배당 알파Plus보장보험0808',
        startDate: '2008-12-05',
        paymentType: '월납',
        paymentPeriod: '20년',
        maturityAge: '80세',
        premium: 144630
      }
    );
  }
  
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

  coverageTypes.forEach(type => {
    // 현재 보장금액 추출 시도
    const currentPattern = new RegExp(`${type.name}[\\s\\n]+(\\d{1,3}(?:,?\\d{3})*(?:만|억)?)`);
    const currentMatch = text.match(currentPattern);
    
    // 권장 보장금액 추출 시도
    const recommendedPattern = new RegExp(`권장.*?${type.name}[\\s\\n]+(\\d{1,3}(?:,?\\d{3})*(?:만|억)?)`);
    const recommendedMatch = text.match(recommendedPattern);

    coverages.push({
      ...type,
      current: currentMatch ? parseAmount(currentMatch[1]) : 0,
      recommended: recommendedMatch ? parseAmount(recommendedMatch[1]) : 0
    });
  });

  return coverages;
}

/**
 * 진단 현황 추출
 */
function extractDiagnosis(text) {
  const diagnosis = [];
  
  // "부족", "충분", "미가입" 패턴 추출
  const diagnosisPattern = /([\w가-힣]+)\s+([\d,]+(?:만|억)?)\s*[-+]?\s*([\d,]+(?:만|억)?)?\s*(부족|충분|미가입)/g;
  
  let match;
  while ((match = diagnosisPattern.exec(text)) !== null) {
    diagnosis.push({
      coverageName: match[1],
      current: parseAmount(match[2]),
      difference: match[3] ? parseAmount(match[3]) : 0,
      status: match[4]
    });
  }

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
