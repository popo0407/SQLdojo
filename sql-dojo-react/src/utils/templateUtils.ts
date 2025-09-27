import type { SimpleChartConfig, ChartType, DataType, LegendPosition, OutputMethod } from './chartUtils';

/**
 * グラフ設定をXMLタグ形式に変換
 */
export function convertChartConfigToXML(config: SimpleChartConfig): string {
  const xmlTags: string[] = [];
  
  // 必須項目
  xmlTags.push(`-- <chart_type>${config.chartType}</chart_type>`);
  xmlTags.push(`-- <x_column>${config.xColumn}</x_column>`);
  xmlTags.push(`-- <x_column_type>${config.xColumnType}</x_column_type>`);
  xmlTags.push(`-- <x_axis_label>${config.xAxisLabel || ''}</x_axis_label>`);
  xmlTags.push(`-- <y_columns>${JSON.stringify(config.yColumns)}</y_columns>`);
  xmlTags.push(`-- <y_column_configs>${JSON.stringify(config.yColumnConfigs)}</y_column_configs>`);
  xmlTags.push(`-- <y_axis_label>${config.yAxisLabel || ''}</y_axis_label>`);
  
  // 任意項目（値が存在する場合のみ追加）
  if (config.title) {
    xmlTags.push(`-- <chart_title>${config.title}</chart_title>`);
  }
  
  if (config.chartSize?.width) {
    xmlTags.push(`-- <chart_width>${config.chartSize.width}</chart_width>`);
  }
  
  if (config.chartSize?.height) {
    xmlTags.push(`-- <chart_height>${config.chartSize.height}</chart_height>`);
  }
  
  if (config.legendPosition) {
    xmlTags.push(`-- <legend_position>${config.legendPosition}</legend_position>`);
  }
  
  if (config.yAxisRange?.min !== undefined) {
    xmlTags.push(`-- <y_axis_range_min>${config.yAxisRange.min}</y_axis_range_min>`);
  }
  
  if (config.yAxisRange?.max !== undefined) {
    xmlTags.push(`-- <y_axis_range_max>${config.yAxisRange.max}</y_axis_range_max>`);
  }
  
  // 出力方法を記録
  xmlTags.push(`-- <output_method>${config.outputMethod || 'browser'}</output_method>`);
  
  // パラメータ用の出力方法タグ
  xmlTags.push(`-- <output>{出力方法[ブラウザ,Excel]}</output>`);
  
  return xmlTags.join('\n');
}

/**
 * SQLからグラフ設定XMLを抽出
 */
export function extractChartConfigFromSQL(sql: string): SimpleChartConfig | null {
  try {
    const lines = sql.split('\n');
    const configLines = lines.filter(line => line.trim().startsWith('-- <') && line.trim().endsWith('>'));
    
    if (configLines.length === 0) {
      return null;
    }
    
    const config: Partial<SimpleChartConfig> = {};
    
    for (const line of configLines) {
      const match = line.match(/-- <(\w+)>(.*?)<\/\1>/);
      if (match) {
        const [, key, value] = match;
        
        switch (key) {
          case 'chart_type':
            config.chartType = value as ChartType;
            break;
          case 'chart_title':
            config.title = value;
            break;
          case 'chart_width':
            if (!config.chartSize) config.chartSize = {};
            config.chartSize.width = parseInt(value);
            break;
          case 'chart_height':
            if (!config.chartSize) config.chartSize = {};
            config.chartSize.height = parseInt(value);
            break;
          case 'legend_position':
            config.legendPosition = value as LegendPosition;
            break;
          case 'y_axis_range_min':
            if (!config.yAxisRange) config.yAxisRange = {};
            config.yAxisRange.min = parseFloat(value);
            break;
          case 'y_axis_range_max':
            if (!config.yAxisRange) config.yAxisRange = {};
            config.yAxisRange.max = parseFloat(value);
            break;
          case 'x_column':
            config.xColumn = value;
            break;
          case 'x_column_type':
            config.xColumnType = value as DataType;
            break;
          case 'x_axis_label':
            config.xAxisLabel = value;
            break;
          case 'y_columns':
            config.yColumns = JSON.parse(value);
            break;
          case 'y_column_configs':
            config.yColumnConfigs = JSON.parse(value);
            break;
          case 'y_axis_label':
            config.yAxisLabel = value;
            break;
          case 'output_method':
            config.outputMethod = value as OutputMethod;
            break;
        }
      }
    }
    
    // 必須項目が揃っているかチェック
    if (config.chartType && config.xColumn && config.yColumns && config.yColumns.length > 0) {
      return config as SimpleChartConfig;
    }
    
    return null;
  } catch (error) {
    console.error('グラフ設定の抽出に失敗:', error);
    return null;
  }
}

/**
 * SQLに<output>タグが含まれているかチェック
 */
export function hasOutputTag(sql: string): boolean {
  return /-- <output>\{[^}]+\}<\/output>/.test(sql);
}

/**
 * SQLから<output>タグを抽出して出力方法を取得
 */
export function extractOutputMethodFromSQL(sql: string): 'browser' | 'excel' | null {
  const match = sql.match(/-- <output>\{出力方法\[([^\]]+)\]\}<\/output>/);
  if (match) {
    return null; // パラメータ設定があることを示す
  }
  
  // 固定値の場合
  const fixedMatch = sql.match(/-- <output_method>(\w+)<\/output_method>/);
  if (fixedMatch) {
    return fixedMatch[1] === 'excel' ? 'excel' : 'browser';
  }
  
  return null;
}