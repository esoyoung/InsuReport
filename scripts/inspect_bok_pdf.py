#!/usr/bin/env python3
"""
한국은행 기준금리 PDF 구조 확인
"""

import pdfplumber
from pathlib import Path

def inspect_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        print(f"총 페이지 수: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages[:3], 1):  # 처음 3페이지만
            print(f"\n{'='*60}")
            print(f"페이지 {page_num}")
            print(f"{'='*60}")
            
            # 텍스트 추출
            text = page.extract_text()
            if text:
                print("\n텍스트 내용:")
                print(text[:1000])  # 처음 1000자만
            
            # 테이블 추출 시도
            tables = page.extract_tables()
            if tables:
                print(f"\n테이블 발견: {len(tables)}개")
                for table_idx, table in enumerate(tables[:2], 1):
                    print(f"\n테이블 {table_idx}:")
                    for row_idx, row in enumerate(table[:5], 1):
                        print(f"  Row {row_idx}: {row}")

def main():
    pdf_path = Path('/home/user/uploaded_files/한국은행기준금리추이_2025-09-19.pdf')
    
    if not pdf_path.exists():
        print(f"❌ PDF 파일을 찾을 수 없습니다: {pdf_path}")
        return
    
    inspect_pdf(pdf_path)

if __name__ == '__main__':
    main()
