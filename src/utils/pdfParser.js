// src/utils/pdfParser.js

/**
 * KB 보장분석 PDF 파싱 유틸리티
 * 정규식 기반 데이터 추출
 */

// 숫자 문자열을 숫자로 변환 (억, 만 단위 처리)
function parseAmount(str) {
  if (!str || str === '-' || str === '0') return 0;
  
  let amount = 0;
  const billions = str.match(/([\d,]+)억/);
  const tenThousands = str.match(/([\d,]+)만/);
  const thousands = str.match(/([\d,]+)천/);
  
  if (billions) {
    amount += parseInt(billions[1].replace(/,/g, '')) * 100000000;
  }
  if (tenThousands) {
    amount += parseInt(tenThousands[1].replace(/,/g, '')) * 10000;
  }
  if (thousands) {
    amount += parseInt(thousands[1].replace(/,/g, '')) * 1000;
  }
  
  return amount;
}

// 금액을 한글 표기로 변환
function formatAmount(amount) {
  if (amount === 0) return '-';
  
  const billion = Math.floor(amount / 100000000);
  const tenThousand = Math.floor((amount % 100000000) / 10000);
  
  let result = '';
  if (billion > 0) result += `${billion}억`;
  if (tenThousand > 0) result += `${tenThousand}만`;
  
  return result || '-';
}

// 고객 정보 파싱
function parseCustomerInfo(text) {
  // "강민재 (32세 ,여자)   님의 전체 보장현황" 패턴
  const nameMatch = text.match(/([\w가-힣]+)\s*\((\d+)세\s*,\s*(남자|여자)\)/);
  
  if (!nameMatch) {
    console.warn('⚠️ 고객 정보를 찾을 수 없습니다');
    return null;
  }
  
  // 계약 수와 월보험료 추출 - "3  153,500" 패턴
  const summaryMatch = text.match(/님의 전체 보장현황.*?\n.*?(\d+)\s+([\d,]+)/s);
  
  const customerInfo = {
    이름: nameMatch[1],
    나이: parseInt(nameMatch[2]),
    성별: nameMatch[3],
    계약수: summaryMatch ? parseInt(summaryMatch[1]) : 0,
    월보험료: summaryMatch ? parseInt(summaryMatch[2].replace(/,/g, '')) : 0
  };
  
  console.log('👤 고객 정보:', customerInfo);
  return customerInfo;
}

// 계약 리스트 파싱 (개선된 버전)
function parseContractList(text) {
  const lines = text.split('\n');
  const contracts = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // "님의 전체 계약리스트" 섹션 찾기
    if (line.includes('님의 전체 계약리스트') || line.includes('전체 계약리스트')) {
      i++;
      continue;
    }
    
    // 계약 번호로 시작하는 줄 찾기 (1, 2, 3 등)
    const contractNumMatch = line.match(/^(\d+)\s+/);
    
    if (contractNumMatch) {
      const contractNum = contractNumMatch[1];
      let fullLine = line;
      
      // 다음 줄들을 합쳐서 완전한 계약 정보 구성
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().match(/^\d+\s+/) && j < i + 5) {
        fullLine += ' ' + lines[j].trim();
        j++;
      }
      
      // 계약 정보 파싱
      // 패턴: 번호 보험사 상품명 가입일 납입방법 납입기간 만기나이 보험료
      const contractMatch = fullLine.match(/^(\d+)\s+(.*?)\s+(無\S+.*?)\s+(\d{4}-\d{2}-\d{2})\s+(월납|년납|일시납)\s+(\d+년)\s+(\d+세)\s+([\d,]+)\s*원/);
      
      if (contractMatch) {
        const [, num, company, product, date, method, period, age, premium] = contractMatch;
        
        contracts.push({
          번호: num,
          보험사: company.trim().replace(/\s+/g, ''),
          상품명: product.trim(),
          가입일: date,
          납입방법: method,
          납입기간: period,
          만기나이: age,
          월보험료: premium.replace(/,/g, '')
        });
        
        i = j - 1;
      }
    }
    
    i++;
  }
  
  console.log(`📋 계약 리스트: ${contracts.length}개 추출`);
  contracts.forEach(c => console.log(`  - ${c.보험사} ${c.상품명} (${c.월보험료}원)`));
  
  return contracts;
}

