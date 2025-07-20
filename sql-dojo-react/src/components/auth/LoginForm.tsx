import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './LoginForm.module.css';

const LoginForm: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(userId);
      // ログイン成功後はホームページにリダイレクト
      window.location.href = '/';
    } catch (err: any) {
      console.error('ログインエラー:', err);
      if (err.message?.includes('401') || err.message?.includes('無効')) {
        setError('ユーザーIDが登録されていないか、IDに間違いがあります。');
      } else {
        setError('ログインに失敗しました。しばらく時間をおいて再度お試しください。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserId(e.target.value);
    if (error) setError(''); // エラーメッセージをクリア
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>SQL Dojo</h1>
        <p className={styles.subtitle}>ユーザーIDを入力してログインしてください</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="userId" className={styles.label}>
              ユーザーID
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              className={styles.input}
              placeholder="ユーザーIDを入力"
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !userId.trim()}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className={styles.help}>
          <p>ユーザーIDがわからない場合は、システム管理者にお問い合わせください。</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 