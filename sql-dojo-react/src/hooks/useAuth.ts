import { useAuth as useAuthContext } from '../contexts/AuthContext';

/**
 * 認証関連のカスタムフック
 * AuthContextのラッパーとして機能し、追加の認証関連ロジックを提供
 */
export const useAuth = () => {
  const auth = useAuthContext();

  /**
   * 認証が必要なページかどうかをチェック
   * @param pathname 現在のパス
   * @returns 認証が必要かどうか
   */
  const isAuthRequired = (pathname: string): boolean => {
    const publicPaths = ['/login'];
    return !publicPaths.includes(pathname);
  };

  /**
   * 管理者権限が必要なページかどうかをチェック
   * @param pathname 現在のパス
   * @returns 管理者権限が必要かどうか
   */
  const isAdminRequired = (pathname: string): boolean => {
    const adminPaths = ['/admin'];
    return adminPaths.some(path => pathname.startsWith(path));
  };

  /**
   * 認証状態をチェックし、必要に応じてリダイレクト
   * @param pathname 現在のパス
   */
  const checkAuthAndRedirect = (pathname: string): void => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated && isAuthRequired(pathname)) {
        // 未認証で認証が必要なページにアクセスした場合
        window.location.href = '/login';
      } else if (auth.isAuthenticated && pathname === '/login') {
        // 認証済みでログインページにアクセスした場合
        window.location.href = '/';
      } else if (isAdminRequired(pathname) && !auth.isAdmin) {
        // 管理者権限が必要なページに一般ユーザーがアクセスした場合
        window.location.href = '/';
      }
    }
  };

  return {
    ...auth,
    isAuthRequired,
    isAdminRequired,
    checkAuthAndRedirect,
  };
}; 