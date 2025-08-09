import { create } from 'zustand';
import type { 
  ResultsFilterModalState,
  BaseStoreState,
  BaseStoreActions 
} from '../types';

// UI関連の型定義
export type LimitDialogData = { 
  totalCount: number; 
  message: string 
} | null;

interface UIState extends BaseStoreState {
  // ローディング状態
  isPending: boolean;
  isLoadingMore: boolean;
  isConfigLoading: boolean;
  isDownloading: boolean;
  
  // モーダル状態
  filterModal: ResultsFilterModalState;
  showLimitDialog: boolean;
  limitDialogData: LimitDialogData;
  
  // 設定状態
  configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null;
  // バリデーション/ヘルプ
  validationMessages: string[];
  showShortcutHelp: boolean;
}

interface UIActions extends BaseStoreActions {
  // 状態設定アクション
  setIsPending: (pending: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setIsConfigLoading: (loading: boolean) => void;
  setIsDownloading: (downloading: boolean) => void;
  setFilterModal: (modal: ResultsFilterModalState) => void;
  setShowLimitDialog: (show: boolean) => void;
  setLimitDialogData: (data: LimitDialogData) => void;
  setConfigSettings: (settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => void;
  setValidationMessages: (messages: string[]) => void;
  setShowShortcutHelp: (show: boolean) => void;
  
  // 便利なアクション
  startLoading: () => void;
  stopLoading: () => void;
}

export type UIStore = UIState & UIActions;

export const createUIStore = () => create<UIStore>((set) => ({
  // BaseStoreState の初期値
  isLoading: false,
  error: null,
  isInitialized: false,
  
  // UI固有の初期状態
  isPending: false,
  isLoadingMore: false,
  isConfigLoading: true,
  isDownloading: false,
  filterModal: { show: false, columnName: '', currentFilters: [] },
  showLimitDialog: false,
  limitDialogData: null,
  configSettings: null,
  validationMessages: [],
  showShortcutHelp: false,

  // BaseStoreActions の実装
  reset: () => set({
    isLoading: false,
    error: null,
    isInitialized: false,
    isPending: false,
    isLoadingMore: false,
    isConfigLoading: true,
    isDownloading: false,
    filterModal: { show: false, columnName: '', currentFilters: [] },
    showLimitDialog: false,
    limitDialogData: null,
    configSettings: null,
  validationMessages: [],
  showShortcutHelp: false,
  }),
  
  clearError: () => set({ error: null }),
  
  setLoading: (isLoading: boolean) => set({ isLoading }),
  
  setError: (error: string | null) => set({ error }),

  // UI固有のアクション
  setIsPending: (isPending: boolean) => set({ isPending }),
  setIsLoadingMore: (isLoadingMore: boolean) => set({ isLoadingMore }),
  setIsConfigLoading: (isConfigLoading: boolean) => set({ isConfigLoading }),
  setIsDownloading: (isDownloading: boolean) => set({ isDownloading }),
  setFilterModal: (filterModal: ResultsFilterModalState) => set({ filterModal }),
  setShowLimitDialog: (showLimitDialog: boolean) => set({ showLimitDialog }),
  setLimitDialogData: (limitDialogData: LimitDialogData) => set({ limitDialogData }),
  setConfigSettings: (configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => set({ configSettings }),
  setValidationMessages: (validationMessages: string[]) => set({ validationMessages }),
  setShowShortcutHelp: (showShortcutHelp: boolean) => set({ showShortcutHelp }),
  
  // 便利なアクション
  startLoading: () => set({ isPending: true, error: null }),
  stopLoading: () => set({ isPending: false }),
}));

export const useUIStore = createUIStore(); 