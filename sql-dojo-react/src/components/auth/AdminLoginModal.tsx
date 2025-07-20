import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminLoginModal.module.css';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  // モーダルが開いた時にパスワードフィールドにフォーカス
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      const passwordInput = document.getElementById('adminPassword') as HTMLInputElement;
      if (passwordInput) {
        setTimeout(() => passwordInput.focus(), 100);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await adminLogin(password);
      onClose();
      // 管理者ページにリダイレクト
      navigate('/admin');
    } catch (err: any) {
      console.error('管理者ログインエラー:', err);
      if (err.message?.includes('401') || err.message?.includes('無効')) {
        setError('管理者パスワードが正しくありません。');
      } else {
        setError('認証に失敗しました。しばらく時間をおいて再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(''); // エラーメッセージをクリア
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>管理者ログイン</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="adminPassword" className={styles.label}>
              管理者パスワード
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              onKeyPress={handleKeyPress}
              className={styles.input}
              placeholder="管理者パスワードを入力"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? '認証中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal; 