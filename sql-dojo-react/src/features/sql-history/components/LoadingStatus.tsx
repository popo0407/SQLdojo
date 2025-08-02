/**
 * 読み込み状況表示コンポーネント
 * ローディング、エラー、キャッシュ状態を表示
 */

import React from 'react';
import type { LoadingStatusProps } from '../types/sqlHistory';

/**
 * SQL履歴の読み込み状況表示
 */
export const LoadingStatus: React.FC<LoadingStatusProps> = ({
  loading,
  error,
  hasCache,
  totalCount
}) => {
  // エラーがある場合
  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center" role="alert">
        <i className="fas fa-exclamation-triangle me-2"></i>
        <div>
          <strong>エラー:</strong> {error}
        </div>
      </div>
    );
  }

  // ローディング中の場合
  if (loading) {
    return (
      <div className="alert alert-info d-flex align-items-center" role="alert">
        <div className="spinner-border spinner-border-sm me-2" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <div>最新の履歴を読み込み中...</div>
      </div>
    );
  }

  // キャッシュから表示している場合の通知
  if (hasCache && totalCount !== undefined) {
    return (
      <div className="alert alert-success d-flex align-items-center" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        <div>
          キャッシュされた履歴を表示中（{totalCount.toLocaleString()}件）。
          最新の情報を取得するには更新ボタンを押してください。
        </div>
      </div>
    );
  }

  // データが正常に読み込まれた場合
  if (totalCount !== undefined) {
    return (
      <div className="alert alert-success d-flex align-items-center" role="alert">
        <i className="fas fa-check-circle me-2"></i>
        <div>
          最新の履歴を読み込みました。件数: {totalCount.toLocaleString()}件
        </div>
      </div>
    );
  }

  // 何も表示しない（初期状態）
  return null;
};
