/**
 * sessionStorageを使用したキャッシュ管理
 * 1時間の有効期限付きでSQL履歴データをキャッシュ
 */

import type { SqlHistoryResponse, SqlHistoryCache } from '../types/sqlHistory';

/** キャッシュのキー名 */
const CACHE_KEY = 'sqlHistoryCache';

/** キャッシュの有効期限（1時間 = 60分 * 60秒 * 1000ミリ秒） */
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * キャッシュ管理のユーティリティ
 */
export const cacheManager = {
  /**
   * キャッシュからデータを取得
   * 有効期限が切れている場合は自動的に削除してnullを返す
   * @returns キャッシュされたデータ、または null
   */
  getFromCache(): SqlHistoryResponse | null {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }
      
      const cacheData: SqlHistoryCache = JSON.parse(cached);
      
      // 有効期限チェック
      if (Date.now() > cacheData.expires_at) {
        // 期限切れの場合は削除
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error);
      // エラーが発生した場合はキャッシュをクリア
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
  },
  
  /**
   * データをキャッシュに保存
   * @param data 保存するSQL履歴データ
   */
  saveToCache(data: SqlHistoryResponse): void {
    try {
      const cacheData: SqlHistoryCache = {
        data,
        timestamp: Date.now(),
        expires_at: Date.now() + CACHE_DURATION
      };
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('キャッシュ保存エラー:', error);
      // ストレージが満杯などの場合は既存キャッシュをクリアして再試行
      try {
        sessionStorage.removeItem(CACHE_KEY);
        const cacheData: SqlHistoryCache = {
          data,
          timestamp: Date.now(),
          expires_at: Date.now() + CACHE_DURATION
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (retryError) {
        console.error('キャッシュ保存リトライ失敗:', retryError);
      }
    }
  },
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
    }
  },
  
  /**
   * キャッシュの情報を取得（デバッグ用）
   * @returns キャッシュの情報オブジェクト
   */
  getCacheInfo(): { exists: boolean; timestamp?: number; expiresAt?: number; remainingMs?: number } {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) {
        return { exists: false };
      }
      
      const cacheData: SqlHistoryCache = JSON.parse(cached);
      const now = Date.now();
      
      return {
        exists: true,
        timestamp: cacheData.timestamp,
        expiresAt: cacheData.expires_at,
        remainingMs: Math.max(0, cacheData.expires_at - now)
      };
    } catch (error) {
      console.error('キャッシュ情報取得エラー:', error);
      return { exists: false };
    }
  }
};
