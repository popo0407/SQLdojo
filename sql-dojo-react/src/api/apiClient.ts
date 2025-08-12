import type { FilterConfig } from '../types/common';
import { API_CONFIG } from '../config/api';

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
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      credentials: 'include', // セッションCookieを含める
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
      throw new ApiError({ message: errorMessage, detail: errorData });
    }
    
    return response.json() as Promise<T>;
  },

  post: async <T>(endpoint: string, body: unknown, method: string = 'POST'): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method,
      credentials: 'include', // セッションCookieを含める
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
      throw new ApiError({ message: errorMessage, detail: errorData });
    }
    
    return response.json() as Promise<T>;
  },

  // SQL整形API
  formatSQL: async (sql: string): Promise<SQLFormatResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
    const response = await fetch(`${API_CONFIG.BASE_URL}/sql/format`, {
      method: 'POST',
      credentials: 'include', // セッションCookieを含める
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || 'SQL整形に失敗しました';
      throw new ApiError({ message: errorMessage, detail: errorData });
    }

    return response.json() as Promise<SQLFormatResponse>;
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
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
      throw new ApiError({ message: errorMessage, detail: errorData });
    }
    
    return response.json();
  },

  // CSVダウンロード（session_idベースに変更）
  downloadCsv: async (sessionId: string, filters?: FilterConfig, sortBy?: string, sortOrder?: string): Promise<Blob> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
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
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || 'CSVダウンロードに失敗しました';
      throw new ApiError({ message: errorMessage, detail: errorData });
    }

    return response.blob();
  },
}; 