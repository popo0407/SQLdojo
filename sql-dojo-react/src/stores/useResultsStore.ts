import { create } from 'zustand';
import { useUIStore } from './useUIStore';

// 型定義
export type SortConfig = { key: string; direction: 'asc' | 'desc' };
export type FilterConfig = { [columnName: string]: string[] };
export type TableRow = Record<string, string | number | boolean | null>;
export type FilterModalState = { 
  show: boolean; 
  columnName: string; 
  currentFilters?: string[] 
};

interface ResultsState {
  // データ管理
  allData: TableRow[];
  rawData: TableRow[];
  columns: string[];
  rowCount: number;
  execTime: number;
  
  // ソート・フィルタ
  sortConfig: SortConfig | null;
  filters: FilterConfig;
  filterModal: FilterModalState;
  
  // ページネーション
  currentPage: number;
  hasMoreData: boolean;
  
  // セッション管理
  sessionId: string | null;
  
  // 設定
  configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null;
  
  // セッター
  setAllData: (data: TableRow[]) => void;
  setRawData: (data: TableRow[]) => void;
  setColumns: (cols: string[]) => void;
  setRowCount: (count: number) => void;
  setExecTime: (time: number) => void;
  setSortConfig: (config: SortConfig | null) => void;
  setFilters: (filters: FilterConfig) => void;
  setFilterModal: (modal: FilterModalState) => void;
  setCurrentPage: (page: number) => void;
  setHasMoreData: (hasMore: boolean) => void;
  setSessionId: (id: string | null) => void;
  setConfigSettings: (settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => void;
  
  // アクション
  executeSql: (sql: string) => Promise<void>;
  downloadCsv: () => Promise<void>;
  downloadCsvLocal: () => void;
  applySort: (key: string) => Promise<void>;
  applyFilter: (columnName: string, filterValues: string[]) => Promise<void>;
  loadMoreData: () => Promise<void>;
  
  // 便利なアクション
  clearResults: () => void;
  resetPagination: () => void;
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  // 初期状態
  allData: [],
  rawData: [],
  columns: [],
  rowCount: 0,
  execTime: 0,
  sortConfig: null,
  filters: {},
  filterModal: { show: false, columnName: '', currentFilters: [] },
  currentPage: 1,
  hasMoreData: false,
  sessionId: null,
  configSettings: null,
  
  // セッター
  setAllData: (allData) => set({ allData }),
  setRawData: (rawData) => set({ rawData }),
  setColumns: (columns) => set({ columns }),
  setRowCount: (rowCount) => set({ rowCount }),
  setExecTime: (execTime) => set({ execTime }),
  setSortConfig: (sortConfig) => set({ sortConfig }),
  setFilters: (filters) => set({ filters }),
  setFilterModal: (modal) => {
    const filters = get().filters;
    const col = modal.columnName;
    set({ filterModal: { ...modal, currentFilters: modal.currentFilters ?? (filters[col] || []) } });
  },
  setCurrentPage: (currentPage) => set({ currentPage }),
  setHasMoreData: (hasMoreData) => set({ hasMoreData }),
  setSessionId: (sessionId) => set({ sessionId }),
  setConfigSettings: (configSettings) => set({ configSettings }),
  
  // SQL実行アクション
  executeSql: async (sql: string) => {
    const uiStore = useUIStore.getState();
    
    try {
      uiStore.startLoading();
      
      const res = await fetch('/api/v1/sql/cache/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      }).then(r => r.json());
      
      if (!res.success || !res.session_id) {
        uiStore.setError(new Error(res.message || 'session_idが返されませんでした'));
        uiStore.setIsError(true);
        uiStore.stopLoading();
        return;
      }
      
      set({ sessionId: res.session_id });
      const pageSize = get().configSettings?.default_page_size || 100;
      const readRes = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: res.session_id, page: 1, page_size: pageSize })
      }).then(r => r.json());
      
      if (!readRes.success || !readRes.data || !readRes.columns) {
        uiStore.setError(new Error(readRes.message || 'データ取得に失敗しました'));
        uiStore.setIsError(true);
        uiStore.stopLoading();
        return;
      }
      
