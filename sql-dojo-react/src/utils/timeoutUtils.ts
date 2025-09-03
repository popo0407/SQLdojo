/**
 * APIエンドポイントに応じたタイムアウト時間を決定するユーティリティ
 */
import { API_CONFIG } from '../config/api';

/**
 * エンドポイントに基づいて適切なタイムアウト時間を取得
 * 
 * 分類基準：
 * - 重量処理：エディタSQL実行 + ダウンロード系
 * - 中量処理：履歴・管理者・キャッシュ処理
 * - デフォルト：その他すべて
 */
export const getTimeoutForEndpoint = (endpoint: string): number => {
  // 重量処理：エディタからのSQL実行 + ダウンロード系
  if (endpoint === '/sql/execute' || 
      endpoint.includes('/download/') || 
      endpoint.includes('/export')) {
    return API_CONFIG.TIMEOUT_HEAVY_MS;
  }
  
  // 中量処理：SQL履歴、管理者データ、キャッシュフィルター・ソート
  if (endpoint.includes('/logs/') ||
      endpoint.includes('/admin/') ||
      endpoint.includes('/cache/read') ||
      endpoint.includes('/cache/unique-values')) {
    return API_CONFIG.TIMEOUT_MEDIUM_MS;
  }
  
  // デフォルト：認証、検証、フォーマット等の軽量処理
  return API_CONFIG.TIMEOUT_MS;
};

/**
 * タイムアウト分類の説明を取得（デバッグ用）
 */
export const getTimeoutCategory = (endpoint: string): string => {
  const timeout = getTimeoutForEndpoint(endpoint);
  
  if (timeout === API_CONFIG.TIMEOUT_HEAVY_MS) {
    return 'HEAVY (エディタSQL実行・ダウンロード系)';
  }
  if (timeout === API_CONFIG.TIMEOUT_MEDIUM_MS) {
    return 'MEDIUM (履歴・管理者・キャッシュ処理)';
  }
  return 'DEFAULT (軽量処理)';
};
