import { create } from 'zustand';
import { readSqlCache } from '../api/sqlService';
import type { ExtendedFilterCondition } from '../types/results';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import type { 
  ResultsFilterState, 
  ResultsFilterActions
} from '../types/results';
import type { TableRow } from '../types/common';

interface FilterStoreState extends ResultsFilterState, ResultsFilterActions {
  extendedFilters: ExtendedFilterCondition[];
  setExtendedFilters: (filters: ExtendedFilterCondition[]) => void;
  applyExtendedFilter: (filter: ExtendedFilterCondition) => Promise<void>;
  clearExtendedFilters: () => Promise<void>;
}

export const createResultsFilterStore = () => create<FilterStoreState>((set, get) => ({
  // 初期状態
  sortConfig: null,
  filters: {},
  filterModal: { show: false, columnName: '', currentFilters: [] },
  extendedFilters: [],
  
  // セッター
  setSortConfig: (sortConfig) => set({ sortConfig }),
  setFilters: (filters) => set({ filters }),
  setExtendedFilters: (extendedFilters) => set({ extendedFilters }),
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
        const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
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
        const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        
        dataStore.setAllData(newData);
        dataStore.setColumns(readRes.columns);
        dataStore.setRowCount(readRes.total_count || newData.length);
        dataStore.setExecTime(readRes.execution_time || 0);
      } else {
        dataStore.setAllData([]);
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
  
  // 拡張フィルターアクション
  applyExtendedFilter: async (filter: ExtendedFilterCondition) => {
    const state = get();
    const dataStore = useResultsDataStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    
    // 既存の拡張フィルターから同じカラムのフィルターを除去
    const newExtendedFilters = state.extendedFilters.filter(f => f.column_name !== filter.column_name);
    newExtendedFilters.push(filter);
    
    console.log('拡張フィルター適用:', filter, '全拡張フィルター:', newExtendedFilters);
    
    set({ extendedFilters: newExtendedFilters });
    
    if (sessionStore.sessionId) {
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const readRes = await readSqlCache({
        session_id: sessionStore.sessionId,
        page: 1,
        page_size: pageSize,
        filters: state.filters,
        extended_filters: newExtendedFilters,
        sort_by: state.sortConfig?.key,
        sort_order: (state.sortConfig?.direction?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
      });
      
      console.log('拡張フィルターAPI結果:', readRes);
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        
        dataStore.setAllData(newData);
        dataStore.setColumns(readRes.columns);
        dataStore.setRowCount(readRes.total_count || newData.length);
        dataStore.setExecTime(readRes.execution_time || 0);
      } else {
        dataStore.setAllData([]);
        dataStore.setRowCount(0);
        dataStore.setExecTime(0);
      }
    } else {
      // フロント側でフィルタ（rawDataを元に）
      let filtered = dataStore.rawData;
      
      // 従来のフィルター
      Object.entries(state.filters).forEach(([col, vals]) => {
        filtered = filtered.filter(row => vals.includes(String(row[col])));
      });
      
      // 拡張フィルター
      newExtendedFilters.forEach(f => {
        if (f.filter_type === 'exact') {
          const exactFilter = f as ExtendedFilterCondition & { filter_type: 'exact' };
          filtered = filtered.filter(row => exactFilter.values.includes(String(row[f.column_name])));
        } else if (f.filter_type === 'range') {
          const rangeFilter = f as ExtendedFilterCondition & { filter_type: 'range' };
          filtered = filtered.filter(row => {
            const value = row[f.column_name];
            if (rangeFilter.data_type === 'number') {
              const numVal = Number(value);
              if (isNaN(numVal)) return false;
              if (rangeFilter.min_value !== undefined && numVal < Number(rangeFilter.min_value)) return false;
              if (rangeFilter.max_value !== undefined && numVal > Number(rangeFilter.max_value)) return false;
            } else if (rangeFilter.data_type === 'date' || rangeFilter.data_type === 'datetime') {
              const dateVal = new Date(String(value));
              if (isNaN(dateVal.getTime())) return false;
              if (rangeFilter.min_value && dateVal < new Date(String(rangeFilter.min_value))) return false;
              if (rangeFilter.max_value && dateVal > new Date(String(rangeFilter.max_value))) return false;
            }
            return true;
          });
        } else if (f.filter_type === 'text_search') {
          const textFilter = f as ExtendedFilterCondition & { filter_type: 'text_search' };
          filtered = filtered.filter(row => {
            const value = String(row[f.column_name] || '');
            return value.toLowerCase().includes(textFilter.search_text.toLowerCase());
          });
        }
      });
      
      dataStore.setAllData(filtered);
    }
  },
  
  clearExtendedFilters: async () => {
    const state = get();
    const dataStore = useResultsDataStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    
    set({ extendedFilters: [] });
    
    // データを再読み込み（拡張フィルターなしで）
    if (sessionStore.sessionId) {
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const readRes = await readSqlCache({
        session_id: sessionStore.sessionId,
        page: 1,
        page_size: pageSize,
        filters: state.filters,
        extended_filters: [],
        sort_by: state.sortConfig?.key,
        sort_order: (state.sortConfig?.direction?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
      });
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        
        dataStore.setAllData(newData);
        dataStore.setColumns(readRes.columns);
        dataStore.setRowCount(readRes.total_count || newData.length);
        dataStore.setExecTime(readRes.execution_time || 0);
      }
    } else {
      // フロント側でフィルタ（従来のフィルターのみ適用）
      let filtered = dataStore.rawData;
      Object.entries(state.filters).forEach(([col, vals]) => {
        filtered = filtered.filter(row => vals.includes(String(row[col])));
      });
      dataStore.setAllData(filtered);
    }
  },
}));

export const useResultsFilterStore = createResultsFilterStore(); 