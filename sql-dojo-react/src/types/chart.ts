import type { ChartConfig } from '../utils/chartUtils';

// 表示モード
export type ViewMode = 'table' | 'chart';

// Y軸の配置側
export type YAxisSide = 'left' | 'right';

// 凡例の位置
export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

// チャートモーダルの状態
export interface ChartModalState {
  show: boolean;
  config?: Partial<ChartConfig>;
}

// チャート機能の状態
export interface ChartState {
  currentConfig: ChartConfig | null;
  viewMode: ViewMode;
  modalState: ChartModalState;
}

// チャート機能のアクション
export interface ChartActions {
  setViewMode: (mode: ViewMode) => void;
  setChartConfig: (config: ChartConfig) => void;
  showChartModal: (initialConfig?: Partial<ChartConfig>) => void;
  hideChartModal: () => void;
  clearChart: () => void;
}