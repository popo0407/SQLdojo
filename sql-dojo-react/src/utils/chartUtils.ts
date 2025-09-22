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
export type ChartType = 'scatter' | 'bar';

// Y軸配置の定義
export type YAxisSide = 'left' | 'right';

// 凡例位置の定義
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

// データ範囲の定義
export type DataScope = 'displayed' | 'all';

// データ型の定義
export type ColumnDataType = 'number' | 'date' | 'string';

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
  dataScope: DataScope;
  columnDataTypes: Record<string, ColumnDataType>;
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

  // 数値型の判定
  const numericValues = sampleValues.filter(val => !isNaN(Number(val)));
  if (numericValues.length === sampleValues.length) {
    return 'number';
  }

  // 日付型の判定（ISO形式、一般的な日付形式）
  const dateValues = sampleValues.filter(val => {
    const strVal = String(val);
    
    // 日付形式判定
    const dateValue = new Date(strVal);
    return !isNaN(dateValue.getTime());
  });
  if (dateValues.length === sampleValues.length) {
    return 'date';
  }

  return 'string';
};

// 手動設定されたデータ型を考慮してデータ型を取得
export const getEffectiveColumnDataType = (
  data: Record<string, unknown>[], 
  columnName: string, 
  manualDataTypes: Record<string, ColumnDataType>
): 'number' | 'date' | 'string' => {
  const manualType = manualDataTypes[columnName];
  
  // 手動設定がある場合は優先
  if (manualType) {
    return manualType;
  }
  
  // 手動設定がない場合は従来の自動判定を使用
  return getColumnDataType(data, columnName);
};

// Y軸用カラムのフィルタリング（数値型のみ）
export const getNumericColumns = (data: Record<string, unknown>[], columns: string[], manualDataTypes?: Record<string, ColumnDataType>): string[] => {
  return columns.filter(col => {
    const dataType = manualDataTypes 
      ? getEffectiveColumnDataType(data, col, manualDataTypes)
      : getColumnDataType(data, col);
    return dataType === 'number';
  });
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
    chartType: 'scatter',
    dataScope: 'displayed', // デフォルトは表示データのみ
    columnDataTypes: {}, // デフォルトは自動判定
  };
};