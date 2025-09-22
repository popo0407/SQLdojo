import { create } from 'zustand';
import type { SimpleChartConfig } from '../utils/chartUtils';
import type { ChartState, ChartActions, ViewMode } from '../types/chart';

interface ChartStore extends ChartState, ChartActions {}

/**
 * グラフ表示機能用のZustandストア
 */
export const useChartStore = create<ChartStore>((set) => ({
  // 状態
  currentConfig: null,
  viewMode: 'table',
  modalState: {
    show: false,
    config: undefined,
  },

  // アクション
  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  setChartConfig: (config: SimpleChartConfig) => {
    set({ 
      currentConfig: config,
      viewMode: 'chart' // グラフが生成されたらグラフ表示に切り替え
    });
  },

  showChartModal: (initialConfig?: Partial<SimpleChartConfig>) => {
    set({ 
      modalState: { 
        show: true, 
        config: initialConfig 
      } 
    });
  },

  hideChartModal: () => {
    set({ 
      modalState: { 
        show: false, 
        config: undefined 
      } 
    });
  },

  clearChart: () => {
    set({ 
      currentConfig: null,
      viewMode: 'table',
      modalState: { show: false, config: undefined }
    });
  },
}));