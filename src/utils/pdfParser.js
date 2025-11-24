// src/utils/pdfParser.js

/**
 * KB 보장분석 PDF 파싱 유틸리티
 * 원본 PDF 구조 정확 분석 기반
 */

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

// 계약 리스트 파싱 (완전 재작성 - 원본 구조 기반)
function parseContractList(text) {
  const contracts = [];
  
  // "님의 전체 계약리스트" 섹션 찾기
  const contractSectionMatch = text.match(/님의 전체 계약리스트([\s\S]*?)(?=충청GA사업단|--- PAGE_BREAK ---|$)/);
  
  if (!contractSectionMatch) {
    console.warn('⚠️ 계약 리스트 섹션을 찾을 수 없습니다');
    return [];
  }
  
  const sectionText = contractSectionMatch[1];
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log(`📋 계약 리스트 섹션 분석 시작 (${lines.length}줄)`);
  
  // Step 1: 계약 기본 정보 추출 (번호, 보험사, 상품명, 날짜)
  const contractLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 계약 번호로 시작하는 줄 (1, 2, 3, ...)
    const numMatch = line.match(/^(\d+)\s/);
    
    if (numMatch && parseInt(numMatch[1]) >= 1 && parseInt(numMatch[1]) <= 20) {
      contractLines.push(line);
    }
  }
  
  console.log(`  ✓ 계약 줄 발견: ${contractLines.length}개`);
  
  // Step 2: 각 계약 줄에서 정보 추출
  for (const line of contractLines) {
    // 패턴: "번호 보험사 상품명 날짜"
    const parts = line.split(/\s+/);
    const contractNum = parts[0];
    
    // 날짜 찾기 (YYYY-MM-DD)
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
    
    if (dateMatch) {
      const date = dateMatch[1];
      const beforeDate = line.substring(contractNum.length, line.indexOf(date)).trim();
      
      // 보험사명 패턴
      const companyPatterns = [
        '메리츠화재', '메리츠화 재',
        'DB손보',
        'NH농협손보', 'NH농협 손보',
        '삼성생명',
        '교보생명',
        '우정사업본부', '우정사업 본부'
      ];
      
      let company = '';
      let product = beforeDate;
      
      // 알려진 보험사 찾기
      for (const pattern of companyPatterns) {
        const normalizedPattern = pattern.replace(/\s/g, '');
        const normalizedBeforeDate = beforeDate.replace(/\s/g, '');
        
        if (normalizedBeforeDate.includes(normalizedPattern)) {
          company = pattern.replace(/\s/g, '');
          // 보험사명 다음부터가 상품명
          const companyIndex = normalizedBeforeDate.indexOf(normalizedPattern);
          product = normalizedBeforeDate.substring(companyIndex + normalizedPattern.length).trim();
          break;
        }
      }
      
      // 보험사를 못 찾았으면 전체를 상품명으로
      if (!company) {
        product = beforeDate;
      }
      
      contracts.push({
        번호: contractNum,
        보험사: company,
        상품명: product,
        가입일: date,
        납입방법: '-',
        납입기간: '-',
        만기나이: '-',
        월보험료: '0'
      });
      
      console.log(`  ✓ 계약 ${contractNum}: ${company || '(보험사 미상)'} - ${product.substring(0, 30)}...`);
    }
  }
  
  // Step 3: 납입정보 추출 (월납, 년수, 나이, 금액)
  // 패턴: "월납 월납 월납 ..." 다음 줄에 "20년 74세 60,590원 20년 80세 144,630원 ..."
  const paymentSectionIndex = lines.findIndex(l => l.includes('월납') && l.split('월납').length > 2);
  
  if (paymentSectionIndex !== -1 && paymentSectionIndex + 1 < lines.length) {
    const paymentLine = lines[paymentSectionIndex + 1];
    
    // "20년 74세 60,590원" 패턴 찾기
    const paymentMatches = paymentLine.matchAll(/(\d+)년\s+(\d+|종신)세\s+([\d,]+)원/g);
    
    let paymentIndex = 0;
    for (const match of paymentMatches) {
      if (paymentIndex < contracts.length) {
        contracts[paymentIndex].납입방법 = '월납';
        contracts[paymentIndex].납입기간 = match[1] + '년';
        contracts[paymentIndex].만기나이 = match[2] === '종신' ? '종신' : match[2] + '세';
        contracts[paymentIndex].월보험료 = match[3].replace(/,/g, '');
        
        console.log(`  ✓ 납입정보 추가: 계약 ${contracts[paymentIndex].번호} - ${match[3]}원`);
        paymentIndex++;
      }
    }
  } else {
    console.warn('⚠️ 납입정보를 찾을 수 없습니다');
  }
  
  console.log(`📋 최종 계약 리스트: ${contracts.length}개 추출 완료`);
  
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
