import { create } from 'zustand';
import { editor, Selection } from 'monaco-editor';
import { apiClient } from '../api/apiClient';
import { useUIStore } from './useUIStore';
import { useResultsStore } from './useResultsStore';

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
  formatSql: () => Promise<void>;
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
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してSQL実行
    await resultsStore.executeSql(state.sql);
  },
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してCSVダウンロード
    await resultsStore.downloadCsv();
  },
  applySort: async (key: string) => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してソート
    await resultsStore.applySort(key);
  },
  applyFilter: async (columnName: string, filterValues: string[]) => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してフィルタ
    await resultsStore.applyFilter(columnName, filterValues);
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
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してデータ読み込み
    await resultsStore.loadMoreData();
  },
  formatSql: async () => {
    const { sql, editor } = get();
    const uiStore = useUIStore.getState();
    
    if (!sql.trim()) {
      alert('SQLが空です');
      return;
    }
    
    try {
      uiStore.startLoading();
      
      const result = await apiClient.formatSQL(sql);
      
      if (result.success && result.formatted_sql) {
        set({ sql: result.formatted_sql });
        if (editor) {
          editor.setValue(result.formatted_sql);
          editor.focus();
        }
      } else {
        throw new Error(result.error_message || 'SQL整形に失敗しました');
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('SQL整形に失敗しました');
      uiStore.setError(errorObj);
      uiStore.setIsError(true);
      throw error;
    } finally {
      uiStore.stopLoading();
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