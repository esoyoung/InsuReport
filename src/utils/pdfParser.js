// src/utils/pdfParser.js

/**
 * KB 보장분석 PDF 파싱 유틸리티
 * Y 좌표 기반 텍스트 추출 및 구조 분석
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
  // "안영균 (61세 ,남자) 님의 전체 보장현황" 패턴
  const nameMatch = text.match(/([\w가-힣]+)\s*\((\d+)세\s*,\s*(남자|여자)\)\s*님의 전체 (?:보장현황|계약리스트)/);
  
  if (!nameMatch) {
    console.warn('⚠️ 고객 정보를 찾을 수 없습니다');
    return null;
  }
  
  // 계약 수 추출 - 보장현황 페이지에서 "8 0 4 3 1" 패턴 (첫 번째 숫자)
  const contractCountMatch = text.match(/님의 전체 보장현황[\s\S]{0,100}?\n\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+/);
  
  // 월보험료 추출 - 6자리 숫자 패턴
  const premiumMatches = text.match(/\d{3},\d{3}/g);
  const premium = premiumMatches ? premiumMatches[0] : '0';
  
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

// 계약 리스트 파싱 (완전 재작성)
function parseContractList(text) {
  const contracts = [];
  
  // "님의 전체 계약리스트" 섹션 찾기
  const contractSectionMatch = text.match(/님의 전체 계약리스트([\s\S]*?)(?=--- PAGE_BREAK ---|$)/);
  
  if (!contractSectionMatch) {
    console.warn('⚠️ 계약 리스트 섹션을 찾을 수 없습니다');
    return [];
  }
  
  const sectionText = contractSectionMatch[1];
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log(`📋 계약 리스트 섹션 줄 수: ${lines.length}`);
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // 계약 번호 패턴: "1 " 또는 "2 " (숫자 + 공백)
    const numMatch = line.match(/^(\d+)\s/);
    
    if (numMatch && parseInt(numMatch[1]) <= 20) { // 계약 번호는 1~20 사이
      const contractNum = numMatch[1];
      
      // 현재 줄에서 보험사와 상품명 추출
      const restOfLine = line.substring(numMatch[0].length).trim();
      
      // 보험사명과 상품명 분리
      // 패턴: "보험사명 상품명 날짜"
      let company = '';
      let product = '';
      let date = '';
      
      // 날짜 패턴 찾기
      const dateMatch = restOfLine.match(/(\d{4}-\d{2}-\d{2})/);
      
      if (dateMatch) {
        date = dateMatch[1];
        const beforeDate = restOfLine.substring(0, dateMatch.index).trim();
        
        // 보험사명과 상품명 분리
        const parts = beforeDate.split(/\s+/);
        
        if (parts.length >= 2) {
          // 첫 1-2단어가 보험사, 나머지가 상품명
          const possibleCompanies = ['메리츠화재', 'DB손보', 'NH농협손보', '삼성생명', '교보생명', '우정사업본부'];
          
          // 알려진 보험사 찾기
          let foundCompany = false;
          for (const pc of possibleCompanies) {
            if (beforeDate.includes(pc.replace(/\s/g, ''))) {
              company = pc;
              foundCompany = true;
              // 보험사명 뒤의 텍스트를 상품명으로
              const companyIndex = beforeDate.indexOf(pc.replace(/\s/g, ''));
              product = beforeDate.substring(companyIndex + pc.replace(/\s/g, '').length).trim();
              break;
            }
          }
          
          // 알려진 보험사가 없으면 첫 2단어를 보험사로
          if (!foundCompany) {
            company = parts.slice(0, 2).join('');
            product = parts.slice(2).join(' ');
          }
        } else {
          product = beforeDate;
        }
      }
      
      // 다음 줄에서 납입 정보 찾기
      let paymentInfo = {
        납입방법: '-',
        납입기간: '-',
        만기나이: '-',
        월보험료: '0'
      };
      
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        
        // 납입 정보 패턴: "월납 20년 74세 60,590원"
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
      
      if (company || product) {
        contracts.push({
          번호: contractNum,
          보험사: company || '-',
          상품명: product || restOfLine,
          가입일: date || '-',
          ...paymentInfo
        });
        
        console.log(`  ✓ 계약 ${contractNum}: ${company} ${product}`);
      }
    }
    
    i++;
  }
  
  console.log(`📋 계약 리스트: ${contracts.length}개 추출 완료`);
  
  return contracts;
}

// 담보별 현황 파싱
function parseCoverageStatus(text) {
  const coverages = [];
  
  // 일단 빈 배열 반환 (추가 개발 필요)
  console.log('⚠️ 담보별 현황 파싱은 추가 개발 필요');
  
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
  
  for (const dambo of damboItems) {
    const damboPattern = new RegExp(`${dambo}\\s+([\\d,억만]+)\\s+([\\d,억만]+)\\s+([-+]?[\\d,억만]+)\\s+(충분|부족|미가입)`);
    const match = text.match(damboPattern);
    
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
