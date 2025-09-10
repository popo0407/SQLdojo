import { apiClient } from './apiClient';

// 認証関連の型定義
export interface User {
  user_id: string;
  user_name: string;
  role?: string; // バックエンドのUser情報にロールが含まれているため追加
}

export interface LoginResponse {
  message: string;
  user: User;
}

export interface AdminLoginResponse {
  message: string;
}

export interface LogoutResponse {
  message: string;
}

// 認証サービス
export const authService = {
  /**
   * ユーザーログイン
   * @param userId ユーザーID
   * @returns ログイン結果
   */
  login: async (userId: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/login', { user_id: userId });
    return response;
  },

  /**
   * 管理者ログイン
   * @param password 管理者パスワード
   * @returns 管理者ログイン結果
   */
  adminLogin: async (password: string): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>('/admin/login', { password });
    return response;
  },

  /**
   * ログアウト
   * @returns ログアウト結果
   */
  logout: async (): Promise<LogoutResponse> => {
    const response = await apiClient.post<LogoutResponse>('/logout', {});
    return response;
  },

  /**
   * 現在のユーザー情報を取得
   * @returns ユーザー情報
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response;
  },

  /**
   * 現在のユーザーのキャッシュをクリア
   * @returns クリア結果
   */
  cleanupCurrentUserCache: async (): Promise<void> => {
    await apiClient.post<void>('/sql/cache/current-user', {}, 'DELETE');
  }
}; 