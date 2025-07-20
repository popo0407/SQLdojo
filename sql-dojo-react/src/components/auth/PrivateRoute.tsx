import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, isLoading, checkAuthAndRedirect } = useAuth();

  useEffect(() => {
    const pathname = window.location.pathname;
    checkAuthAndRedirect(pathname);
  }, [isAuthenticated, isAdmin, isLoading, checkAuthAndRedirect]);

  // ローディング中は何も表示しない
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        認証状態を確認中...
      </div>
    );
  }

  // 未認証の場合は何も表示しない（リダイレクトされる）
  if (!isAuthenticated) {
    return null;
  }

  // 管理者権限が必要で、管理者でない場合
  if (requireAdmin && !isAdmin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#c53030'
      }}>
        管理者権限が必要です。
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute; 