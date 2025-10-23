// API型定義
import type { TableRow } from './common';

export interface SqlExecutionResult {
  success: boolean;
  data?: TableRow[];
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
  current_count?: number;  // 現在取得済みレコード数
  progress_percentage?: number;  // 進捗率 (0-100)
  data?: TableRow[];
  columns?: string[];
  row_count?: number;
  execution_time?: number;
  status?: 'processing' | 'completed' | 'error' | 'cancelled';  // 非同期実行状態
}

// 進捗状態レスポンス型
export interface SessionStatusResponse {
  session_id: string;
  status: 'streaming' | 'completed' | 'error' | 'cancelled';
  phase?: 'executing' | 'downloading' | 'completed';  // 処理段階
  total_count: number;
  processed_count: number;
  progress_percentage: number;
  message?: string;
  error_message?: string;  // エラーメッセージ
}

// 設定型定義
export interface ConfigSettings {
  default_page_size?: number;
  max_records_for_display?: number;
  max_records_for_csv_download?: number;
  max_records_for_excel_download?: number;
  max_records_for_clipboard_copy?: number;
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

// カラム型定義
export interface Column {
  name: string;
  data_type: string;
  comment: string | null;
}

// テーブル型定義
export interface Table {
  name: string;
  schema_name: string;
  table_type: 'TABLE' | 'VIEW';
  comment: string | null;
  columns: Column[];
}

// スキーマ型定義
export interface Schema {
  name: string;
  comment: string | null;
  tables: Table[];
  schema_hidden?: boolean; // スキーマが非表示だがテーブルが表示される場合のフラグ
}

// キャッシュ機能用の型定義
export interface CacheSQLResponse {
  success: boolean;
  session_id?: string;
  total_count?: number;
  current_count?: number;  // 現在取得済みレコード数
  progress_percentage?: number;  // 進捗率 (0-100)
  processed_rows?: number;
  execution_time?: number;
  message?: string;
  error_message?: string;
  // 表示制限時はdataとcolumnsが含まれない
  data?: TableRow[];
  columns?: string[];
}

export interface CacheReadResponse {
  success: boolean;
  data?: TableRow[];
  columns?: string[];
  total_count?: number;
  current_count?: number;  // 現在取得済みレコード数
  progress_percentage?: number;  // 進捗率 (0-100)
  page?: number;
  page_size?: number;
  total_pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  session_info?: Record<string, unknown>;
  execution_time?: number;
  error_message?: string;
  message?: string;
}