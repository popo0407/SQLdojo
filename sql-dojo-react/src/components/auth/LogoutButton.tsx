import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './LogoutButton.module.css';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？\n\nログアウトすると、保存されているキャッシュデータが削除されます。')) {
      setIsLoading(true);
      try {
        await logout();
        // ログアウト成功後はログインページにリダイレクト
        window.location.href = '/login';
      } catch (err) {
        console.error('ログアウトエラー:', err);
        // エラーが発生してもログインページに遷移
        window.location.href = '/login';
      }
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={styles.logoutButton}
      disabled={isLoading}
      title="ログアウト"
    >
      {isLoading ? (
        <>
          <span className={styles.spinner}></span>
          ログアウト中...
        </>
      ) : (
        <>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ログアウト
        </>
      )}
    </button>
  );
};

export default LogoutButton; 