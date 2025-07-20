import { create } from 'zustand';
import { readSqlCache } from '../api/sqlService';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import type { 
  ResultsFilterState, 
  ResultsFilterActions, 
  SortConfig, 
  FilterConfig, 
  FilterModalState,
  TableRow 
} from '../types/results';

interface FilterStoreState extends ResultsFilterState, ResultsFilterActions {}

export const useResultsFilterStore = create<FilterStoreState>((set, get) => ({
  // 初期状態
  sortConfig: null,
  filters: {},
  filterModal: { show: false, columnName: '', currentFilters: [] },
  
  // セッター
  setSortConfig: (sortConfig) => set({ sortConfig }),
  setFilters: (filters) => set({ filters }),
  setFilterModal: (modal) => {
    const filters = get().filters;
    const col = modal.columnName;
    set({ filterModal: { ...modal, currentFilters: modal.currentFilters ?? (filters[col] || []) } });
  },
  
  // ソート適用アクション
  applySort: async (key: string) => {
    const state = get();
    const dataStore = useResultsDataStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    
    if (!dataStore.columns.length) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (state.sortConfig && state.sortConfig.key === key && state.sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const newSortConfig = { key, direction };
    set({ sortConfig: newSortConfig });
    
    if (sessionStore.sessionId) {
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const readRes = await readSqlCache({
        session_id: sessionStore.sessionId,
        page: 1,
        page_size: pageSize,
        sort_by: key,
        sort_order: direction.toUpperCase() as 'ASC' | 'DESC',
        filters: state.filters,
      });
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        
        dataStore.setAllData(newData);
        dataStore.setColumns(readRes.columns);
        dataStore.setRowCount(readRes.total_count || newData.length);
        dataStore.setExecTime(readRes.execution_time || 0);
      } else {
        dataStore.setAllData([]);
        dataStore.setColumns([]);
        dataStore.setRowCount(0);
        dataStore.setExecTime(0);
      }
    } else {
      // フロント側でソート（rawDataを元に）
      let filtered = dataStore.rawData;
      Object.entries(state.filters).forEach(([col, vals]) => {
        filtered = filtered.filter(row => vals.includes(String(row[col])));
      });
      const sorted = [...filtered].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        if (direction === 'asc') return (a[key] ?? '') > (b[key] ?? '') ? 1 : -1;
        return (a[key] ?? '') < (b[key] ?? '') ? 1 : -1;
      });
      dataStore.setAllData(sorted);
    }
  },
  
  // フィルタ適用アクション
  applyFilter: async (columnName: string, filterValues: string[]) => {
    const state = get();
    const dataStore = useResultsDataStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    
    const newFilters = { ...state.filters };
    
    if (filterValues.length === 0) {
      delete newFilters[columnName];
    } else {
      newFilters[columnName] = filterValues;
    }
    
    set({ filters: newFilters });
    
    if (sessionStore.sessionId) {
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const readRes = await readSqlCache({
        session_id: sessionStore.sessionId,
        page: 1,
        page_size: pageSize,
        filters: newFilters,
        sort_by: state.sortConfig?.key,
        sort_order: (state.sortConfig?.direction?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
      });
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        
        dataStore.setAllData(newData);
        dataStore.setColumns(readRes.columns);
        dataStore.setRowCount(readRes.total_count || newData.length);
        dataStore.setExecTime(readRes.execution_time || 0);
      } else {
        dataStore.setAllData([]);
        dataStore.setColumns([]);
        dataStore.setRowCount(0);
        dataStore.setExecTime(0);
      }
    } else {
      // フロント側でフィルタ（rawDataを元に）
      let filtered = dataStore.rawData;
      Object.entries(newFilters).forEach(([col, vals]) => {
        filtered = filtered.filter(row => vals.includes(String(row[col])));
      });
      dataStore.setAllData(filtered);
    }
  },
})); 