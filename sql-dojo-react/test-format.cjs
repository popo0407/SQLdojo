// CommonJS形式でテスト
const fs = require('fs');
const path = require('path');

// TypeScriptファイルの内容を読み取って直接実行（簡易版）
const sqlToTest = `SELECT {SELECT[]} FROM {テーブル}
WHERE 1={1[1,0]} AND STA in ({STA['']})`;

// パラメータパターンの正規表現（実装と同じもの）
const PARAMETER_PATTERN = /\{[^{}]*(?:\[[^[\]]*\])?[^{}]*\}/g;

// 基本的なフォーマット機能（簡易版）
function basicSqlFormat(text) {
  const formatted = text
    .replace(/[ \t]+/g, ' ')
    .trim()
    .replace(/\b(SELECT|FROM|WHERE|AND|OR|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|UNION|EXCEPT|INTERSECT)\b/gi, '\n$1')
    .replace(/,\s*/g, ',\n  ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*(=|<>|!=|<=|>=|<|>|LIKE|IN|NOT\s+IN|IS|IS\s+NOT|BETWEEN)\s*/gi, ' $1 ');

  const lines = formatted.split('\n');
  const formattedLines = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return;
    
    if (index === 0 || trimmedLine.match(/^(SELECT|WITH)/i)) {
      formattedLines.push(trimmedLine);
    }
    else if (trimmedLine.match(/^(FROM|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|UNION|EXCEPT|INTERSECT)/i)) {
      formattedLines.push(trimmedLine);
    }
    else if (trimmedLine.match(/^(AND|OR)/i)) {
      formattedLines.push('  ' + trimmedLine);
    }
    else {
      formattedLines.push('  ' + trimmedLine);
    }
  });

  return formattedLines.join('\n');
}

function formatSqlWithParameterProtection(text) {
  if (!text || text.trim() === '') {
    return text;
  }

  const parameterMap = new Map();
  let tokenCounter = 0;

  const textWithTokens = text.replace(PARAMETER_PATTERN, (match) => {
    const token = `__PARAM_TOKEN_${tokenCounter++}__`;
    parameterMap.set(token, match);
    return token;
  });

  let formattedText = basicSqlFormat(textWithTokens);

  parameterMap.forEach((originalParam, token) => {
    formattedText = formattedText.replace(token, originalParam);
  });

  return formattedText;
}

console.log('Original SQL:');
console.log(sqlToTest);
console.log('\n--- After formatting ---\n');

const formatted = formatSqlWithParameterProtection(sqlToTest);
console.log(formatted);

console.log('\n--- Analysis ---');
console.log('Contains {SELECT[]}:', formatted.includes('{SELECT[]}'));
console.log('Contains {1[1,0]}:', formatted.includes('{1[1,0]}'));
console.log(`Contains {STA['']}:`, formatted.includes(`{STA['']}`));

// パラメータが改行で分割されているかチェック
const brokenParameters = formatted.match(/\{[^}]*,\s*\n[^}]*\}/);
console.log('Broken parameters found:', brokenParameters ? brokenParameters : 'None');