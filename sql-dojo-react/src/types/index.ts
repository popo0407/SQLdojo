// ===========================================
// 統合型定義ファイル
// 複数箇所で使用される型定義を一元管理
// ===========================================

// ===========================================
// 基本データ型
// ===========================================

/**
 * テーブル行データの型定義
 * データベースの行や結果セットの行を表現
 */
export type TableRow = Record<string, string | number | boolean | null>;

/**
 * セル値の型定義
 * テーブルの個々のセルに入る値の型
 */
export type CellValue = string | number | boolean | null;

/**
 * IDの型定義
 * エンティティの一意識別子
 */
export type EntityId = string | number;

// ===========================================
// UI状態関連
// ===========================================

/**
 * ローディング状態の型定義
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * ページネーション状態の型定義
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ===========================================
// ソート・フィルタ関連
// ===========================================

/**
 * ソート設定の型定義
 */
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

/**
 * フィルタ設定の型定義
 * カラム名をキーとして、フィルタ値の配列を持つ
 */
export interface FilterConfig {
  [columnName: string]: string[];
}

/**
 * 結果画面のフィルタモーダル状態
 * 列のフィルタリングUI用
 */
export interface ResultsFilterModalState {
  show: boolean;
  columnName: string;
  currentFilters?: string[];
}

/**
 * フィルタモーダル内部の状態
 * モーダル内のUI操作用
 */
export interface FilterModalState {
  selectedValues: string[];
  searchTerm: string;
  uniqueValues: string[];
  isLoading: boolean;
  error: string | null;
  isTruncated: boolean;
}

/**
 * フィルタモーダルのアクション型定義
 */
export interface FilterModalActions {
  setSelectedValues: (values: string[] | ((prev: string[]) => string[])) => void;
  setSearchTerm: (term: string) => void;
  setUniqueValues: (values: string[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsTruncated: (truncated: boolean) => void;
}

// ===========================================
// API関連
// ===========================================

/**
 * API応答の基本型
 */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: number;
}

/**
 * API エラー応答の型
 */
export interface ApiError {
  message: string;
  detail?: string;
  code?: string;
}

/**
 * HTTP メソッドの型定義
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ===========================================
// ストア関連
// ===========================================

/**
 * 基本ストア状態の型定義
 * 全ストアで共通の状態要素
 */
export interface BaseStoreState extends LoadingState {
  isInitialized: boolean;
}

/**
 * 基本ストアアクションの型定義
 * 全ストアで共通のアクション
 */
export interface BaseStoreActions {
  reset: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ===========================================
// モーダル・ダイアログ関連
// ===========================================

/**
 * モーダルの基本状態
 */
export interface ModalState {
  isOpen: boolean;
}

/**
 * 確認ダイアログの状態
 */
export interface ConfirmDialogState extends ModalState {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

// ===========================================
// ユーティリティ型
// ===========================================

/**
 * 選択可能なアイテムの型定義
 */
export interface SelectableItem {
  id: EntityId;
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * 日付範囲の型定義
 */
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * 座標の型定義
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * サイズの型定義
 */
export interface Size {
  width: number;
  height: number;
}

// ===========================================
// 型ガードユーティリティ
// ===========================================

/**
 * 値がnullまたはundefinedでないかチェック
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 値が空文字列でないかチェック
 */
export function isNotEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * APIエラーかどうかをチェック
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}
