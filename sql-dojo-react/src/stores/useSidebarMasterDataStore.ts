import { create } from 'zustand';
import type { 
  StationMaster, 
  MeasureMaster, 
  SetMaster, 
  FreeMaster, 
  PartsMaster, 
  TroubleMaster 
} from '../types/masterData';

interface SidebarMasterDataState {
  // データ
  stationMaster: StationMaster[];
  measureMaster: MeasureMaster[];
  setMaster: SetMaster[];
  freeMaster: FreeMaster[];
  partsMaster: PartsMaster[];
  troubleMaster: TroubleMaster[];
  
  // 状態
  loading: boolean;
  error: string | null;
  
  // アクション
  fetchAllMasterData: () => Promise<void>;
  fetchMasterDataForStation: (sta_no1: string, sta_no2: string, sta_no3: string) => Promise<void>;
  clearError: () => void;
}

// 個別のマスターデータ取得関数
const fetchMasterData = async (tableName: string) => {
  const response = await fetch(`/api/master/${tableName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
  }
  const result = await response.json();
  // SuccessResponseの構造に合わせてデータを取得
  return result.data?.items || [];
};

// 特定ステーションのマスターデータ取得関数
const fetchMasterDataForStation = async (tableName: string, sta_no1: string, sta_no2: string, sta_no3: string) => {
  const response = await fetch(`/api/master/${tableName}?sta_no1=${encodeURIComponent(sta_no1)}&sta_no2=${encodeURIComponent(sta_no2)}&sta_no3=${encodeURIComponent(sta_no3)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${tableName} for station: ${response.status}`);
  }
  const result = await response.json();
  return result.data?.items || [];
};

export const useSidebarMasterDataStore = create<SidebarMasterDataState>((set) => ({
  // 初期状態
  stationMaster: [],
  measureMaster: [],
  setMaster: [],
  freeMaster: [],
  partsMaster: [],
  troubleMaster: [],
  loading: false,
  error: null,

  // 全マスターデータ取得（ステーション情報のみ）
  fetchAllMasterData: async () => {
    set({ loading: true, error: null });
    try {
      // ステーション情報のみ取得
      const station = await fetchMasterData('station');

      set({
        stationMaster: station,
        // 他のマスターデータは初期化
        measureMaster: [],
        setMaster: [],
        freeMaster: [],
        partsMaster: [],
        troubleMaster: [],
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'ステーション情報の取得に失敗しました',
        loading: false
      });
    }
  },

  // 特定ステーションのマスターデータ取得
  fetchMasterDataForStation: async (sta_no1: string, sta_no2: string, sta_no3: string) => {
    set({ loading: true, error: null });
    try {
      // 特定ステーションの各マスターデータを並行して取得
      const [measure, setData, free, parts, trouble] = await Promise.all([
        fetchMasterDataForStation('measure', sta_no1, sta_no2, sta_no3),
        fetchMasterDataForStation('set', sta_no1, sta_no2, sta_no3),
        fetchMasterDataForStation('free', sta_no1, sta_no2, sta_no3),
        fetchMasterDataForStation('parts', sta_no1, sta_no2, sta_no3),
        fetchMasterDataForStation('trouble', sta_no1, sta_no2, sta_no3)
      ]);

      set({
        measureMaster: measure,
        setMaster: setData,
        freeMaster: free,
        partsMaster: parts,
        troubleMaster: trouble,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'ステーション固有マスターデータの取得に失敗しました',
        loading: false
      });
    }
  },

  clearError: () => set({ error: null })
}));