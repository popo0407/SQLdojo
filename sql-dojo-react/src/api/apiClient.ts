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

  // 以下を追記
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
}; 