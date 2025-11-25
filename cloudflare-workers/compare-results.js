/**
 * Compare AI Model Results
 * 
 * Usage: node compare-results.js <gemini.json> <gpt4o.json> <auto.json>
 */

const fs = require('fs');

function loadJSON(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load ${filepath}:`, error.message);
    return null;
  }
}

function compareResults(gemini, gpt4o, claude, auto) {
  console.log('========================================');
  console.log('📊 AI Model Comparison Report');
  console.log('========================================\n');

  // 1. Processing Time
  console.log('⏱️  Processing Time:');
  if (gemini?._metadata) {
    console.log(`  Gemini:  ${(gemini._metadata.processingTime / 1000).toFixed(1)}s`);
  }
  if (gpt4o?._metadata) {
    console.log(`  GPT-4o:  ${(gpt4o._metadata.processingTime / 1000).toFixed(1)}s`);
  }
  if (claude?._metadata) {
    console.log(`  Claude:  ${(claude._metadata.processingTime / 1000).toFixed(1)}s`);
  }
  if (auto?._metadata) {
    console.log(`  Auto:    ${(auto._metadata.processingTime / 1000).toFixed(1)}s (used: ${auto.model || 'unknown'})`);
  }
  console.log('');

  // 2. Contract Count
  console.log('📋 계약리스트 개수:');
  const geminiContracts = gemini?.계약리스트?.length || 0;
  const gpt4oContracts = gpt4o?.계약리스트?.length || 0;
  const claudeContracts = claude?.계약리스트?.length || 0;
  const autoContracts = auto?.계약리스트?.length || 0;
  
  console.log(`  Gemini:  ${geminiContracts}개`);
  if (gpt4oContracts > 0) console.log(`  GPT-4o:  ${gpt4oContracts}개`);
  if (claudeContracts > 0) console.log(`  Claude:  ${claudeContracts}개`);
  console.log(`  Auto:    ${autoContracts}개`);
  console.log('');

  // 3. Diagnosis Count
  console.log('🏥 진단현황 개수:');
  const geminiDiagnosis = gemini?.진단현황?.length || 0;
  const gpt4oDiagnosis = gpt4o?.진단현황?.length || 0;
  const claudeDiagnosis = claude?.진단현황?.length || 0;
  const autoDiagnosis = auto?.진단현황?.length || 0;
  
  console.log(`  Gemini:  ${geminiDiagnosis}개`);
  if (gpt4oDiagnosis > 0) console.log(`  GPT-4o:  ${gpt4oDiagnosis}개`);
  if (claudeDiagnosis > 0) console.log(`  Claude:  ${claudeDiagnosis}개`);
  console.log(`  Auto:    ${autoDiagnosis}개`);
  console.log('');

  // 4. Total Premium
  console.log('💰 총보험료:');
  const geminiPremium = gemini?.총보험료 || 0;
  const gpt4oPremium = gpt4o?.총보험료 || 0;
  const claudePremium = claude?.총보험료 || 0;
  const autoPremium = auto?.총보험료 || 0;
  
  console.log(`  Gemini:  ${geminiPremium.toLocaleString()}원`);
  if (gpt4oPremium > 0) console.log(`  GPT-4o:  ${gpt4oPremium.toLocaleString()}원`);
  if (claudePremium > 0) console.log(`  Claude:  ${claudePremium.toLocaleString()}원`);
  console.log(`  Auto:    ${autoPremium.toLocaleString()}원`);
  console.log('');

  // 5. Terminated Contracts
  console.log('🚫 실효/해지계약:');
  const geminiTerminated = gemini?.실효해지계약?.length || 0;
  const gpt4oTerminated = gpt4o?.실효해지계약?.length || 0;
  const claudeTerminated = claude?.실효해지계약?.length || 0;
  const autoTerminated = auto?.실효해지계약?.length || 0;
  
  console.log(`  Gemini:  ${geminiTerminated}개`);
  if (gpt4oTerminated >= 0) console.log(`  GPT-4o:  ${gpt4oTerminated}개`);
  if (claudeTerminated >= 0) console.log(`  Claude:  ${claudeTerminated}개`);
  console.log(`  Auto:    ${autoTerminated}개`);
  console.log('');

  // 6. Product Coverage
  console.log('📦 상품별담보:');
  const geminiProducts = gemini?.상품별담보?.length || 0;
  const gpt4oProducts = gpt4o?.상품별담보?.length || 0;
  const claudeProducts = claude?.상품별담보?.length || 0;
  const autoProducts = auto?.상품별담보?.length || 0;
  
  console.log(`  Gemini:  ${geminiProducts}개 상품`);
  if (gpt4oProducts > 0) console.log(`  GPT-4o:  ${gpt4oProducts}개 상품`);
  if (claudeProducts > 0) console.log(`  Claude:  ${claudeProducts}개 상품`);
  console.log(`  Auto:    ${autoProducts}개 상품`);
  console.log('');

  // 7. Data Quality Check
  console.log('✅ 데이터 품질:');
  
  function checkQuality(result, name) {
    const issues = [];
    
    // Check missing data
    if (!result.계약리스트 || result.계약리스트.length === 0) {
      issues.push('계약리스트 없음');
    }
    
    if (!result.진단현황 || result.진단현황.length === 0) {
      issues.push('진단현황 없음');
    }
    
    // Check date format
    const invalidDates = result.계약리스트?.filter(c => {
      return c.계약일 && !/^\d{4}-\d{2}-\d{2}$/.test(c.계약일);
    }).length || 0;
    
    if (invalidDates > 0) {
      issues.push(`잘못된 날짜 ${invalidDates}개`);
    }
    
    // Check premium total
    const calculatedTotal = result.계약리스트
      ?.filter(c => c.납입상태 === '진행중')
      ?.reduce((sum, c) => sum + (parseFloat(c.월보험료) || 0), 0) || 0;
    
    const declaredTotal = parseFloat(result.총보험료) || 0;
    const diff = Math.abs(calculatedTotal - declaredTotal);
    
    if (diff > 10000) {
      issues.push(`보험료 합계 불일치 (차이: ${diff.toLocaleString()}원)`);
    }
    
    if (issues.length === 0) {
      console.log(`  ${name}: ✅ 모든 검증 통과`);
    } else {
      console.log(`  ${name}: ⚠️ ${issues.join(', ')}`);
    }
  }
  
  if (gemini) checkQuality(gemini, 'Gemini');
  if (gpt4o) checkQuality(gpt4o, 'GPT-4o');
  if (claude) checkQuality(claude, 'Claude');
  if (auto) checkQuality(auto, 'Auto');
  
  console.log('');

  // 8. Confidence Score (for Auto)
  if (auto?.confidence) {
    console.log('🎯 신뢰도 점수 (Auto):');
    console.log(`  ${(auto.confidence * 100).toFixed(1)}%`);
    console.log('');
  }

  // 9. Modifications
  console.log('🔧 수정사항:');
  if (gemini?.수정사항?.length > 0) {
    console.log(`  Gemini:  ${gemini.수정사항.length}개 수정`);
  }
  if (gpt4o?.수정사항?.length > 0) {
    console.log(`  GPT-4o:  ${gpt4o.수정사항.length}개 수정`);
  }
  if (claude?.수정사항?.length > 0) {
    console.log(`  Claude:  ${claude.수정사항.length}개 수정`);
  }
  if (auto?.수정사항?.length > 0) {
    console.log(`  Auto:    ${auto.수정사항.length}개 수정`);
  }
  console.log('');

  // 10. Recommendation
  console.log('========================================');
  console.log('💡 권장 사항:');
  console.log('========================================');
  
  // Calculate scores
  const scores = {
    gemini: calculateScore(gemini, geminiContracts, geminiDiagnosis),
    gpt4o: gpt4oContracts > 0 ? calculateScore(gpt4o, gpt4oContracts, gpt4oDiagnosis) : 0,
    claude: claudeContracts > 0 ? calculateScore(claude, claudeContracts, claudeDiagnosis) : 0,
    auto: calculateScore(auto, autoContracts, autoDiagnosis)
  };
  
  const best = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
  
  console.log(`\n🏆 최고 성능: ${best[0].toUpperCase()} (점수: ${best[1].toFixed(1)})`);
  console.log('\n권장 설정:');
  console.log('  wrangler.toml → AI_MODEL = "auto"');
  console.log('  API 호출 → { "model": "auto" }');
  console.log('\n이유:');
  console.log('  ✅ Gemini로 빠른 처리 (85% 케이스)');
  console.log('  ✅ GPT-4o로 정밀 처리 (15% 케이스)');
  console.log('  ✅ 최적의 비용-정확도 균형');
  console.log('');
}

function calculateScore(result, contractCount, diagnosisCount) {
  let score = 0;
  
  // Data completeness (40 points)
  score += contractCount > 0 ? 20 : 0;
  score += diagnosisCount > 0 ? 20 : 0;
  
  // Date format (20 points)
  const validDates = result?.계약리스트?.filter(c => {
    return c.계약일 && /^\d{4}-\d{2}-\d{2}$/.test(c.계약일);
  }).length || 0;
  score += (validDates / contractCount) * 20;
  
  // Premium accuracy (40 points)
  const calculatedTotal = result?.계약리스트
    ?.filter(c => c.납입상태 === '진행중')
    ?.reduce((sum, c) => sum + (parseFloat(c.월보험료) || 0), 0) || 0;
  
  const declaredTotal = parseFloat(result?.총보험료) || 0;
  const diff = Math.abs(calculatedTotal - declaredTotal);
  
  if (diff < 1000) score += 40;
  else if (diff < 10000) score += 20;
  
  return score;
}

// Main
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node compare-results.js <gemini.json> [gpt4o.json] [claude.json] [auto.json]');
  process.exit(1);
}

const gemini = loadJSON(args[0]);
const gpt4o = args[1] ? loadJSON(args[1]) : null;
const claude = args[2] ? loadJSON(args[2]) : null;
const auto = args[3] ? loadJSON(args[3]) : null;

compareResults(gemini, gpt4o, claude, auto);
