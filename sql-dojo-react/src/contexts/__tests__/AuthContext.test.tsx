import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, type Mocked } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../api/authService';
import { storageService } from '../../services/StorageService';

// authServiceのモック
vi.mock('../../api/authService');
const mockAuthService = authService as unknown as Mocked<typeof authService>;

// テスト用コンポーネント
const TestComponent = () => {
  const { isAuthenticated, user, isAdmin, isLoading, login, adminLogin, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="admin">{isAdmin.toString()}</div>
      <div data-testid="user">{user?.user_id || 'null'}</div>
      <button onClick={() => login('testuser')} data-testid="login-btn">Login</button>
      <button onClick={() => adminLogin('adminpass')} data-testid="admin-login-btn">Admin Login</button>
      <button onClick={() => logout()} data-testid="logout-btn">Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // ストレージをクリア
    storageService.clearAll();
    
    // モックをリセット
    vi.clearAllMocks();
    
    // デフォルトのモック実装
    mockAuthService.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    mockAuthService.login.mockResolvedValue({ message: 'Login successful', user: { user_id: 'testuser', user_name: 'Test User' } });
    mockAuthService.adminLogin.mockResolvedValue({ message: 'Admin login successful' });
    mockAuthService.logout.mockResolvedValue({ message: 'Logout successful' });
    mockAuthService.cleanupCurrentUserCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    storageService.clearAll();
  });

  describe('初期化', () => {
    it('初期状態では認証されていない', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('admin')).toHaveTextContent('false');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('既存のセッションから認証状態を復元する', async () => {
      // 事前にセッションを設定
      storageService.setUser({ user_id: 'existinguser', user_name: 'Existing User' });
      storageService.setAdmin(true);
      
      mockAuthService.getCurrentUser.mockResolvedValue({ user_id: 'existinguser', user_name: 'Existing User' });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('admin')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('existinguser');
    });
  });

  describe('ユーザーログイン', () => {
    it('正常にログインできる', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user')).toHaveTextContent('testuser');
        expect(screen.getByTestId('admin')).toHaveTextContent('false');
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('testuser');
      expect(storageService.getUser()).toEqual({ user_id: 'testuser', user_name: 'Test User' });
      expect(storageService.isAuthenticated()).toBe(true);
    });

    it('ログインエラー時に適切に処理する', async () => {
      const user = userEvent.setup();
      mockAuthService.login.mockRejectedValue(new Error('Login failed'));
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('login-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });
    });
  });

  describe('管理者ログイン', () => {
    it('正常に管理者ログインできる', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('admin-login-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('admin')).toHaveTextContent('true');
      });

      expect(mockAuthService.adminLogin).toHaveBeenCalledWith('adminpass');
      expect(storageService.isAdmin()).toBe(true);
    });

    it('管理者ログインエラー時に適切に処理する', async () => {
      const user = userEvent.setup();
      mockAuthService.adminLogin.mockRejectedValue(new Error('Admin login failed'));
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('admin-login-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('admin')).toHaveTextContent('false');
      });
    });
  });

  describe('ログアウト', () => {
    it('正常にログアウトできる', async () => {
      const user = userEvent.setup();
      
      // 事前にログイン状態にする
      storageService.setUser({ user_id: 'testuser', user_name: 'Test User' });
      storageService.setAdmin(true);
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('logout-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('admin')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockAuthService.cleanupCurrentUserCache).toHaveBeenCalled();
      expect(storageService.getUser()).toBeNull();
      expect(storageService.isAuthenticated()).toBe(false);
      expect(storageService.isAdmin()).toBe(false);
      expect(localStorage.getItem('userPreferences')).toBeNull();
      expect(localStorage.getItem('sqlToCopy')).toBeNull();
    });

    it('ログアウトエラー時でもローカルクリアは実行する', async () => {
      const user = userEvent.setup();
      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));
      
      // 事前にログイン状態にする
      storageService.setUser({ user_id: 'testuser', user_name: 'Test User' });
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      await act(async () => {
        await user.click(screen.getByTestId('logout-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      // ローカルストレージはクリアされている
      expect(storageService.getUser()).toBeNull();
      expect(storageService.isAuthenticated()).toBe(false);
    });
  });
}); 