// 담보별 현황 파싱 (개선 필요)
function parseCoverageStatus(text) {
  const coverages = [];
  
  // "님의 담보별 가입 현황" 섹션 찾기
  const coverageSection = text.match(/님의 담보별 가입 현황[\s\S]*?(?=님의|충청GA사업단|$)/);
  
  if (!coverageSection) {
    console.warn('⚠️ 담보별 현황 섹션을 찾을 수 없습니다');
    return [];
  }
  
  const lines = coverageSection[0].split('\n');
  
  for (const line of lines) {
    // 담보명, 상품명, 담보내역, 보장금액, 가입일, 만기일 추출
    const match = line.match(/^\s*([\w가-힣/()]+)\s+(無\S+.*?)\s+([\w가-힣\[\]/%]+)\s+([\d,]+만)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})/);
    
    if (match) {
      coverages.push({
        담보명: match[1].trim(),
        상품명: match[2].trim(),
        담보내역: match[3].trim(),
        보장금액: match[4],
        가입일: match[5],
        만기일: match[6]
      });
    }
  }
  
  console.log(`📊 담보별 현황: ${coverages.length}개 추출`);
  return coverages;
}

// 진단 현황 파싱 (개선된 버전)
function parseDiagnosisStatus(text) {
  const diagnoses = [];
  
  // "님의 전체 담보 진단 현황" 섹션 찾기
  const diagnosisSection = text.match(/님의 전체 담보 진단 현황[\s\S]*?(?=충청GA사업단|$)/);
  
  if (!diagnosisSection) {
    console.warn('⚠️ 진단 현황 섹션을 찾을 수 없습니다');
    return [];
  }
  
  const lines = diagnosisSection[0].split('\n');
  
  for (const line of lines) {
    // 더 유연한 패턴: 담보명 권장금액 가입금액 부족금액 상태
    // 공백이 여러 개일 수 있고, +/- 부호 처리
    const match = line.match(/^\s*([\w가-힣/()]+)\s+([\d억만천,+-]+)\s+([\d억만천,+-]+)\s+([\d억만천,+\-]+)\s+(부족|충분|미가입)/);
    
    if (match) {
      const [, coverage, recommended, current, gap, status] = match;
      
      // 숫자 정제
      const cleanRecommended = recommended.replace(/\+/g, '').trim();
      const cleanCurrent = current.replace(/\+/g, '').trim();
      const cleanGap = gap.trim();
      
      diagnoses.push({
        담보명: coverage.trim(),
        권장금액: cleanRecommended,
        가입금액: cleanCurrent,
        부족금액: cleanGap,
        상태: status
      });
    }
  }
  
  // 상태별 카운트
  const statusCount = {
    부족: diagnoses.filter(d => d.상태 === '부족').length,
    미가입: diagnoses.filter(d => d.상태 === '미가입').length,
    충분: diagnoses.filter(d => d.상태 === '충분').length
  };
  
  console.log(`📊 진단 현황: ${diagnoses.length}개 항목 (부족 ${statusCount.부족}, 미가입 ${statusCount.미가입}, 충분 ${statusCount.충분})`);
  
  return diagnoses;
}

// 메인 파싱 함수
export async function parsePDF(file) {
  try {
    console.log('📄 PDF 파싱 시작:', file.name);
    
    // PDF.js로 텍스트 추출
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // 모든 페이지 텍스트 추출
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      fullText += `\n===== PAGE ${i} =====\n`;
      fullText += textContent.items.map(item => item.str).join(' ');
    }
    
    console.log('📝 텍스트 추출 완료:', fullText.length, '글자');
    
    // 자동 다운로드 (디버깅용)
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_text_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    // 데이터 파싱
    const customerInfo = parseCustomerInfo(fullText);
    const contracts = parseContractList(fullText);
    const coverages = parseCoverageStatus(fullText);
    const diagnoses = parseDiagnosisStatus(fullText);
    
    const result = {
      고객정보: customerInfo,
      계약리스트: contracts,
      담보현황: coverages,
      진단현황: diagnoses
    };
    
    console.log('✅ 파싱 완료:', result);
    return result;
    
  } catch (error) {
    console.error('❌ PDF 파싱 실패:', error);
    throw error;
  }
}
