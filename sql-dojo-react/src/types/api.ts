// API型定義
export interface SqlExecutionResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  row_count?: number;
  execution_time?: number;
  error_message?: string;
  sql: string;
  session_id?: string;
  total_count?: number;
  processed_rows?: number;
  message?: string;
}

// SQL実行レスポンス型（session_id取得専用）
export interface ExecuteSqlResponse {
  success: boolean;
  session_id?: string;
  message?: string;
  error_message?: string;
  total_count?: number;
  data?: any[];
  columns?: string[];
  row_count?: number;
  execution_time?: number;
}

// 設定型定義
export interface ConfigSettings {
  default_page_size?: number;
  max_records_for_display?: number;
  max_records_for_csv_download?: number;
}

export interface SqlValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface SqlFormatResult {
  formatted_sql: string;
  success: boolean;
  error_message?: string;
}

export interface SqlCompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insert_text?: string;
  sort_text?: string;
}

export interface SqlCompletionResult {
  suggestions: SqlCompletionItem[];
  is_incomplete: boolean;
}

export interface MetadataItem {
  name: string;
  type: string;
  schema?: string;
  database?: string;
  comment?: string;
  columns?: MetadataColumn[];
}

export interface MetadataColumn {
  name: string;
  type: string;
  nullable?: boolean;
  comment?: string;
}

// キャッシュ機能用の型定義
export interface CacheSQLResponse {
  success: boolean;
  session_id?: string;
  total_count?: number;
  processed_rows?: number;
  execution_time?: number;
  message?: string;
  error_message?: string;
  // 表示制限時はdataとcolumnsが含まれない
  data?: any[];
  columns?: string[];
}

export interface CacheReadResponse {
  success: boolean;
  data?: any[][];
  columns?: string[];
  total_count?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  session_info?: Record<string, any>;
  execution_time?: number;
  error_message?: string;
} 