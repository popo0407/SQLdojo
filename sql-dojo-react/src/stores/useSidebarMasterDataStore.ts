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

  // 全マスターデータ取得
  fetchAllMasterData: async () => {
    set({ loading: true, error: null });
    try {
      // まずマスターデータを更新
      const updateResponse = await fetch('/api/master/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!updateResponse.ok) {
        const errorResult = await updateResponse.json();
        throw new Error(errorResult.message || 'Failed to update master data');
      }

      // 各マスターデータを並行して取得
      const [station, measure, setData, free, parts, trouble] = await Promise.all([
        fetchMasterData('station'),
        fetchMasterData('measure'),
        fetchMasterData('set'),
        fetchMasterData('free'),
        fetchMasterData('parts'),
        fetchMasterData('trouble')
      ]);

      set({
        stationMaster: station,
        measureMaster: measure,
        setMaster: setData,
        freeMaster: free,
        partsMaster: parts,
        troubleMaster: trouble,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'マスターデータの取得に失敗しました',
        loading: false
      });
    }
  },

  clearError: () => set({ error: null })
}));