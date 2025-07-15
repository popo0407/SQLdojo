// エラーレスポンスの型を定義
interface ApiErrorDetail {
  message: string;
  detail?: any;
}

export class ApiError extends Error {
  public readonly detail?: any;

  constructor(errorData: ApiErrorDetail) {
    super(errorData.message);
    this.name = 'ApiError';
    this.detail = errorData.detail;
  }
}

// ソート設定の型
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// フィルタ設定の型
type FilterConfig = {
  [columnName: string]: string[];
};

// 汎用的なAPIクライアント
export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`/api/v1${endpoint}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
      throw new ApiError({ message: errorMessage, detail: errorData });
    }
    
    return response.json() as Promise<T>;
  },

  post: async <T, U>(endpoint: string, body: U): Promise<T> => {
    const response = await fetch(`/api/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
      throw new ApiError({ message: errorMessage, detail: errorData });
    }
    
    return response.json() as Promise<T>;
  },

  // 無限スクロール用のデータ読み込み
  loadMoreData: async (
    sessionId: string,
    page: number,
    filters?: FilterConfig,
    sortConfig?: SortConfig | null
  ) => {
    const response = await fetch(`/api/v1/sql/cache/read`, {
      method: 'POST',
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || `API Error: ${response.statusText}`;
      throw new ApiError({ message: errorMessage, detail: errorData });
    }
    
    return response.json();
  },

  // CSVダウンロード（session_idベースに変更）
  downloadCsv: async (sessionId: string) => {
    const response = await fetch(`/api/v1/sql/cache/download/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      }),
    });
    return response;
  },
}; 