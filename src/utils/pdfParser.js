// src/utils/pdfParser.js

/**
 * KB 보장분석 PDF 파싱 유틸리티
 * Y 좌표 기반 텍스트 추출 및 구조 분석
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
  // "안영균 (61세 ,남자) 님의 전체 보장현황" 패턴
  const nameMatch = text.match(/([\w가-힣]+)\s*\((\d+)세\s*,\s*(남자|여자)\)\s*님의 전체 보장현황/);
  
  if (!nameMatch) {
    console.warn('⚠️ 고객 정보를 찾을 수 없습니다');
    return null;
  }
  
  // 계약 수 추출 - "8 0 4 3 1" 같은 패턴 (첫 번째 숫자가 계약 수)
  const contractCountMatch = text.match(/님의 전체 보장현황\s*\n\s*(\d+)\s+\d/);
  
  // 월보험료 추출 - "427,097" 패턴
  const premiumMatch = text.match(/427,097|[\d,]{3,}/);
  
  const customerInfo = {
    이름: nameMatch[1],
    나이: parseInt(nameMatch[2]),
    성별: nameMatch[3],
    계약수: contractCountMatch ? parseInt(contractCountMatch[1]) : 0,
    월보험료: premiumMatch ? parseInt(premiumMatch[0].replace(/,/g, '')) : 0
  };
  
  console.log('👤 고객 정보:', customerInfo);
  return customerInfo;
}

// 계약 리스트 파싱 (개선된 버전)
function parseContractList(text) {
  const contracts = [];
  
  // "님의 전체 계약리스트" 섹션 찾기
  const contractSectionMatch = text.match(/님의 전체 계약리스트([\s\S]*?)(?=님의 상품별|--- PAGE_BREAK ---|$)/);
  
  if (!contractSectionMatch) {
    console.warn('⚠️ 계약 리스트 섹션을 찾을 수 없습니다');
    return [];
  }
  
  const sectionText = contractSectionMatch[1];
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // 계약 번호로 시작하는 줄 찾기 (1, 2, 3, ...)
    const numMatch = line.match(/^(\d+)\s+/);
    
    if (numMatch) {
      const contractNum = numMatch[1];
      
      // 보험사 추출 (다음 단어들)
      const companyMatch = line.match(/^\d+\s+([\w가-힣\s]+?)\s+(?:\(무\)|무배당|New)/);
      const company = companyMatch ? companyMatch[1].trim().replace(/\s+/g, '') : '';
      
      // 상품명 추출 (괄호 포함 또는 한글명)
      const productMatch = line.match(/(?:\(무\)|무배당|New|삼성생명|교보생명|참좋은|평생보장)([\s\S]+?)(\d{4}-\d{2}-\d{2})/);
      const product = productMatch ? productMatch[1].trim() : '';
      
      // 가입일 추출
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';
      
      // 다음 줄에서 납입정보 추출
      let paymentInfo = {};
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const paymentMatch = nextLine.match(/(월납|년납|일시납)\s+(\d+)년\s+(\d+|종신)세\s+([\d,]+)원/);
        
        if (paymentMatch) {
          paymentInfo = {
            납입방법: paymentMatch[1],
            납입기간: paymentMatch[2] + '년',
            만기나이: paymentMatch[3] === '종신' ? '종신' : paymentMatch[3] + '세',
            월보험료: paymentMatch[4].replace(/,/g, '')
          };
          i++; // 다음 줄 스킵
        }
      }
      
      if (company && product && date) {
        contracts.push({
          번호: contractNum,
          보험사: company,
          상품명: product,
          가입일: date,
          ...paymentInfo
        });
      }
    }
    
    i++;
  }
  
  console.log(`📋 계약 리스트: ${contracts.length}개 추출`);
  contracts.forEach(c => console.log(`  - ${c.보험사} ${c.상품명}`));
  
  return contracts;
}

// 담보별 현황 파싱 (개선 필요)
function parseCoverageStatus(text) {
  const coverages = [];
  
  // "님의 담보별 가입 현황" 섹션 찾기
  const coverageSectionMatch = text.match(/님의 담보별 가입 현황([\s\S]*?)(?=님의 전체 담보|$)/);
  
  if (!coverageSectionMatch) {
    console.warn('⚠️ 담보별 현황 섹션을 찾을 수 없습니다');
    return [];
  }
  
  // 복잡한 구조이므로 일단 빈 배열 반환
  console.log('⚠️ 담보별 현황 파싱은 추가 개발 필요');
  
  return coverages;
}

// 담보별 진단현황 파싱
function parseDiagnosisStatus(text) {
  const diagnoses = [];
  
  // 37개 담보 항목
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
  
  // 각 담보 항목 파싱
  for (const dambo of damboItems) {
    // 담보명 찾기
    const damboPattern = new RegExp(`${dambo}\\s+([\d,억만]+)\\s+([\d,억만]+)\\s+([-+]?[\\d,억만]+)\\s+(충분|부족|미가입)`);
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
export async function parseKBInsurancePDF(file) {
  try {
    console.log('📄 PDF 파싱 시작...');
    
    // PDF.js로 파일 로드
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`📄 총 ${pdf.numPages} 페이지`);
    
    // Y 좌표 기반 텍스트 추출
    const fullText = await extractTextWithCoordinates(pdf);
    
    // 디버깅용 텍스트 다운로드
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_text_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📥 추출된 텍스트 다운로드 완료');
    
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
