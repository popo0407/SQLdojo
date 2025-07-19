// 結果表示関連の型定義
export type TableRow = Record<string, string | number | boolean | null>;

export type InfiniteScrollData = {
  data: TableRow[];
  columns: string[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
};

export type DisplayData = {
  data: TableRow[];
  columns: string[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
}; 