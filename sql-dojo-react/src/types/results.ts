// 結果表示専用の型定義
import type { TableRow, SortConfig, FilterConfig, FilterModalState } from './common';

// 後方互換性のためのエイリアス（段階的移行期間中のみ）
export type { TableRow, SortConfig, FilterConfig, FilterModalState };

// データ管理ストアの型定義
export interface ResultsDataState {
  allData: TableRow[];
  rawData: TableRow[];
  columns: string[];
  rowCount: number;
  execTime: number;
}

export interface ResultsDataActions {
  setAllData: (data: TableRow[]) => void;
  setRawData: (data: TableRow[]) => void;
  setColumns: (cols: string[]) => void;
  setRowCount: (count: number) => void;
  setExecTime: (time: number) => void;
  clearResults: () => void;
}

// フィルタ・ソートストアの型定義
export interface ResultsFilterState {
  sortConfig: SortConfig | null;
  filters: FilterConfig;
  filterModal: FilterModalState;
}

export interface ResultsFilterActions {
  setSortConfig: (config: SortConfig | null) => void;
  setFilters: (filters: FilterConfig) => void;
  setFilterModal: (modal: FilterModalState) => void;
  applySort: (key: string) => Promise<void>;
  applyFilter: (columnName: string, filterValues: string[]) => Promise<void>;
}

// ページネーションストアの型定義
export interface ResultsPaginationState {
  currentPage: number;
  hasMoreData: boolean;
}

export interface ResultsPaginationActions {
  setCurrentPage: (page: number) => void;
  setHasMoreData: (hasMore: boolean) => void;
  loadMoreData: () => Promise<void>;
  resetPagination: () => void;
}

export type PaginationStoreState = ResultsPaginationState & ResultsPaginationActions;

// エクスポートストアの型定義
export interface ResultsExportActions {
  downloadCsv: () => Promise<void>;
  downloadCsvLocal: () => void;
  downloadExcel?: () => Promise<void>;
  copyTsvToClipboard?: () => Promise<void>;
}

// セッション管理ストアの型定義
export interface ResultsSessionState {
  sessionId: string | null;
  configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null;
  // 任意ファイル名 (UI で指定)
  exportFilename?: string;
}

export interface ResultsSessionActions {
  setSessionId: (id: string | null) => void;
  setConfigSettings: (settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => void;
  setExportFilename?: (name: string) => void;
}

// SQL実行ストアの型定義
export interface ResultsExecutionState {
  progressPollingInterval: NodeJS.Timeout | null;
}

export interface ResultsExecutionActions {
  executeSql: (sql: string) => Promise<void>;
  startProgressPolling: (sessionId: string) => void;
  stopProgressPolling: () => void;
}

// 統合されたストアの型定義（Facade用）
export interface ResultsState extends 
  ResultsDataState, 
  ResultsFilterState, 
  ResultsPaginationState, 
  ResultsSessionState,
  ResultsExecutionState,
  ResultsDataActions,
  ResultsFilterActions,
  ResultsPaginationActions,
  ResultsExportActions,
  ResultsSessionActions,
  ResultsExecutionActions {} 