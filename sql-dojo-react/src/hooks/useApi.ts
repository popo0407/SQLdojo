/**
 * API通信用共通フック
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: API通信の共通ロジックのみを担当
 * - DRY原則: 重複したfetch処理を統合
 * - エラーハンドリング: 一貫したエラー処理
 */

import { useCallback } from 'react';

const DEFAULT_API_BASE_URL = '/api/v1';

interface UseApiOptions {
  baseUrl?: string;
}

export const useApi = ({ baseUrl = DEFAULT_API_BASE_URL }: UseApiOptions = {}) => {
  /**
   * 認証付きfetch処理
   */
  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const fullUrl = `${baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      // HTTP エラーの場合は詳細情報を含むエラーを投げる
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // JSONパースエラーは無視してデフォルトメッセージを使用
        }
        
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      // ネットワークエラーやその他のエラー
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('不明なエラーが発生しました');
    }
  }, [baseUrl]);

  /**
   * JSON取得用のヘルパー
   */
  const fetchJson = useCallback(async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetchWithAuth(endpoint, options);
    return response.json() as Promise<T>;
  }, [fetchWithAuth]);

  /**
   * GET リクエスト
   */
  const get = useCallback(<T>(endpoint: string): Promise<T> => {
    return fetchJson<T>(endpoint, { method: 'GET' });
  }, [fetchJson]);

  /**
   * POST リクエスト
   */
  const post = useCallback(<T>(endpoint: string, data?: unknown): Promise<T> => {
    return fetchJson<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [fetchJson]);

  /**
   * PUT リクエスト
   */
  const put = useCallback(<T>(endpoint: string, data?: unknown): Promise<T> => {
    return fetchJson<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }, [fetchJson]);

  /**
   * DELETE リクエスト
   */
  const del = useCallback(<T>(endpoint: string): Promise<T> => {
    return fetchJson<T>(endpoint, { method: 'DELETE' });
  }, [fetchJson]);

  return {
    fetchWithAuth,
    fetchJson,
    get,
    post,
    put,
    delete: del,
  };
};
