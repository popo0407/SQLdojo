/**
 * データ解析ユーティリティ
 * Excel、CSV、TSVなどの形式に対応した拡張可能な設計
 */

/**
 * Excelデータを解析して適切に分割
 * @param excelText Excelからコピーされたテキスト
 * @returns 分割されたデータの配列
 */
export function parseExcelData(excelText: string): string[] {
  // 改行文字を統一してから改行で行に分割
  const normalizedText = excelText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];
  
  // 各行をタブで分割してセルを取得
  const allCells: string[] = [];
  
  lines.forEach(line => {
    const cells = line.split('\t').filter(cell => cell.trim() !== '');
    allCells.push(...cells);
  });
  
  return allCells;
}

/**
 * CSVデータを解析して適切に分割
 * @param csvText CSVからコピーされたテキスト
 * @returns 分割されたデータの配列
 */
export function parseCsvData(csvText: string): string[] {
  // 改行文字を統一してから改行で行に分割
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];
  
  // 各行をカンマで分割してセルを取得
  const allCells: string[] = [];
  
  lines.forEach(line => {
    const cells = line.split(',').filter(cell => cell.trim() !== '');
    allCells.push(...cells);
  });
  
  return allCells;
}

/**
 * TSVデータを解析して適切に分割
 * @param tsvText TSVからコピーされたテキスト
 * @returns 分割されたデータの配列
 */
export function parseTsvData(tsvText: string): string[] {
  // 改行文字を統一してから改行で行に分割
  const normalizedText = tsvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) return [];
  
  // 各行をタブで分割してセルを取得
  const allCells: string[] = [];
  
  lines.forEach(line => {
    const cells = line.split('\t').filter(cell => cell.trim() !== '');
    allCells.push(...cells);
  });
  
  return allCells;
}

/**
 * データ形式を判定して適切なパーサーを呼び出す
 * @param data ペーストされたデータ
 * @returns 分割されたデータの配列
 */
export function parsePastedData(data: string): string[] {
  if (!data || data.trim() === '') return [];
  
  // データ形式を判定（簡易的な判定）
  const lines = data.split('\n');
  if (lines.length === 0) return [];
  
  const firstLine = lines[0];
  
  // タブが含まれている場合はExcel/TSVとして扱う
  if (firstLine.includes('\t')) {
    return parseExcelData(data);
  }
  
  // カンマが含まれている場合はCSVとして扱う
  if (firstLine.includes(',')) {
    return parseCsvData(data);
  }
  
  // デフォルトはExcelとして扱う
  return parseExcelData(data);
}

/**
 * データ形式の判定（将来的な拡張用）
 */
export function detectDataFormat(data: string): 'excel' | 'csv' | 'tsv' | 'unknown' {
  if (!data || data.trim() === '') return 'unknown';
  
  const lines = data.split('\n');
  if (lines.length === 0) return 'unknown';
  
  const firstLine = lines[0];
  
  if (firstLine.includes('\t')) {
    return 'excel'; // または 'tsv'
  }
  
  if (firstLine.includes(',')) {
    return 'csv';
  }
  
  return 'unknown';
} 