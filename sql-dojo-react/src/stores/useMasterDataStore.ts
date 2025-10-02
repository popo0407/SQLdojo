import { create } from 'zustand';
import { MasterDataService } from '../api/masterDataService';
import type { 
  MasterDataUpdateResult, 
  StationInfo
} from '../api/masterDataService';
import type { TableRow } from '../types/common';

// マスターデータストアの状態
interface MasterDataState {
  // データ状態
  stations: StationInfo[];
  selectedStation: StationInfo | null;
  filteredStations: TableRow[];
  masterData: {
    measure: TableRow[];
    set: TableRow[];
    free: TableRow[];
    parts: TableRow[];
    trouble: TableRow[];
  };
  selectedItems: {
    measure: TableRow[];
    set: TableRow[];
    free: TableRow[];
    parts: TableRow[];
    trouble: TableRow[];
  };
  generatedSql: string;

  // UI状態
  isLoading: boolean;
  isUpdating: boolean;
  activeTab: string; // 'station' | 'measure' | 'set' | 'free' | 'parts' | 'trouble'
  sidebarWidth: number; // 400 or 1000
  error: string | null;
  updateResult: MasterDataUpdateResult | null;

  // アクション
  updateAllMasterData: () => Promise<void>;
  loadStations: () => Promise<void>;
  selectStation: (station: StationInfo) => void;
  filterStations: (filters: Record<string, string>) => Promise<void>;
  loadMasterDataByStation: (masterType: string, sta_no1: string, sta_no2: string, sta_no3: string) => Promise<void>;
  toggleItemSelection: (masterType: string, item: TableRow) => void;
  selectAllItems: (masterType: string) => void;
  clearSelection: (masterType: string) => void;
  generateSql: (masterType: string, includeColumns?: string[]) => Promise<void>;
  setActiveTab: (tab: string) => void;
  toggleSidebarWidth: () => void;
  clearError: () => void;
}

export const useMasterDataStore = create<MasterDataState>((set, get) => ({
  // 初期状態
  stations: [],
  selectedStation: null,
  filteredStations: [],
  masterData: {
    measure: [],
    set: [],
    free: [],
    parts: [],
    trouble: []
  },
  selectedItems: {
    measure: [],
    set: [],
    free: [],
    parts: [],
    trouble: []
  },
  generatedSql: '',
  isLoading: false,
  isUpdating: false,
  activeTab: 'station',
  sidebarWidth: 400,
  error: null,
  updateResult: null,

  // 全マスターデータ更新
  updateAllMasterData: async () => {
    set({ isUpdating: true, error: null });
    try {
      const result = await MasterDataService.updateAllMasterData();
      set({ updateResult: result, isUpdating: false });
      
      // 更新後にステーション一覧を再読み込み
      get().loadStations();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'マスターデータの更新に失敗しました',
        isUpdating: false 
      });
    }
  },

  // ステーション一覧読み込み
  loadStations: async () => {
    set({ isLoading: true, error: null });
    try {
      const stations = await MasterDataService.getStations();
      set({ stations, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'ステーション一覧の取得に失敗しました',
        isLoading: false 
      });
    }
  },

  // ステーション選択
  selectStation: (station: StationInfo) => {
    set({ selectedStation: station });
  },

  // ステーションフィルタリング
  filterStations: async (filters: Record<string, string>) => {
    set({ isLoading: true, error: null });
    try {
      const filteredStations = await MasterDataService.filterStations(filters);
      set({ filteredStations, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'ステーションフィルタリングに失敗しました',
        isLoading: false 
      });
    }
  },

  // ステーション別マスターデータ読み込み
  loadMasterDataByStation: async (masterType: string, sta_no1: string, sta_no2: string, sta_no3: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await MasterDataService.getMasterDataByStation({
        master_type: masterType,
        sta_no1,
        sta_no2,
        sta_no3
      });
      
      set(state => ({
        masterData: {
          ...state.masterData,
          [masterType]: data
        },
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'マスターデータの取得に失敗しました',
        isLoading: false 
      });
    }
  },

  // アイテム選択切り替え
  toggleItemSelection: (masterType: string, item: TableRow) => {
    set(state => {
      const currentItems = state.selectedItems[masterType as keyof typeof state.selectedItems] || [];
      const itemIndex = currentItems.findIndex(selected => 
        JSON.stringify(selected) === JSON.stringify(item)
      );

      const newItems = itemIndex >= 0
        ? currentItems.filter((_, index) => index !== itemIndex)
        : [...currentItems, item];

      return {
        selectedItems: {
          ...state.selectedItems,
          [masterType]: newItems
        }
      };
    });
  },

  // 全選択
  selectAllItems: (masterType: string) => {
    set(state => ({
      selectedItems: {
        ...state.selectedItems,
        [masterType]: [...state.masterData[masterType as keyof typeof state.masterData]]
      }
    }));
  },

  // 選択クリア
  clearSelection: (masterType: string) => {
    set(state => ({
      selectedItems: {
        ...state.selectedItems,
        [masterType]: []
      }
    }));
  },

  // SQL生成
  generateSql: async (masterType: string, includeColumns?: string[]) => {
    const state = get();
    const selectedItems = state.selectedItems[masterType as keyof typeof state.selectedItems];
    
    if (selectedItems.length === 0) {
      set({ error: '選択されたアイテムがありません' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const result = await MasterDataService.generateSql({
        master_type: masterType,
        selected_items: selectedItems,
        include_columns: includeColumns
      });
      
      set({ generatedSql: result.sql, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'SQL生成に失敗しました',
        isLoading: false 
      });
    }
  },

  // アクティブタブ設定
  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  // サイドバー幅切り替え
  toggleSidebarWidth: () => {
    set(state => ({
      sidebarWidth: state.sidebarWidth === 400 ? 1000 : 400
    }));
  },

  // エラークリア
  clearError: () => {
    set({ error: null });
  }
}));