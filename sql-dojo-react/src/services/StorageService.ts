/**
 * 汎用的なストレージ管理サービス
 * localStorageを使用してセッション情報を管理
 */
export class StorageService {
  private static instance: StorageService;
  
  private constructor() {}
  
  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * ユーザー情報を保存
   */
  setUser(user: Record<string, unknown>): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
  }

  /**
   * ユーザー情報を取得
   */
  getUser(): Record<string, unknown> | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 認証状態を設定
   */
  setAuthenticated(authenticated: boolean): void {
    localStorage.setItem('isAuthenticated', authenticated.toString());
  }

  /**
   * 認証状態を取得
   */
  isAuthenticated(): boolean {
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  /**
   * 管理者フラグを設定
   */
  setAdmin(isAdmin: boolean): void {
    localStorage.setItem('isAdmin', isAdmin.toString());
  }

  /**
   * 管理者フラグを取得
   */
  isAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  }

  /**
   * 認証関連のデータをクリア
   */
  clearAuth(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isAdmin');
  }

  /**
   * アプリケーション全体のデータをクリア
   */
  clearAll(): void {
    this.clearAuth();
    localStorage.removeItem('sqlHistoryCache');
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('sqlToCopy');
  }

  /**
   * 特定のキーの値を設定
   */
  setItem(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * 特定のキーの値を取得
   */
  getItem<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * 特定のキーを削除
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}

// シングルトンインスタンスをエクスポート
export const storageService = StorageService.getInstance(); 