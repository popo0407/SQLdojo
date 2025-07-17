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
  filterModal: { show: boolean; columnName: string };
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
}

export const useSqlPageStore = create<SqlPageState>((set) => ({
  sql: 'SELECT * FROM ',
  sortConfig: null,
  filters: {},
  filterModal: { show: false, columnName: '' },
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
})); 