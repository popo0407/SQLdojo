import { create } from 'zustand';

// 型定義
export type SortConfig = { key: string; direction: 'asc' | 'desc' };
export type FilterConfig = { [columnName: string]: string[] };
export type TableRow = Record<string, string | number | boolean | null>;
export type ConfigSettings = { default_page_size?: number; max_records_for_csv_download?: number };

interface SqlPageState {
  sql: string;
  sortConfig: SortConfig | null;
  filters: FilterConfig;
  filterModal: { show: boolean; columnName: string; currentFilters: string[] };
  sessionId: string | null;
  currentPage: number;
  hasMoreData: boolean;
  allData: TableRow[];
  columns: string[];
  rowCount: number;
  execTime: number;
  showLimitDialog: boolean;
  limitDialogData: { totalCount: number; message: string } | null;
  isLoadingMore: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  configSettings: ConfigSettings | null;
  isConfigLoading: boolean;
  isDownloading: boolean;
  rawData: TableRow[];
  // setters
  setSql: (sql: string) => void;
  setSortConfig: (config: SortConfig | null) => void;
  setFilters: (filters: FilterConfig) => void;
  setFilterModal: (modal: { show: boolean; columnName: string }) => void;
  setSessionId: (id: string | null) => void;
  setCurrentPage: (page: number) => void;
  setHasMoreData: (hasMore: boolean) => void;
  setAllData: (data: TableRow[]) => void;
  setColumns: (cols: string[]) => void;
  setRowCount: (count: number) => void;
  setExecTime: (time: number) => void;
  setShowLimitDialog: (show: boolean) => void;
  setLimitDialogData: (data: { totalCount: number; message: string } | null) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setIsPending: (pending: boolean) => void;
  setIsError: (error: boolean) => void;
  setError: (error: Error | null) => void;
  setConfigSettings: (settings: ConfigSettings | null) => void;
  setIsConfigLoading: (loading: boolean) => void;
  setIsDownloading: (downloading: boolean) => void;
  // 新規アクション
  executeSql: () => Promise<void>;
  downloadCsv: () => Promise<void>;
  applySort: (key: string) => Promise<void>;
  applyFilter: (columnName: string, filterValues: string[]) => Promise<void>;
  downloadCsvLocal: () => void;
}

