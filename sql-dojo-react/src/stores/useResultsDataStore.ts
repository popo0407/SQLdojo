import { create } from 'zustand';
import type { 
  ResultsDataState, 
  ResultsDataActions, 
  TableRow 
} from '../types/results';

interface DataStoreState extends ResultsDataState, ResultsDataActions {}

export const useResultsDataStore = create<DataStoreState>((set) => ({
  // 初期状態
  allData: [],
  rawData: [],
  columns: [],
  rowCount: 0,
  execTime: 0,
  
  // セッター
  setAllData: (allData) => set({ allData }),
  setRawData: (rawData) => set({ rawData }),
  setColumns: (columns) => set({ columns }),
  setRowCount: (rowCount) => set({ rowCount }),
  setExecTime: (execTime) => set({ execTime }),
  
  // 便利なアクション
  clearResults: () => {
    set({
      allData: [],
      rawData: [],
      columns: [],
      rowCount: 0,
      execTime: 0,
    });
  },
})); 