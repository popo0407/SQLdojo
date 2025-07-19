import { create } from 'zustand';

// UI関連の型定義
export type FilterModalState = { 
  show: boolean; 
  columnName: string; 
  currentFilters?: string[] 
};

export type LimitDialogData = { 
  totalCount: number; 
  message: string 
} | null;

interface UIState {
  // ローディング状態
  isPending: boolean;
  isLoadingMore: boolean;
  isConfigLoading: boolean;
  isDownloading: boolean;
  
  // エラー状態
  isError: boolean;
  error: Error | null;
  
  // モーダル状態
  filterModal: FilterModalState;
  showLimitDialog: boolean;
  limitDialogData: LimitDialogData;
  
  // 設定状態
  configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null;
  
  // アクション
  setIsPending: (pending: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setIsConfigLoading: (loading: boolean) => void;
  setIsDownloading: (downloading: boolean) => void;
  setIsError: (error: boolean) => void;
  setError: (error: Error | null) => void;
  setFilterModal: (modal: FilterModalState) => void;
  setShowLimitDialog: (show: boolean) => void;
  setLimitDialogData: (data: LimitDialogData) => void;
  setConfigSettings: (settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => void;
  
  // 便利なアクション
  clearError: () => void;
  startLoading: () => void;
  stopLoading: () => void;
}

export const useUIStore = create<UIState>((set, _get) => ({
  // 初期状態
  isPending: false,
  isLoadingMore: false,
  isConfigLoading: true,
  isDownloading: false,
  isError: false,
  error: null,
  filterModal: { show: false, columnName: '', currentFilters: [] },
  showLimitDialog: false,
  limitDialogData: null,
  configSettings: null,
  
  // 基本セッター
  setIsPending: (isPending) => set({ isPending }),
  setIsLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setIsConfigLoading: (isConfigLoading) => set({ isConfigLoading }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setIsError: (isError) => set({ isError }),
  setError: (error) => set({ error }),
  setFilterModal: (filterModal) => set({ filterModal }),
  setShowLimitDialog: (showLimitDialog) => set({ showLimitDialog }),
  setLimitDialogData: (limitDialogData) => set({ limitDialogData }),
  setConfigSettings: (configSettings) => set({ configSettings }),
  
  // 便利なアクション
  clearError: () => set({ isError: false, error: null }),
  startLoading: () => set({ isPending: true, isError: false, error: null }),
  stopLoading: () => set({ isPending: false }),
})); 