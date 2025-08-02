/**
 * SQL実行履歴機能の型定義
 * バックエンドAPIのレスポンス構造に基づいた型安全性を確保
 */

/**
 * SQL実行履歴の単一項目
 */
export interface SqlHistoryItem {
  /** 一意識別子（バックエンドで生成） */
  id?: string;
  /** 実行日時（ISO文字列形式） */
  timestamp: string;
  /** 実行されたSQL文 */
  sql: string;
  /** 処理時間（秒） */
  execution_time: number | null;
  /** 実行結果（成功/失敗） */
  success?: boolean;
  /** 結果行数 */
  row_count: number | null;
  /** ユーザーID */
  user_id?: string;
}

/**
 * SQL履歴APIのレスポンス形式
 */
export interface SqlHistoryResponse {
  /** 履歴データの配列 */
  logs: SqlHistoryItem[];
  /** 総件数 */
  total_count: number;
}

/**
 * sessionStorageキャッシュの構造
 */
export interface SqlHistoryCache {
  /** キャッシュされたデータ */
  data: SqlHistoryResponse;
  /** キャッシュ作成時刻（ミリ秒） */
  timestamp: number;
  /** 有効期限（ミリ秒） */
  expires_at: number;
}

/**
 * SQL履歴テーブルのプロパティ
 */
export interface SqlHistoryTableProps {
  /** 表示するデータ */
  data: SqlHistoryItem[];
  /** ローディング状態 */
  loading: boolean;
}

/**
 * SQL履歴行のプロパティ
 */
export interface SqlHistoryRowProps {
  /** 行データ */
  item: SqlHistoryItem;
  /** 行のインデックス */
  index: number;
  /** ポップオーバーの表示状態 */
  showPopover: string | null;
  /** ポップオーバーの表示/非表示切り替え */
  onTogglePopover: (id: string | null) => void;
}

/**
 * SQLツールチップのプロパティ
 */
export interface SqlTooltipProps {
  /** 表示するSQL文 */
  sql: string;
  /** 子要素 */
  children: React.ReactNode;
  /** ポップオーバーの表示状態 */
  show?: boolean;
  /** ポップオーバーの表示/非表示切り替え */
  onToggle?: () => void;
  /** 一意のID（ポップオーバー識別用） */
  id: string;
}

/**
 * 読み込み状況表示のプロパティ
 */
export interface LoadingStatusProps {
  /** ローディング状態 */
  loading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** キャッシュが存在するか */
  hasCache: boolean;
  /** 総件数 */
  totalCount?: number;
}

/**
 * 更新ボタンのプロパティ
 */
export interface HistoryRefreshButtonProps {
  /** 更新処理の関数 */
  onRefresh: () => void;
  /** ローディング状態 */
  loading: boolean;
  /** 追加のCSSクラス */
  className?: string;
}
