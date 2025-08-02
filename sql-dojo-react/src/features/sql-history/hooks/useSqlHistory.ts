/**
 * SQL実行履歴のデータ管理フック
 * キャッシュ機能とAPI通信を統合管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SqlHistoryResponse } from '../types/sqlHistory';
import { sqlHistoryApi } from '../api/sqlHistoryApi';
import { cacheManager } from '../utils/cacheManager';

/**
 * SQL履歴データ管理のカスタムフック
 */
export const useSqlHistory = () => {
  const [data, setData] = useState<SqlHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // React StrictMode対応のための初期化ガード
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * キャッシュから初期データを読み込み
   */
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = cacheManager.getFromCache();
      if (cachedData) {
        console.log('SQL履歴: キャッシュからデータを読み込みました', {
          totalCount: cachedData.total_count,
          cacheInfo: cacheManager.getCacheInfo()
        });
        setData(cachedData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('キャッシュからの読み込みエラー:', error);
      return false;
    }
  }, []);

  /**
   * 最新データをAPIから取得
   */
  const refreshData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('SQL履歴: APIから最新データを取得中...');
      const response = await sqlHistoryApi.getSqlHistory();
      
      if (!mountedRef.current) return;
      
      setData(response);
      cacheManager.saveToCache(response);
      
      console.log('SQL履歴: 最新データを取得しました', {
        totalCount: response.total_count,
        logsCount: response.logs.length
      });
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : '履歴の取得に失敗しました';
      console.error('SQL履歴取得エラー:', err);
      setError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * 初期化処理
   * キャッシュがあれば使用、なければAPIから取得
   */
  const initializeData = useCallback(async () => {
    // 既に初期化済みの場合はスキップ
    if (initializingRef.current) {
      console.log('useSqlHistory: 初期化中のためスキップ');
      return;
    }
    
    initializingRef.current = true;
    console.log('useSqlHistory: 初期化開始');
    
    try {
      // キャッシュから読み込み試行
      const hasCache = loadFromCache();
      
      // キャッシュがない場合はAPIから取得
      if (!hasCache) {
        console.log('useSqlHistory: キャッシュなし、APIから取得');
        await refreshData();
      }
    } finally {
      initializingRef.current = false;
    }
  }, [loadFromCache, refreshData]);

  /**
   * コンポーネントマウント時の初期化
   */
  useEffect(() => {
    mountedRef.current = true;
    initializeData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [initializeData]);

  /**
   * キャッシュ状態の確認
   */
  const hasCache = useCallback(() => {
    const cached = cacheManager.getFromCache();
    return !!cached;
  }, []);

  return {
    /** 履歴データ */
    data,
    /** ローディング状態 */
    loading,
    /** エラーメッセージ */
    error,
    /** データを手動更新 */
    refreshData,
    /** キャッシュの存在確認 */
    hasCache: hasCache(),
    /** キャッシュをクリア */
    clearCache: cacheManager.clearCache,
    /** キャッシュ情報を取得（デバッグ用） */
    getCacheInfo: cacheManager.getCacheInfo
  };
};
