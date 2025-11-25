#!/usr/bin/env python3
"""
한국은행 기준금리 PDF 파싱 스크립트
PDF의 테이블에서 날짜와 금리를 추출하여 JSON 형식으로 저장
"""

import pdfplumber
import re
import json
from datetime import datetime
from pathlib import Path

def parse_date_string(year, date_str):
    """
    날짜 문자열 파싱
    예: "11월\x0130일" -> "2017-11-30"
    """
    # 월과 일 추출
    month_match = re.search(r'(\d+)월', date_str)
    day_match = re.search(r'(\d+)일', date_str)
    
    if month_match and day_match:
        month = month_match.group(1).zfill(2)
        day = day_match.group(1).zfill(2)
        return f"{year}-{month}-{day}"
    
    return None

def parse_bok_interest_rate_pdf(pdf_path):
    """
    한국은행 기준금리 PDF 파싱
    
    Returns:
        list: [{"date": "YYYY-MM-DD", "rate": float}] 형식의 리스트
    """
    rates = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            # 테이블 추출
            tables = page.extract_tables()
            
            for table in tables:
                for row in table:
                    if not row or len(row) < 3:
                        continue
                    
                    # row = [년도, 월일, 금리]
                    year_str = str(row[0]).strip()
                    date_str = str(row[1]).strip()
                    rate_str = str(row[2]).strip()
                    
                    # 헤더 행 건너뛰기
                    if '년도' in year_str or '변경일자' in year_str:
                        continue
                    
                    # 년도가 4자리 숫자인지 확인
                    if not re.match(r'^\d{4}$', year_str):
                        continue
                    
                    # 날짜 파싱
                    parsed_date = parse_date_string(year_str, date_str)
                    if not parsed_date:
                        continue
                    
                    # 금리 파싱
                    try:
                        rate = float(rate_str)
                    except ValueError:
                        continue
                    
                    rates.append({
                        "date": parsed_date,
                        "rate": rate
                    })
    
    # 날짜순 정렬 (최신순)
    rates.sort(key=lambda x: x['date'], reverse=True)
    
    # 중복 제거
    unique_rates = []
    seen_dates = set()
    for rate_data in rates:
        if rate_data['date'] not in seen_dates:
            unique_rates.append(rate_data)
            seen_dates.add(rate_data['date'])
    
    return unique_rates

def main():
    # PDF 경로
    pdf_path = Path('/home/user/uploaded_files/한국은행기준금리추이_2025-09-19.pdf')
    
    if not pdf_path.exists():
        print(f"❌ PDF 파일을 찾을 수 없습니다: {pdf_path}")
        return
    
    print(f"📄 PDF 파싱 중: {pdf_path}")
    
    # PDF 파싱
    rates = parse_bok_interest_rate_pdf(pdf_path)
    
    print(f"✅ {len(rates)}개 금리 데이터 추출 완료")
    
    # 처음 10개 출력
    if rates:
        print("\n최근 10개 데이터 (최신순):")
        for rate_data in rates[:10]:
            print(f"  {rate_data['date']}: {rate_data['rate']}%")
    
    # JSON 파일로 저장
    output_path = Path(__file__).parent.parent / 'public' / 'data' / 'bok_rates.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(rates, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 저장 완료: {output_path}")
    print(f"📊 총 {len(rates)}건의 금리 데이터 저장")

if __name__ == '__main__':
    main()
