/**
 * 高度なグラフ描画ユーティリティ (Chart.js + Excel互換)
 */

// Excel互換のシンプルなカラーパレット
export const EXCEL_COLORS = [
  '#4F81BD', // 青
  '#F79646', // オレンジ  
  '#9CBB58', // 緑
  '#8064A2', // 紫
  '#4BACC6', // 薄青
  '#F24F4F', // 赤
  '#8C564B', // 茶色
  '#E377C2', // ピンク
];

// 色名マッピング
export const COLOR_NAMES = {
  '#4F81BD': '青',
  '#F79646': 'オレンジ',
  '#9CBB58': '緑',
  '#8064A2': '紫',
  '#4BACC6': '薄青',
  '#F24F4F': '赤',
  '#8C564B': '茶色',
  '#E377C2': 'ピンク',
};

// データ型の表示名
export const DATA_TYPE_NAMES = {
  'number': '数値',
  'date': '日付',
  'datetime': '日時',
  'string': '文字列',
};

// Excel互換グラフタイプ（openpyxlでサポートされる範囲）
export type ChartType = 'bar' | 'scatter' | 'line';

// 凡例の位置
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

// グラフサイズの設定
export interface ChartSize {
  width?: number;
  height?: number;
}

// データ範囲の定義
export type DataScope = 'displayed' | 'all';

// データ型定義
export type DataType = 'number' | 'date' | 'datetime' | 'string';

// Y軸範囲設定
export interface YAxisRange {
  min?: number;
  max?: number;
}

// カラム設定
export interface ColumnConfig {
  name: string;
  dataType: DataType;
  color: string;
}

// 出力方法の型定義
export type OutputMethod = 'browser' | 'excel';