      const newData = readRes.data.map((rowArr: unknown[], _idx: number) => 
        Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]]))
      );
      
      set({
        allData: newData,
        rawData: newData,
        columns: readRes.columns,
        rowCount: readRes.total_count || newData.length,
        execTime: readRes.execution_time || 0,
        currentPage: 1,
        hasMoreData: newData.length < (readRes.total_count || newData.length),
        sortConfig: null,
        filters: {},
      });
      
      uiStore.clearError();
      uiStore.stopLoading();
      
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('SQL実行に失敗しました');
      uiStore.setError(error);
      uiStore.setIsError(true);
      uiStore.stopLoading();
    }
  },
  
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const state = get();
    const uiStore = useUIStore.getState();
    
    if (state.sessionId) {
      uiStore.setIsDownloading(true);
      try {
        const res = await fetch('/api/v1/sql/cache/download/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: state.sessionId,
            filters: state.filters,
            sort_by: state.sortConfig?.key,
            sort_order: state.sortConfig?.direction?.toUpperCase() || 'ASC'
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          alert('CSVダウンロードに失敗しました: ' + errText);
          return;
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'result.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } finally {
        uiStore.setIsDownloading(false);
      }
    } else {
      get().downloadCsvLocal();
    }
  },
  
  downloadCsvLocal: () => {
    const state = get();
    if (!state.allData.length || !state.columns.length) {
      alert('データがありません');
      return;
    }
    const csvRows = [state.columns.join(',')];
    for (const row of state.allData) {
      csvRows.push(state.columns.map(col => JSON.stringify(row[col] ?? '')).join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  
  applySort: async (key: string) => {
    const state = get();
    const uiStore = useUIStore.getState();
    
    if (!state.columns.length) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (state.sortConfig && state.sortConfig.key === key && state.sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    const newSortConfig = { key, direction };
    set({ sortConfig: newSortConfig });
    
    if (state.sessionId) {
      const pageSize = state.configSettings?.default_page_size || 100;
      const readRes = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          page: 1,
          page_size: pageSize,
          sort_by: key,
          sort_order: direction.toUpperCase(),
          filters: state.filters,
        })
      }).then(r => r.json());
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]]))
        );
        set({
          allData: newData,
          columns: readRes.columns,
          rowCount: readRes.total_count || newData.length,
          execTime: readRes.execution_time || 0,
          currentPage: 1,
          hasMoreData: newData.length < (readRes.total_count || newData.length)
        });
      } else {
        set({ allData: [], columns: [], rowCount: 0, execTime: 0 });
      }
    } else {
      // フロント側でソート（rawDataを元に）
      let filtered = state.rawData;
      Object.entries(state.filters).forEach(([col, vals]) => {
        filtered = filtered.filter(row => vals.includes(String(row[col])));
      });
      const sorted = [...filtered].sort((a, b) => {
        if (a[key] === b[key]) return 0;
        if (direction === 'asc') return a[key] > b[key] ? 1 : -1;
        return a[key] < b[key] ? 1 : -1;
      });
      set({ allData: sorted });
    }
  },
  
  applyFilter: async (columnName: string, filterValues: string[]) => {
    const state = get();
    const newFilters = { ...state.filters };
    
    if (filterValues.length === 0) {
      delete newFilters[columnName];
    } else {
      newFilters[columnName] = filterValues;
    }
    
    set({ filters: newFilters });
    
    if (state.sessionId) {
      const pageSize = state.configSettings?.default_page_size || 100;
      const readRes = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          page: 1,
          page_size: pageSize,
          filters: newFilters,
          sort_by: state.sortConfig?.key,
          sort_order: state.sortConfig?.direction?.toUpperCase() || 'ASC'
        })
      }).then(r => r.json());
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]]))
        );
        set({
          allData: newData,
          columns: readRes.columns,
          rowCount: readRes.total_count || newData.length,
          execTime: readRes.execution_time || 0,
          currentPage: 1,
          hasMoreData: newData.length < (readRes.total_count || newData.length)
        });
      } else {
        set({ allData: [], columns: [], rowCount: 0, execTime: 0 });
      }
    } else {
      // フロント側でフィルタ（rawDataを元に）
      let filtered = state.rawData;
      Object.entries(newFilters).forEach(([col, vals]) => {
        filtered = filtered.filter(row => vals.includes(String(row[col])));
      });
      set({ allData: filtered });
    }
  },
  
  loadMoreData: async () => {
    const state = get();
    const uiStore = useUIStore.getState();
    
    if (!state.sessionId || uiStore.isLoadingMore || !state.hasMoreData) return;
    uiStore.setIsLoadingMore(true);
    
    try {
      const nextPage = state.currentPage + 1;
      const pageSize = state.configSettings?.default_page_size || 100;
      const readRes = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.sessionId,
          page: nextPage,
          page_size: pageSize,
          filters: state.filters,
          sort_by: state.sortConfig?.key,
          sort_order: state.sortConfig?.direction?.toUpperCase() || 'ASC'
        })
      }).then(r => r.json());
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]]))
        );
        set({
          allData: [...state.allData, ...newData],
          rawData: [...state.rawData, ...newData],
          currentPage: nextPage,
          hasMoreData: (state.allData.length + newData.length) < (readRes.total_count || 0),
        });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('データ読み込みに失敗しました');
      uiStore.setError(error);
      uiStore.setIsError(true);
    } finally {
      uiStore.setIsLoadingMore(false);
    }
  },
  
  // 便利なアクション
  clearResults: () => {
    set({
      allData: [],
      rawData: [],
      columns: [],
      rowCount: 0,
      execTime: 0,
      sortConfig: null,
      filters: {},
      currentPage: 1,
      hasMoreData: false,
      sessionId: null,
    });
  },
  
  resetPagination: () => {
    set({
      currentPage: 1,
      hasMoreData: false,
    });
  },
})); 