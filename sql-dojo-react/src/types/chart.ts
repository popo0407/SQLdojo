import type { SimpleChartConfig } from '../utils/chartUtils';

// 表示モード
export type ViewMode = 'table' | 'chart';

// Y軸の配置側
export type YAxisSide = 'left' | 'right';

// チャートモーダルの状態
export interface ChartModalState {
  show: boolean;
  config?: Partial<SimpleChartConfig>;
}

// チャート機能の状態
export interface ChartState {
  currentConfig: SimpleChartConfig | null;
  viewMode: ViewMode;
  modalState: ChartModalState;
}

// チャート機能のアクション
export interface ChartActions {
  setViewMode: (mode: ViewMode) => void;
  setChartConfig: (config: SimpleChartConfig) => void;
    showChartModal: (initialConfig?: Partial<SimpleChartConfig>) => void;
  hideChartModal: () => void;
  clearChart: () => void;
}