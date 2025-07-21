// 共通の型定義
// このファイルには、複数の場所で使用される共通の型定義を配置します

// データ行の型定義
export type TableRow = Record<string, string | number | boolean | null>;

// ソート設定の型定義
export type SortConfig = { 
  key: string; 
  direction: 'asc' | 'desc' 
};

// フィルタ設定の型定義
export type FilterConfig = { 
  [columnName: string]: string[] 
};

// フィルタモーダルの状態型定義
export type FilterModalState = { 
  show: boolean; 
  columnName: string; 
  currentFilters?: string[] 
};

// セル値の型定義
export type CellValue = string | number | boolean | null; 