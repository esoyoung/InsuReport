// src/utils/aiParser.js - 클라이언트에서 서버 API 호출
export async function parseWithAI(text) {
  console.log('🤖 Gemini AI로 분석 시작...');
  
  try {
    // Vercel Serverless Function 호출 (API 키 노출 안 됨)
    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ AI 파싱 성공!', data);
    
    return data;

  } catch (error) {
    console.error('❌ AI 파싱 실패:', error);
    throw error;
  }
}
