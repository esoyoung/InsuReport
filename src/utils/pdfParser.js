import * as pdfjsLib from 'pdfjs-dist';
import { parseWithFallback } from './aiParser';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

  // 🆕 전체 텍스트 자동 다운로드
  try {
    const blob = new Blob([fullText], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_text_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('✅ 전체 텍스트 파일 다운로드 시작');
  } catch (error) {
    console.error('❌ 다운로드 실패:', error);
  }

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
    rawText: text
  };
}

/**
 * 고객 정보 추출 (개선 v2)
 */
function extractCustomerInfo(text, structuredPages) {
  // 패턴: "강민재 (32세 ,여자)   님의 전체 보장현황"
  const nameMatch = text.match(/([가-힣]{2,4})\s*[\(（]\s*(\d+)세\s*[,，]\s*(남자|여자)\s*[\)）]\s*님의\s*전체/);
  
  if (nameMatch) {
    const name = nameMatch[1];
    const age = parseInt(nameMatch[2]);
    const gender = nameMatch[3];
    
    // 계약 수와 월 보험료 찾기 (같은 페이지)
    // 패턴: " 3  153,500" (계약수  월보험료)
    const statsMatch = text.match(/\s(\d+)\s+([\d,]+)\s+0\s+0\s+0\s+\1/);
    
    return {
      name: name,
      age: age,
      gender: gender,
      contractCount: statsMatch ? parseInt(statsMatch[1]) : 0,
      monthlyPremium: statsMatch ? parseInt(statsMatch[2].replace(/,/g, '')) : 0,
      reportDate: new Date().toISOString().split('T')[0]
    };
  }
  
  // 폴백 패턴
  return {
    name: '알 수 없음',
    age: 0,
    gender: '알 수 없음',
    contractCount: 0,
    monthlyPremium: 0,
    reportDate: new Date().toISOString().split('T')[0]
  };
}

/**
 * 계약 리스트 추출 (개선 v2)
 */
function extractContracts(text, structuredPages) {
  const contracts = [];
  
  // "전체 계약리스트" 페이지 찾기
  const contractPage = structuredPages.find(page => 
    page.text.includes('전체 계약리스트') || 
    page.text.includes('전체 계약 리스트')
  );
  
  if (!contractPage) {
    console.warn('⚠️ 전체 계약 리스트 페이지를 찾을 수 없습니다');
    return [];
  }

  console.log('📋 계약 페이지 발견:', contractPage.pageNumber);
  
  // 패턴: 번호  보험사  상품명  가입일  납입방식  납입기간  만기  보험료
  // 예: 1   새마을금고중앙회   無MG나를위한여성암공제Ⅳ(만기환급형)   2018-09-04   월납   25년   80세   73,960 원
  
  const lines = contractPage.lines;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 번호로 시작하는 계약 행 매칭
    const match = line.match(/^(\d+)\s+(.+?)\s+(無.+?)\s+(\d{4}-\d{2}-\d{2})\s+(월납|년납)\s+(\d+년)\s+(\d+세|종신)\s+([\d,]+)\s*원/);
    
    if (match) {
      contracts.push({
        no: parseInt(match[1]),
        company: match[2].trim(),
        productName: match[3].trim(),
        startDate: match[4],
        paymentType: match[5],
        paymentPeriod: match[6],
        maturityAge: match[7],
        premium: parseInt(match[8].replace(/,/g, ''))
      });
      
      console.log(`  ✓ 계약 ${match[1]}: ${match[2]} - ${match[3]}`);
    }
  }

  console.log(`📋 계약 리스트: ${contracts.length}개 추출`);
  return contracts;
}

/**
 * 담보 현황 추출 (개선 v2)
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

  // "전체 보장현황" 페이지 찾기
  const coveragePage = structuredPages.find(page => 
    page.text.includes('전체 보장현황')
  );
  
  if (!coveragePage) {
    console.warn('⚠️ 담보별 현황 페이지를 찾을 수 없습니다');
    return coverages;
  }

  console.log('🛡️ 담보 페이지 발견:', coveragePage.pageNumber);

  coverageTypes.forEach(type => {
    // 패턴: "상해사망   1,500만" 형태 찾기
    const regex = new RegExp(`${type.name}\\s+([\\d,]+만|0)`, 'i');
    const match = coveragePage.text.match(regex);
    
    let current = 0;
    let recommended = 0;
    
    if (match && match[1] !== '0') {
      current = parseAmount(match[1]);
      recommended = current;
    }

    coverages.push({
      ...type,
      current,
      recommended
    });
  });

  console.log(`🛡️ 담보 현황: ${coverages.length}개 항목`);
  return coverages;
}

/**
 * 진단 현황 추출 (개선 v2)
 */
function extractDiagnosis(text, structuredPages) {
  const diagnosis = [];
  
  // "전체 담보 진단 현황" 페이지 찾기
  const diagnosisPage = structuredPages.find(page => 
    page.text.includes('전체 담보 진단 현황')
  );
  
  if (!diagnosisPage) {
    console.warn('⚠️ 담보별 진단현황 페이지를 찾을 수 없습니다');
    return diagnosis;
  }

  console.log('📊 진단 페이지 발견:', diagnosisPage.pageNumber);
  
  const lines = diagnosisPage.lines;
  
  // 패턴: 담보명   권장금액   가입금액   차이   상태
  // 예:  상해사망   2억   1,500만   -1억 8,500만   부족
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 진단 행 매칭
    const match = line.match(/^([가-힣0-9\/\(\)]+?)\s+([\d,억만]+)\s+([\d,억만]+|0)\s+([+-]?[\d,억만]+)\s+(충분|부족|미가입)$/);
    
    if (match) {
      const coverageName = match[1].trim();
      const recommended = parseAmount(match[2]);
      const current = match[3] === '0' ? 0 : parseAmount(match[3]);
      const difference = parseAmount(match[4]);
      const status = match[5];
      
      diagnosis.push({
        coverageName,
        current,
        recommended,
        difference,
        status
      });
      
      console.log(`  ✓ ${coverageName}: ${current}만 / ${recommended}만 (${status})`);
    }
  }

  console.log(`📊 진단 현황: ${diagnosis.length}개 항목`);
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
