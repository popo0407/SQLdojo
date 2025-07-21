import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, type User } from '../api/authService';
import { storageService } from '../services/StorageService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (userId: string) => Promise<void>;
  adminLogin: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 認証状態をチェック
  const checkAuthStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      
      // ストレージから管理者フラグを復元
      const isAdminFromStorage = storageService.isAdmin();
      setIsAdmin(isAdminFromStorage);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザーログイン
  const login = async (userId: string) => {
    try {
      const response = await authService.login(userId);
      setUser(response.user);
      setIsAuthenticated(true);
      setIsAdmin(false);
      
      // ストレージにユーザー情報を保存
      storageService.setUser(response.user);
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  // 管理者ログイン
  const adminLogin = async (password: string) => {
    try {
      await authService.adminLogin(password);
      setIsAdmin(true);
      
      // ストレージに管理者フラグを保存
      storageService.setAdmin(true);
    } catch (error) {
      console.error('管理者ログインエラー:', error);
      throw error;
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      // サーバーサイドのキャッシュをクリア
      await authService.cleanupCurrentUserCache();
      
      // ログアウトAPIを呼び出し
      await authService.logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
      // エラーが発生してもローカルクリアは実行
    } finally {
      // ストレージをクリア
      storageService.clearAll();
      
      // 状態をリセット
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  // 初期化時に認証状態をチェック
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      isAdmin, 
      isLoading,
      login, 
      adminLogin,
      logout, 
      checkAuthStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 