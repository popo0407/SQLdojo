import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartData } from 'chart.js';
import { Bar, Scatter, Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { SimpleChartConfig } from '../../utils/chartUtils';
import { transformDataForChartJS } from '../../utils/chartUtils';

// Chart.js コンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartViewerProps {
  data: Record<string, unknown>[];
  config: SimpleChartConfig;
}

/**
 * Chart.jsを使用したシンプルなチャート描画コンポーネント
 */
const ChartViewer: React.FC<ChartViewerProps> = ({ data, config }) => {
  // Chart.js用にデータを変換
  const chartData = useMemo(() => {
    return transformDataForChartJS(data, config);
  }, [data, config]);

  // Chart.jsのオプション設定
  const options = useMemo(() => {
    const legendPosition = config.legendPosition || 'top';
    return {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 100, // リサイズ時の遅延を最小化
      plugins: {
        legend: {
          position: legendPosition as 'top' | 'bottom' | 'left' | 'right',
          display: true,
        },
        title: {
          display: !!config.title,
          text: config.title || '',
        },
        tooltip: {
          enabled: data.length < 5000, // 大量データ時はツールチップ無効
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: !!config.xAxisLabel,
            text: config.xAxisLabel || config.xColumn,
          },
          type: (config.chartType === 'scatter' && 
                 (config.xColumnType === 'date' || config.xColumnType === 'datetime')) ? 'time' as const : 
                (config.chartType === 'scatter' && config.xColumnType === 'number') ? 'linear' as const : 'category' as const,
          time: (config.xColumnType === 'date' || config.xColumnType === 'datetime') ? {
            displayFormats: {
              day: 'yyyy-MM-dd',
              hour: 'yyyy-MM-dd HH:mm',
            },
          } : undefined,
        },
        y: {
          display: true,
          title: {
            display: !!config.yAxisLabel,
            text: config.yAxisLabel || config.yColumns.join(', '),
          },
          min: config.yAxisRange?.min,
          max: config.yAxisRange?.max,
        },
      },
      animation: {
        duration: data.length > 1000 ? 0 : 300, // 大量データ時はアニメーション無効
      },
    };
  }, [config, data.length]);

  // データがない場合の表示
  if (!config.xColumn || config.yColumns.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: config.chartSize?.height || 400 }}>
        <div className="text-muted">
          グラフを表示するには、X軸とY軸のカラムを選択してください
        </div>
      </div>
    );
  }

  // チャートタイプに応じて適切なコンポーネントを表示
  const chartStyle = {
    height: config.chartSize?.height || 500, // デフォルトの高さを500pxに増加
    width: '100%', // 親コンテナの幅を最大限活用
    maxWidth: config.chartSize?.width ? `${config.chartSize.width}px` : 'none',
    minHeight: '400px', // 最小高さを保証
  };

  return (
    <div style={chartStyle}>
      {config.chartType === 'bar' ? (
        <Bar data={chartData as ChartData<'bar'>} options={options} />
      ) : config.chartType === 'scatter' ? (
        <Scatter data={chartData as ChartData<'scatter'>} options={options} />
      ) : config.chartType === 'line' ? (
        <Line data={chartData as ChartData<'line'>} options={options} />
      ) : (
        <Bar data={chartData as ChartData<'bar'>} options={options} /> // デフォルトは棒グラフ
      )}
    </div>
  );
};

export default ChartViewer;
