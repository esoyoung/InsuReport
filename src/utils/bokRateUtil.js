/**
 * 한국은행 기준금리 유틸리티
 * 계약일 기준으로 해당 시점의 기준금리를 반환
 */

// 기준금리 데이터 (최신순으로 정렬되어 있음)
import bokRatesData from '../../public/data/bok_rates.json';

/**
 * 계약일 기준 한국은행 기준금리 조회
 * 
 * @param {string} contractDate - 계약일 (YYYY-MM-DD 형식)
 * @returns {number|null} - 기준금리 (%) 또는 null (데이터 없음)
 * 
 * 동작 원리:
 * - 계약일 이전의 가장 최근 기준금리 변경일의 금리를 반환
 * - 예: 계약일이 2024-12-01이면 2024-11-28의 3.0% 반환
 */
export function getBankOfKoreaRate(contractDate) {
  if (!contractDate) return null;
  
  try {
    // 계약일을 Date 객체로 변환
    const contractDateObj = new Date(contractDate);
    
    // 기준금리 데이터를 날짜순으로 순회 (최신순)
    for (const rateData of bokRatesData) {
      const rateDateObj = new Date(rateData.date);
      
      // 계약일 이전의 첫 번째 금리 변경일 찾기
      if (rateDateObj <= contractDateObj) {
        return rateData.rate;
      }
    }
    
    // 계약일이 모든 금리 데이터보다 과거인 경우
    // (2003년 7월 10일 이전)
    return null;
    
  } catch (error) {
    console.error('기준금리 조회 오류:', error);
    return null;
  }
}

/**
 * 기준금리를 퍼센트 문자열로 포맷
 * 
 * @param {number|null} rate - 기준금리
 * @returns {string} - 포맷된 문자열 (예: "3.00%")
 */
export function formatBokRate(rate) {
  if (rate === null || rate === undefined) {
    return '—';
  }
  
  return `${rate.toFixed(2)}%`;
}

/**
 * 계약일 배열에 기준금리를 추가
 * 
 * @param {Array} contracts - 계약 목록
 * @returns {Array} - 기준금리가 추가된 계약 목록
 */
export function enrichContractsWithBokRate(contracts) {
  if (!Array.isArray(contracts)) {
    return contracts;
  }
  
  return contracts.map(contract => {
    const contractDate = contract.계약일 || contract.가입일;
    const bokRate = getBankOfKoreaRate(contractDate);
    
    return {
      ...contract,
      한국은행기준금리: bokRate,
      한국은행기준금리_포맷: formatBokRate(bokRate)
    };
  });
}

export default {
  getBankOfKoreaRate,
  formatBokRate,
  enrichContractsWithBokRate
};