export const useSqlPageStore = create<SqlPageState>((set, get) => ({
  sql: 'SELECT * FROM ',
  sortConfig: null,
  filters: {},
  filterModal: { show: false, columnName: '', currentFilters: [] },
  sessionId: null,
  currentPage: 1,
  hasMoreData: false,
  allData: [],
  columns: [],
  rowCount: 0,
  execTime: 0,
  showLimitDialog: false,
  limitDialogData: null,
  isLoadingMore: false,
  isPending: false,
  isError: false,
  error: null,
  configSettings: null,
  isConfigLoading: true,
  isDownloading: false,
  rawData: [],
  setSql: (sql) => set({ sql }),
  setSortConfig: (sortConfig) => set({ sortConfig }),
  setFilters: (filters) => set({ filters }),
  setFilterModal: (filterModal) => set({ filterModal }),
  setSessionId: (sessionId) => set({ sessionId }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setHasMoreData: (hasMoreData) => set({ hasMoreData }),
  setAllData: (allData) => set({ allData }),
  setColumns: (columns) => set({ columns }),
  setRowCount: (rowCount) => set({ rowCount }),
  setExecTime: (execTime) => set({ execTime }),
  setShowLimitDialog: (showLimitDialog) => set({ showLimitDialog }),
  setLimitDialogData: (limitDialogData) => set({ limitDialogData }),
  setIsLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setIsPending: (isPending) => set({ isPending }),
  setIsError: (isError) => set({ isError }),
  setError: (error) => set({ error }),
  setConfigSettings: (configSettings) => set({ configSettings }),
  setIsConfigLoading: (isConfigLoading) => set({ isConfigLoading }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  // SQL実行アクション
  executeSql: async () => {
    const state = get();
    // --- 旧実装: /sql/execute を直接呼ぶ（不要・削除予定） ---
    /*
    try {
      const res = await fetch('/api/v1/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: state.sql })
      }).then(r => r.json());
      if (!res.success && res.message && res.total_count) {
        set({
          sessionId: res.session_id || null,
          showLimitDialog: true,
          limitDialogData: {
            totalCount: res.total_count,
            message: res.message
          }
        });
        set({ isPending: false });
        return;
      }
      // 追加: session_idがなくてもdata/columnsがあれば直接セット
      if (res.success && res.data && res.columns) {
        set({
          allData: res.data,
          rawData: res.data,
          columns: res.columns,
          rowCount: res.row_count || res.data.length,
          execTime: res.execution_time || 0,
          currentPage: 1,
          hasMoreData: false,
          sessionId: res.session_id || null
        });
        set({ isPending: false });
        return;
      }
      if (res.success && res.session_id) {
        set({ sessionId: res.session_id });
        const pageSize = state.configSettings?.default_page_size || 100;
        const readRes = await fetch('/api/v1/sql/cache/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: res.session_id, page: 1, page_size: pageSize })
        }).then(r => r.json());
        if (readRes.success && readRes.data && readRes.columns) {
          const newData = readRes.data.map((rowArr: any[], idx: number) => Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]])));
          set({
            allData: newData,
            rawData: newData,
            columns: readRes.columns,
            rowCount: readRes.total_count || newData.length,
            execTime: readRes.execution_time || 0,
            currentPage: 1,
            hasMoreData: newData.length < (readRes.total_count || newData.length)
          });
        } else {
          set({ allData: [], rawData: [], columns: [], rowCount: 0, execTime: 0 });
        }
      }
      set({ isPending: false });
    } catch (err: any) {
      set({ isPending: false, isError: true, error: err });
    }
    */
    // --- 新実装: /sql/cache/execute を必ず使う ---
    try {
      set({ isPending: true, isError: false, error: null });
      const res = await fetch('/api/v1/sql/cache/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: state.sql })
      }).then(r => r.json());
      if (!res.success || !res.session_id) {
        set({ isPending: false, isError: true, error: new Error(res.message || 'session_idが返されませんでした') });
        alert(res.message || 'SQL実行に失敗しました（session_idがありません）');
        return;
      }
      set({ sessionId: res.session_id });
      const pageSize = state.configSettings?.default_page_size || 100;
      const readRes = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: res.session_id, page: 1, page_size: pageSize })
      }).then(r => r.json());
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map((rowArr: any[], idx: number) => Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]])));
        set({
          allData: newData,
          rawData: newData,
          columns: readRes.columns,
          rowCount: readRes.total_count || newData.length,
          execTime: readRes.execution_time || 0,
          currentPage: 1,
          hasMoreData: newData.length < (readRes.total_count || newData.length)
        });
      } else {
        set({ allData: [], rawData: [], columns: [], rowCount: 0, execTime: 0 });
      }
      set({ isPending: false });
    } catch (err: any) {
      set({ isPending: false, isError: true, error: err });
      alert(err.message || 'SQL実行時にエラーが発生しました');
    }
  },
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const state = get();
    if (state.sessionId) {
      set({ isDownloading: true });
      try {
        const res = await fetch(`/api/v1/sql/cache/download?session_id=${state.sessionId}`);
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
        set({ isDownloading: false });
      }
    } else {
      get().downloadCsvLocal();
    }
  },
  applySort: async (key: string) => {
    const state = get();
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
        const newData = readRes.data.map((rowArr: any[], idx: number) => Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]])));
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
      // 既存のfiltersを適用
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
        const newData = readRes.data.map((rowArr: any[], idx: number) => Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]])));
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
})); 