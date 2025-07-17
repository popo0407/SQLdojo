import { create } from 'zustand';
import { editor, Selection } from 'monaco-editor';

// 型定義
export type SortConfig = { key: string; direction: 'asc' | 'desc' };
export type FilterConfig = { [columnName: string]: string[] };
export type TableRow = Record<string, string | number | boolean | null>;
export type ConfigSettings = { default_page_size?: number; max_records_for_csv_download?: number };

interface SqlPageState {
  sql: string;
  sortConfig: SortConfig | null;
  filters: FilterConfig;
  filterModal: { show: boolean; columnName: string; currentFilters?: string[] };
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
  editor: editor.IStandaloneCodeEditor | null;
  // サイドバー選択機能用の状態
  selectedTable: string | null;
  selectedColumns: string[];
  columnSelectionOrder: string[];
  sqlToInsert: string;
  // setters
  setSql: (sql: string) => void;
  setSortConfig: (config: SortConfig | null) => void;
  setFilters: (filters: FilterConfig) => void;
  setFilterModal: (modal: { show: boolean; columnName: string; currentFilters?: string[] }) => void;
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
  setEditor: (editor: editor.IStandaloneCodeEditor | null) => void;
  insertText: (text: string) => void;
  // サイドバー選択機能用のアクション
  toggleTableSelection: (tableName: string) => void;
  toggleColumnSelection: (tableName: string, columnName: string) => void;
  clearSelection: () => void;
  applySelectionToEditor: () => void;
  clearSqlToInsert: () => void;
  // 新規アクション
  executeSql: () => Promise<void>;
  downloadCsv: () => Promise<void>;
  applySort: (key: string) => Promise<void>;
  applyFilter: (columnName: string, filterValues: string[]) => Promise<void>;
  downloadCsvLocal: () => void;
  loadMoreData: () => Promise<void>;
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
  editor: null,
  // サイドバー選択機能用の初期値
  selectedTable: null,
  selectedColumns: [],
  columnSelectionOrder: [],
  sqlToInsert: '',
  setSql: (sql) => set({ sql }),
  setSortConfig: (sortConfig) => set({ sortConfig }),
  setFilters: (filters) => set({ filters }),
  setFilterModal: (modal) => {
    // currentFiltersが未指定ならfiltersから自動セット
    const filters = get().filters;
    const col = modal.columnName;
    set({ filterModal: { ...modal, currentFilters: modal.currentFilters ?? (filters[col] || []) } });
  },
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
  setEditor: (editor) => set({ editor }),
  insertText: (text) => {
    const { editor } = get();
    if (!editor) return;
    let selection = editor.getSelection();
    if (!selection) {
      const position = editor.getPosition();
      if (position) {
        selection = new Selection(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        );
      }
    }
    if (selection) {
      const op = {
        identifier: { major: 1, minor: 1 },
        range: selection,
        text: text,
        forceMoveMarkers: true,
      };
      editor.executeEdits('sidebar-insert', [op]);
    }
    editor.focus();
  },
  // サイドバー選択機能用のアクション実装
  toggleTableSelection: (tableName) => {
    set((state) => {
      if (state.selectedTable === tableName) {
        return {
          selectedTable: null,
          selectedColumns: [],
          columnSelectionOrder: [],
        };
      }
      return {
        selectedTable: tableName,
        selectedColumns: [],
        columnSelectionOrder: [],
      };
    });
  },
  toggleColumnSelection: (tableName, columnName) => {
    set((state) => {
      const selectedColumns = [...state.selectedColumns];
      const columnSelectionOrder = [...state.columnSelectionOrder];
      const columnIndex = selectedColumns.indexOf(columnName);

      if (columnIndex > -1) {
        // カラムの選択を解除
        selectedColumns.splice(columnIndex, 1);
        const orderIndex = columnSelectionOrder.indexOf(columnName);
        if (orderIndex > -1) {
          columnSelectionOrder.splice(orderIndex, 1);
        }
        
        return { selectedColumns, columnSelectionOrder };
      } else {
        // カラムを選択
        selectedColumns.push(columnName);
        columnSelectionOrder.push(columnName);
        
        return { selectedColumns, columnSelectionOrder };
      }
    });
  },
  clearSelection: () => {
    set({
      selectedTable: null,
      selectedColumns: [],
      columnSelectionOrder: [],
    });
  },
  applySelectionToEditor: () => {
    const { selectedTable, selectedColumns, columnSelectionOrder } = get();
    let newSql = '';

    if (selectedTable && selectedColumns.length > 0) {
      // テーブルとカラムが両方選択されている場合
      const orderedColumns = columnSelectionOrder.join(', ');
      newSql = `SELECT ${orderedColumns} FROM ${selectedTable}`;
    } else if (selectedTable) {
      // テーブルのみ選択されている場合
      newSql = `SELECT * FROM ${selectedTable}`;
    } else if (columnSelectionOrder.length > 0) {
      // カラムのみ選択されている場合
      newSql = columnSelectionOrder.join(', ');
    }

    if (newSql) {
      set({ sqlToInsert: newSql });
    }
  },
  clearSqlToInsert: () => {
    set({ sqlToInsert: '' });
  },
  // SQL実行アクション
  executeSql: async () => {
    const state = get();
    try {
      set({ isPending: true, isError: false, error: null });
      const res = await fetch('/api/v1/sql/cache/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: state.sql })
      }).then(r => r.json());
      if (!res.success || !res.session_id) {
        set({ isPending: false, isError: true, error: new Error(res.message || 'session_idが返されませんでした') });
        return;
      }
      set({ sessionId: res.session_id });
      const pageSize = state.configSettings?.default_page_size || 100;
      const readRes = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: res.session_id, page: 1, page_size: pageSize })
      }).then(r => r.json());
      if (!readRes.success || !readRes.data || !readRes.columns) {
        set({ isPending: false, isError: true, error: new Error(readRes.message || 'データ取得に失敗しました') });
        return;
      }
      const newData = readRes.data.map((rowArr: any[], idx: number) => Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]])));
      set({
        allData: newData,
        rawData: newData,
        columns: readRes.columns,
        rowCount: readRes.total_count || newData.length,
        execTime: readRes.execution_time || 0,
        currentPage: 1,
        hasMoreData: newData.length < (readRes.total_count || newData.length),
        isPending: false,
        isError: false,
        error: null
      });
    } catch (err: any) {
      set({ isPending: false, isError: true, error: err });
    }
  },
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const state = get();
    if (state.sessionId) {
      set({ isDownloading: true });
      try {
        // POSTでbodyにsession_id, filters, sort_by, sort_orderを含める
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
  loadMoreData: async () => {
    const state = get();
    if (!state.sessionId || state.isLoadingMore || !state.hasMoreData) return;
    set({ isLoadingMore: true });
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
        const newData = readRes.data.map((rowArr: any[], idx: number) => Object.fromEntries(readRes.columns.map((col: string, i: number) => [col, rowArr[i]])));
        set({
          allData: [...state.allData, ...newData],
          rawData: [...state.rawData, ...newData],
          currentPage: nextPage,
          hasMoreData: (state.allData.length + newData.length) < (readRes.total_count || 0),
          isLoadingMore: false
        });
      } else {
        set({ isLoadingMore: false });
      }
    } catch (err: any) {
      set({ isLoadingMore: false, isError: true, error: err });
    }
  },
}));

// Zustandストアのselector（派生状態）をまとめてエクスポート
// filteredData: 現在のfiltersを適用したデータ
// sortedData: filteredDataにsortConfigを適用したデータ
// pagedData: sortedDataからページネーションを適用したデータ
export const selectFilteredData = (state: SqlPageState): TableRow[] => {
  let filtered = state.rawData;
  Object.entries(state.filters).forEach(([col, vals]) => {
    filtered = filtered.filter(row => vals.includes(String(row[col])));
  });
  return filtered;
};

export const selectSortedData = (state: SqlPageState): TableRow[] => {
  const filtered = selectFilteredData(state);
  if (!state.sortConfig) return filtered;
  const { key, direction } = state.sortConfig;
  return [...filtered].sort((a, b) => {
    if (a[key] === b[key]) return 0;
    if (direction === 'asc') return a[key] > b[key] ? 1 : -1;
    return a[key] < b[key] ? 1 : -1;
  });
};

export const selectPagedData = (state: SqlPageState): TableRow[] => {
  const sorted = selectSortedData(state);
  const pageSize = state.configSettings?.default_page_size || 100;
  const start = (state.currentPage - 1) * pageSize;
  return sorted.slice(start, start + pageSize);
}; 