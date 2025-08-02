/**
 * 履歴更新ボタンコンポーネント
 * 最新データの手動取得機能を提供
 */

import React from 'react';
import type { HistoryRefreshButtonProps } from '../types/sqlHistory';

/**
 * SQL履歴更新ボタン
 */
export const HistoryRefreshButton: React.FC<HistoryRefreshButtonProps> = ({
  onRefresh,
  loading,
  className = ''
}) => {
  return (
    <button 
      className={`btn btn-outline-primary btn-sm ${className}`}
      onClick={onRefresh}
      disabled={loading}
      type="button"
    >
      {loading ? (
        <>
          <span 
            className="spinner-border spinner-border-sm me-2" 
            role="status" 
            aria-hidden="true"
          ></span>
          更新中...
        </>
      ) : (
        <>
          <i className="fas fa-sync-alt me-2"></i>
          SQL履歴更新
        </>
      )}
    </button>
  );
};