// シンプルなグラフ設定（Excel互換）
export interface SimpleChartConfig {
  chartType: ChartType;
  xColumn: string;
  xColumnType: DataType;
  yColumns: string[];
  yColumnConfigs: ColumnConfig[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  yAxisRange?: YAxisRange;
  title?: string;
  dataScope: DataScope;
  // 任意設定項目
  chartSize?: ChartSize;
  legendPosition?: LegendPosition;
  colors?: Record<string, string>;
  outputMethod?: OutputMethod;
}

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

// 値を適切な型に変換
export const convertValue = (value: unknown, dataType: DataType): number | Date | string => {
  if (value === null || value === undefined) {
    return dataType === 'number' ? 0 : dataType === 'string' ? '' : new Date();
  }
  
  const str = String(value);
  
  switch (dataType) {
    case 'number':
      return parseFloat(str) || 0;
    case 'date':
    case 'datetime':
      return new Date(str);
    default:
      return str;
  }
};

// Chart.js用データ変換（改良版）
export const transformDataForChartJS = (
  data: Record<string, unknown>[], 
  config: SimpleChartConfig
) => {
  if (!config.xColumn || config.yColumns.length === 0) {
    return { labels: [], datasets: [] };
  }

  const isScatter = config.chartType === 'scatter';
  
  if (isScatter) {
    // 散布図用データ変換
    const datasets = config.yColumns.map((yColumn, index) => {
      const columnConfig = config.yColumnConfigs?.find(c => c.name === yColumn);
      const color = columnConfig?.color || config.colors?.[yColumn] || EXCEL_COLORS[index % EXCEL_COLORS.length];
      
      const scatterData = data.map(row => {
        const xValue = convertValue(row[config.xColumn], config.xColumnType);
        const yValue = convertValue(row[yColumn], columnConfig?.dataType || 'number');
        
        return {
          x: config.xColumnType === 'number' ? Number(xValue) : 
             (config.xColumnType === 'date' || config.xColumnType === 'datetime') ? (xValue as Date).getTime() : 
             String(xValue),
          y: Number(yValue)
        };
      });
      
      return {
        label: yColumn,
        data: scatterData,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        pointRadius: 3,
      };
    });

    return { datasets };
  } else {
    // 棒グラフ・線グラフ用データ変換
    const labels = data.map(row => {
      const value = convertValue(row[config.xColumn], config.xColumnType);
      if (config.xColumnType === 'date' || config.xColumnType === 'datetime') {
        return (value as Date).toLocaleDateString();
      }
      return String(value);
    });

    const datasets = config.yColumns.map((yColumn, index) => {
      const columnConfig = config.yColumnConfigs?.find(c => c.name === yColumn);
      const color = columnConfig?.color || config.colors?.[yColumn] || EXCEL_COLORS[index % EXCEL_COLORS.length];
      
      return {
        label: yColumn,
        data: data.map(row => {
          const value = convertValue(row[yColumn], columnConfig?.dataType || 'number');
          return Number(value);
        }),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
      };
    });

    return { labels, datasets };
  }
};

// 数値カラムのフィルタリング
export const getNumericColumns = (data: Record<string, unknown>[], columns: string[]): string[] => {
  if (!data.length) return [];
  
  return columns.filter(col => {
    const sampleValues = data.slice(0, 10).map(row => row[col]);
    const numericValues = sampleValues.filter(val => 
      val !== null && val !== undefined && !isNaN(Number(val))
    );
    return numericValues.length >= sampleValues.length * 0.8; // 80%以上が数値
  });
};

// カラーを自動割り当て
export const assignColors = (columns: string[]): Record<string, string> => {
  const colors: Record<string, string> = {};
  columns.forEach((col, index) => {
    colors[col] = EXCEL_COLORS[index % EXCEL_COLORS.length];
  });
  return colors;
};

// デフォルトのグラフ設定を生成
export const createDefaultChartConfig = (): SimpleChartConfig => {
  return {
    chartType: 'scatter',
    xColumn: '',
    xColumnType: 'string',
    yColumns: [],
    yColumnConfigs: [],
    xAxisLabel: '',
    yAxisLabel: '',
    title: '',
    dataScope: 'all',
    yAxisRange: {},
    colors: {},
    chartSize: { width: 800, height: 400 },
    legendPosition: 'top',
    outputMethod: 'browser',
  };
};

// データに基づいてスマートなデフォルト設定を生成
export const createSmartChartConfig = (
  data: Record<string, unknown>[], 
  columns: string[]
): SimpleChartConfig => {
  if (!data.length || !columns.length) {
    return createDefaultChartConfig();
  }
  
  // カラムのデータ型を検出
  const columnTypes = detectColumnTypes(data, columns);
  
  // X軸候補（日時 > 文字列 > 数値の優先順位）
  const dateColumns = columns.filter(col => columnTypes[col] === 'date' || columnTypes[col] === 'datetime');
  const stringColumns = columns.filter(col => columnTypes[col] === 'string');
  const numberColumns = columns.filter(col => columnTypes[col] === 'number');
  
  const xColumn = dateColumns[0] || stringColumns[0] || numberColumns[0] || columns[0];
  const xColumnType = columnTypes[xColumn] || 'string';
  
  // Y軸は数値カラムを優先
  const yColumns = numberColumns.filter(col => col !== xColumn).slice(0, 3); // 最大3つまで
  
  // Y軸カラム設定
  const yColumnConfigs: ColumnConfig[] = yColumns.map((col, index) => ({
    name: col,
    dataType: columnTypes[col] || 'number',
    color: EXCEL_COLORS[index % EXCEL_COLORS.length],
  }));
  
  return {
    chartType: 'scatter',  // デフォルトで散布図を使用
    xColumn,
    xColumnType,
    yColumns,
    yColumnConfigs,
    xAxisLabel: xColumn,
    yAxisLabel: yColumns.join(', '),
    title: `${xColumn} vs ${yColumns.join(', ')}`,
    dataScope: 'all',  // すべてのデータをデフォルトに
    yAxisRange: {},
    colors: assignColors(yColumns),
    chartSize: { width: 800, height: 400 },
    legendPosition: 'top',
    outputMethod: 'browser',
  };
};