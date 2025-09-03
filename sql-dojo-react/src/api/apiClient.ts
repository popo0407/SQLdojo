import type { FilterConfig } from '../types/common';
import { API_CONFIG } from '../config/api';
import { getTimeoutForEndpoint } from '../utils/timeoutUtils';

// エラーレスポンスの型を定義
interface ApiErrorDetail {
  message: string;
  detail?: unknown;
}

export class ApiError extends Error {
  public readonly detail?: unknown;

  constructor(errorData: ApiErrorDetail) {
    super(errorData.message);
    this.name = 'ApiError';
    this.detail = errorData.detail;
  }
}

// SQL整形レスポンスの型
interface SQLFormatResponse {
  formatted_sql: string;
  success: boolean;
  error_message?: string;
}

// 汎用的なAPIクライアント
export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const controller = new AbortController();
    const timeoutMs = getTimeoutForEndpoint(endpoint);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        credentials: 'include', // セッションCookieを含める
        signal: controller.signal,
      });
      
      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
        throw new ApiError({ message: errorMessage, detail: errorData });
      }
      
      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({ 
          message: 'リクエストがタイムアウトしました。', 
          detail: { timeout: true }
        });
      }
      throw error;
    }
  },

  post: async <T>(endpoint: string, body: unknown, method: string = 'POST'): Promise<T> => {
    const controller = new AbortController();
    const timeoutMs = getTimeoutForEndpoint(endpoint);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method,
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
        throw new ApiError({ message: errorMessage, detail: errorData });
      }
      
      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({ 
          message: 'リクエストがタイムアウトしました。処理に時間がかかっています。', 
          detail: { timeout: true }
        });
      }
      throw error;
    }
  },

  // SQL整形API
  formatSQL: async (sql: string): Promise<SQLFormatResponse> => {
    const controller = new AbortController();
    const timeoutMs = getTimeoutForEndpoint('/sql/format');
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/sql/format`, {
        method: 'POST',
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
        signal: controller.signal,
      });
      
      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || 'SQL整形に失敗しました';
        throw new ApiError({ message: errorMessage, detail: errorData });
      }

      return response.json() as Promise<SQLFormatResponse>;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({ 
          message: 'SQL整形がタイムアウトしました。', 
          detail: { timeout: true }
        });
      }
      throw error;
    }
  },

  // 無限スクロール用のデータ読み込み
  loadMoreData: async (
    sessionId: string,
    page: number,
    filters?: FilterConfig,
    sortConfig?: import('../types/results').SortConfig | null
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/sql/cache/read`, {
        method: 'POST',
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          page,
          page_size: 100, // 設定から取得するように改善可能
          filters,
          sort_by: sortConfig?.key,
          sort_order: sortConfig?.direction?.toUpperCase() || 'ASC'
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
        throw new ApiError({ message: errorMessage, detail: errorData });
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({ 
          message: 'データ読み込みがタイムアウトしました。', 
          detail: { timeout: true }
        });
      }
      throw error;
    }
  },

  // CSVダウンロード（session_idベースに変更）
  downloadCsv: async (sessionId: string, filters?: FilterConfig, sortBy?: string, sortOrder?: string): Promise<Blob> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/sql/cache/download/csv`, {
        method: 'POST',
        credentials: 'include', // セッションCookieを含める
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          filters,
          sort_by: sortBy,
          sort_order: sortOrder
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || 'CSVダウンロードに失敗しました';
        throw new ApiError({ message: errorMessage, detail: errorData });
      }

      return response.blob();
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError({ 
          message: 'CSVダウンロードがタイムアウトしました。', 
          detail: { timeout: true }
        });
      }
      throw error;
    }
  },
}; 