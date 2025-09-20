/**
 * グラフ描画に関するユーティリティ関数
 */

// Excel風のデフォルトカラーパレット（カラー名付き）
export const EXCEL_COLOR_PALETTE = [
  { name: '青', value: '#4F81BD' },
  { name: 'オレンジ', value: '#F79646' },
  { name: '緑', value: '#9CBB58' },
  { name: '紫', value: '#8064A2' },
  { name: '薄青', value: '#4BACC6' },
  { name: '赤', value: '#F24F4F' },
  { name: '茶色', value: '#8C564B' },
  { name: 'ピンク', value: '#E377C2' },
  { name: '灰色', value: '#7F7F7F' },
  { name: '黄緑', value: '#BCBD22' },
];

// 後方互換性のために、色値のみの配列も提供
export const EXCEL_COLOR_VALUES = EXCEL_COLOR_PALETTE.map(color => color.value);

// グラフタイプの定義
export type ChartType = 'scatter' | 'bar' | 'horizontalBar' | 'combo';

// Y軸配置の定義
export type YAxisSide = 'left' | 'right';

// 凡例位置の定義
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

// 軸範囲設定の型定義
export interface AxisRange {
  min?: number;
  max?: number;
}

// グラフ設定の型定義
export interface ChartConfig {
  xAxisColumn: string;
  xAxisLabel: string;
  yAxisColumns: string[];
  yAxisSides: Record<string, YAxisSide>;
  yAxisLabels: {
    left: string;
    right: string;
  };
  yAxisRanges: {
    left?: AxisRange;
    right?: AxisRange;
  };
  seriesColors: Record<string, string>;
  legendPosition: LegendPosition;
  legendVisible: boolean;
  chartType: ChartType;
}

// データ型の判定
export const getColumnDataType = (data: Record<string, unknown>[], columnName: string): 'number' | 'date' | 'string' => {
  if (!data.length || !Object.prototype.hasOwnProperty.call(data[0], columnName)) {
    return 'string';
  }

  const sampleValues = data.slice(0, 10).map(row => row[columnName]).filter(val => val !== null && val !== undefined);
  
  if (sampleValues.length === 0) {
    return 'string';
  }

  // Snowflake形式の日時判定を最優先（数値判定より前）
  const snowflakeValues = sampleValues.filter(val => {
    const strVal = String(val);
    
    // Snowflake形式の日時判定（YYYYMMDDhhmmss - 14桁の数字）
    if (/^\d{14}$/.test(strVal)) {
      const year = parseInt(strVal.substring(0, 4));
      const month = parseInt(strVal.substring(4, 6));
      const day = parseInt(strVal.substring(6, 8));
      const hour = parseInt(strVal.substring(8, 10));
      const minute = parseInt(strVal.substring(10, 12));
      const second = parseInt(strVal.substring(12, 14));
      
      // 有効な日時かチェック
      if (year >= 1900 && year <= 2100 && 
          month >= 1 && month <= 12 && 
          day >= 1 && day <= 31 &&
          hour >= 0 && hour <= 23 &&
          minute >= 0 && minute <= 59 &&
          second >= 0 && second <= 59) {
        return true;
      }
    }
    return false;
  });
  
  if (snowflakeValues.length === sampleValues.length) {
    return 'date';
  }

  // 数値型の判定
  const numericValues = sampleValues.filter(val => !isNaN(Number(val)));
  if (numericValues.length === sampleValues.length) {
    return 'number';
  }

  // 日付型の判定（ISO形式、一般的な日付形式、Snowflake形式）
  const dateValues = sampleValues.filter(val => {
    const strVal = String(val);
    
    // Snowflake形式の日時判定（YYYYMMDDhhmmss - 14桁の数字）
    if (/^\d{14}$/.test(strVal)) {
      const year = parseInt(strVal.substring(0, 4));
      const month = parseInt(strVal.substring(4, 6));
      const day = parseInt(strVal.substring(6, 8));
      const hour = parseInt(strVal.substring(8, 10));
      const minute = parseInt(strVal.substring(10, 12));
      const second = parseInt(strVal.substring(12, 14));
      
      // 有効な日時かチェック
      if (year >= 1900 && year <= 2100 && 
          month >= 1 && month <= 12 && 
          day >= 1 && day <= 31 &&
          hour >= 0 && hour <= 23 &&
          minute >= 0 && minute <= 59 &&
          second >= 0 && second <= 59) {
        return true;
      }
    }
    
    // 従来の日付形式判定
    const dateValue = new Date(strVal);
    return !isNaN(dateValue.getTime());
  });
  if (dateValues.length === sampleValues.length) {
    return 'date';
  }

  return 'string';
};

// Y軸用カラムのフィルタリング（数値型のみ）
export const getNumericColumns = (data: Record<string, unknown>[], columns: string[]): string[] => {
  return columns.filter(col => getColumnDataType(data, col) === 'number');
};

// X軸用カラムのフィルタリング（全型対応）
export const getXAxisColumns = (_data: Record<string, unknown>[], columns: string[]): string[] => {
  return columns; // X軸は全ての型を許可
};

// カラーを自動割り当て
export const assignColors = (columns: string[]): Record<string, string> => {
  const colors: Record<string, string> = {};
  columns.forEach((col, index) => {
    colors[col] = EXCEL_COLOR_PALETTE[index % EXCEL_COLOR_PALETTE.length].value;
  });
  return colors;
};

// デフォルトのグラフ設定を生成（軸カラム未選択状態）
export const createDefaultChartConfig = (): ChartConfig => {
  return {
    xAxisColumn: '', // デフォルトでは未選択
    xAxisLabel: '',
    yAxisColumns: [], // デフォルトでは未選択
    yAxisSides: {},
    yAxisLabels: {
      left: '',
      right: '',
    },
    yAxisRanges: {
      left: undefined,
      right: undefined,
    },
    seriesColors: {},
    legendPosition: 'right',
    legendVisible: true,
    chartType: 'bar',
  };
};