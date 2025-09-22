import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,

} from 'recharts';
import type { ChartConfig } from '../../utils/chartUtils';
import { getColumnDataType } from '../../utils/chartUtils';

interface ChartViewerProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
}

/**
 * Snowflake形式の日時文字列（YYYYMMDDhhmmss）または数値（タイムスタンプ）を読みやすい形式に変換
 */
const formatSnowflakeDateTime = (value: string | number): string => {
  // 数値（タイムスタンプ）の場合は日付に変換
  if (typeof value === 'number') {
    const date = new Date(value);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  
  const snowflakeStr = String(value);
  if (!/^\d{14}$/.test(snowflakeStr)) {
    return snowflakeStr; // Snowflake形式でない場合はそのまま返す
  }
  
  const month = snowflakeStr.substring(4, 6);
  const day = snowflakeStr.substring(6, 8);
  const hour = snowflakeStr.substring(8, 10);
  const minute = snowflakeStr.substring(10, 12);
  
  // 短縮形式で表示（M/DD HH:mm）
  return `${month}/${day} ${hour}:${minute}`;
};

/**
 * カスタムツールチップ（日時フォーマット対応）
 */
const CustomTooltip = ({ active, payload, label, xAxisDataType, xAxisLabel }: {
  active?: boolean;
  payload?: Array<{ name: string; value: unknown; color: string }>;
  label?: string | number;
  xAxisDataType: string;
  xAxisLabel?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 rounded p-2 shadow">
        <p className="font-semibold mb-1">
          {xAxisLabel || 'データポイント'}
        </p>
        {/* X軸の値を表示 */}
        {label !== undefined && (
          <p className="text-sm mb-1">
            {xAxisDataType === 'date' ? formatSnowflakeDateTime(label!) : String(label)}
          </p>
        )}
        {payload.map((entry, index: number) => {
          // 日時データの場合は適切にフォーマット
          let displayValue = entry.value;
          if (entry.name === '日時' && typeof entry.value === 'number') {
            displayValue = formatSnowflakeDateTime(entry.value);
          } else if (entry.value === undefined || entry.value === null) {
            displayValue = 'N/A';
          }
          
          return (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${displayValue}`}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

/**
 * Rechartsを使用したチャート描画コンポーネント
 */
const ChartViewer: React.FC<ChartViewerProps> = ({ data, config }) => {
  // X軸のデータタイプを判定
  const xAxisDataType = React.useMemo(() => {
    if (!data.length || !config.xAxisColumn) return 'string';
    const dataType = getColumnDataType(data, config.xAxisColumn);
    
    // デバッグ用ログ
    console.log(`X軸データタイプ判定: カラム=${config.xAxisColumn}, タイプ=${dataType}`);
    console.log('サンプルデータ:', data.slice(0, 3).map(row => row[config.xAxisColumn]));
    
    return dataType;
  }, [data, config.xAxisColumn]);

  // 軸範囲の計算
  const getAxisDomain = React.useMemo(() => {
    const getYDomain = (side: 'left' | 'right') => {
      const range = config.yAxisRanges?.[side];
      if (range && (range.min !== undefined || range.max !== undefined)) {
        // 範囲指定がある場合は、数値のみで構成し、dataMin/dataMaxは使わない
        const minVal = range.min;
        const maxVal = range.max;
        
        // 両方指定されている場合
        if (minVal !== undefined && maxVal !== undefined) {
          return [minVal, maxVal] as [number, number];
        }
        
        // 片方のみ指定の場合、dataMin/dataMaxと組み合わせ
        return [
          minVal ?? 'dataMin',
          maxVal ?? 'dataMax'
        ] as [number | 'dataMin', number | 'dataMax'];
      }
      return undefined;
    };

    return {
      yLeftDomain: getYDomain('left'),
      yRightDomain: getYDomain('right')
    };
  }, [config.yAxisRanges]);

  // データの変換（ソート + 日付を数値変換）
  const transformedData = React.useMemo(() => {
    const processedData = [...data];

    // 日付データの場合はソート
    if (xAxisDataType === 'date' && config.xAxisColumn) {
      console.log('ソート前のデータ（最初の5件）:', processedData.slice(0, 5).map(row => row[config.xAxisColumn]));
      
      processedData.sort((a, b) => {
        const strA = String(a[config.xAxisColumn]);
        const strB = String(b[config.xAxisColumn]);
        
        // Snowflake形式の日時判定（YYYYMMDDhhmmss - 14桁の数字）
        if (/^\d{14}$/.test(strA) && /^\d{14}$/.test(strB)) {
          // 文字列として比較（YYYYMMDDhhmmss形式の文字列比較で正しくソートされる）
          return strA.localeCompare(strB);
        }
        
        // 従来の日付形式の場合
        const dateA = new Date(strA);
        const dateB = new Date(strB);
        return dateA.getTime() - dateB.getTime();
      });
      
      console.log('ソート後のデータ（最初の5件）:', processedData.slice(0, 5).map(row => row[config.xAxisColumn]));
      console.log('ソート後のデータ（最後の5件）:', processedData.slice(-5).map(row => row[config.xAxisColumn]));
    }

    // 日付データをタイムスタンプに変換（Rechartsで真の日付軸として扱うため）
    if (xAxisDataType === 'date' && config.xAxisColumn) {
      const convertedData = processedData.map(row => {
        const xValue = String(row[config.xAxisColumn]);
        let timestamp: number;
        
        // Snowflake形式の日時を変換（YYYYMMDDhhmmss）
        if (/^\d{14}$/.test(xValue)) {
          const year = parseInt(xValue.slice(0, 4));
          const month = parseInt(xValue.slice(4, 6)) - 1; // 0-based
          const day = parseInt(xValue.slice(6, 8));
          const hour = parseInt(xValue.slice(8, 10));
          const minute = parseInt(xValue.slice(10, 12));
          const second = parseInt(xValue.slice(12, 14));
          
          timestamp = new Date(year, month, day, hour, minute, second).getTime();
        } else {
          // 従来の日付形式
          timestamp = new Date(xValue).getTime();
        }
        
        return {
          ...row,
          [config.xAxisColumn]: timestamp // X軸を数値（タイムスタンプ）に変換
        };
      });
      
      console.log('タイムスタンプ変換後のデータ（最初の5件）:', convertedData.slice(0, 5).map((row, index) => ({ 
        originalIndex: index, 
        timestamp: row[config.xAxisColumn],
        formatted: formatSnowflakeDateTime(row[config.xAxisColumn] as number)
      })));
      
      return convertedData;
    }
    return processedData;
  }, [data, config, xAxisDataType]);

  // 凡例の設定
  const legendConfig = {
    verticalAlign: (
      config.legendPosition === 'top' || config.legendPosition === 'bottom'
        ? config.legendPosition
        : 'top'
    ) as 'top' | 'bottom',
    align: (
      config.legendPosition === 'left' || config.legendPosition === 'right'
        ? config.legendPosition
        : 'center'
    ) as 'left' | 'center' | 'right',
  };

  // 縦棒グラフ
  if (config.chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={transformedData} margin={{ top: 20, right: 120, left: 80, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={config.xAxisColumn}
            name={config.xAxisLabel}
            type={xAxisDataType === 'date' ? 'number' : (xAxisDataType === 'number' ? 'number' : 'category')}
            scale={xAxisDataType === 'date' ? 'time' : undefined}
            domain={xAxisDataType === 'date' ? ['dataMin', 'dataMax'] : undefined}
            tickFormatter={xAxisDataType === 'date' ? formatSnowflakeDateTime : undefined}
            label={{ value: config.xAxisLabel || config.xAxisColumn, position: 'insideBottom', offset: -5 }}
          />
          {/* 左Y軸 */}
          {config.yAxisColumns.filter(col => config.yAxisSides[col] === 'left').length > 0 && (
            <YAxis 
              yAxisId="left"
              orientation="left"
              domain={getAxisDomain.yLeftDomain}
              allowDataOverflow={true}
              label={{ value: config.yAxisLabels.left, angle: -90, position: 'insideLeft', textAnchor: 'middle', offset: -30 }}
            />
          )}
          {/* 右Y軸 */}
          {config.yAxisColumns.filter(col => config.yAxisSides[col] === 'right').length > 0 && (
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={getAxisDomain.yRightDomain}
              allowDataOverflow={true}
              label={{ 
                value: config.yAxisLabels.right, 
                angle: 90, 
                position: 'insideRight',
                textAnchor: 'middle',
                offset: -10
              }}
            />
          )}
          <Tooltip content={<CustomTooltip xAxisDataType={xAxisDataType} xAxisLabel={config.xAxisLabel} />} />
          {config.legendVisible && <Legend {...legendConfig} />}
          {config.yAxisColumns.map((col) => (
            <Bar 
              key={col}
              yAxisId={config.yAxisSides[col] || 'left'}
              dataKey={col} 
              fill={config.seriesColors[col]}
              name={col}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // デフォルト: 散布図
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart data={transformedData} margin={{ top: 20, right: 120, left: 80, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={config.xAxisColumn} 
          name={config.xAxisLabel}
          type={xAxisDataType === 'date' ? 'number' : (xAxisDataType === 'number' ? 'number' : 'category')}
          scale={xAxisDataType === 'date' ? 'time' : undefined}
          domain={xAxisDataType === 'date' ? ['dataMin', 'dataMax'] : undefined}
          tickFormatter={xAxisDataType === 'date' ? formatSnowflakeDateTime : undefined}
          label={{ value: config.xAxisLabel || config.xAxisColumn, position: 'insideBottom', offset: -5 }}
        />
        {/* 左Y軸 */}
        {config.yAxisColumns.filter(col => config.yAxisSides[col] === 'left').length > 0 && (
          <YAxis 
            yAxisId="left"
            orientation="left"
            domain={getAxisDomain.yLeftDomain}
            allowDataOverflow={true}
            label={{ value: config.yAxisLabels.left, angle: -90, position: 'insideLeft', textAnchor: 'middle', offset: -30 }}
          />
        )}
        {/* 右Y軸 */}
        {config.yAxisColumns.filter(col => config.yAxisSides[col] === 'right').length > 0 && (
          <YAxis 
            yAxisId="right"
            orientation="right"
            domain={getAxisDomain.yRightDomain}
            allowDataOverflow={true}
            label={{ 
              value: config.yAxisLabels.right, 
              angle: 90, 
              position: 'insideRight',
              textAnchor: 'middle',
              offset: -10
            }}
          />
        )}
        <Tooltip content={<CustomTooltip xAxisDataType={xAxisDataType} xAxisLabel={config.xAxisLabel} />} />
        {config.legendVisible && <Legend {...legendConfig} />}
        {config.yAxisColumns.map((col) => (
          <Scatter
            key={col}
            yAxisId={config.yAxisSides[col] || 'left'}
            dataKey={col}
            fill={config.seriesColors[col]}
            name={col}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default ChartViewer;
