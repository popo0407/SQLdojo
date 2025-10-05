/**
 * データ型判定ユーティリティ
 * Chart.jsのchartUtils.tsから移植
 */

export type DataType = 'number' | 'date' | 'datetime' | 'string';

// データ型を自動検出する関数（10レコードサンプル）
export const detectDataType = (values: unknown[]): DataType => {
  if (!values.length) return 'string';
  
  // 最初の10件をサンプルとして使用
  const sampleValues = values.slice(0, 10).filter(v => v !== null && v !== undefined && v !== '');
  if (!sampleValues.length) return 'string';
  
  // 日時判定（数値より優先）
  const datetimeCount = sampleValues.filter(v => {
    const str = String(v).trim();
    // YYYY-MM-DDThh:mm:ss[.sss][Z]形式 (ISO 8601)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/.test(str)) return true;
    // YYYY-MM-DD形式
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return true;
    // 日付として解析可能かチェック
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.length >= 8; // 8文字以上で有効な日付
  }).length;
  
  if (datetimeCount >= sampleValues.length * 0.7) { // 70%以上で日時判定
    // より詳細な判定
    const hasTime = sampleValues.some(v => String(v).includes('T') || String(v).includes(':'));
    return hasTime ? 'datetime' : 'date';
  }
  
  // 数値判定
  const numericCount = sampleValues.filter(v => {
    const num = Number(v);
    return !isNaN(num) && isFinite(num);
  }).length;
  
  if (numericCount >= sampleValues.length * 0.8) {
    return 'number';
  }
  
  return 'string';
};

// カラムのデータ型を自動検出
export const detectColumnTypes = (data: Record<string, unknown>[], columns: string[]): Record<string, DataType> => {
  const types: Record<string, DataType> = {};
  
  columns.forEach(col => {
    const values = data.map(row => row[col]);
    types[col] = detectDataType(values);
  });
  
  return types;
};

// データ型の表示名
export const DATA_TYPE_NAMES: Record<DataType, string> = {
  'number': '数値',
  'date': '日付',
  'datetime': '日時',
  'string': '文字列',
};

// 値の範囲を取得
export const getValueRange = (values: unknown[], dataType: DataType): { min?: any, max?: any } => {
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (!validValues.length) return {};
  
  if (dataType === 'number') {
    const numbers = validValues.map(v => Number(v)).filter(n => !isNaN(n) && isFinite(n));
    if (numbers.length === 0) return {};
    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers)
    };
  }
  
  if (dataType === 'date' || dataType === 'datetime') {
    const dates = validValues.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return {};
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    if (dataType === 'date') {
      return {
        min: minDate.toISOString().split('T')[0], // YYYY-MM-DD
        max: maxDate.toISOString().split('T')[0]
      };
    } else {
      return {
        min: minDate.toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
        max: maxDate.toISOString().slice(0, 16)
      };
    }
  }
  
  return {};
};