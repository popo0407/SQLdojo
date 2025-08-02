/**
 * SQL履歴テーブルコンポーネント
 * 履歴データをテーブル形式で表示
 */

import React, { useState, useEffect } from 'react';
import type { SqlHistoryTableProps } from '../types/sqlHistory';
import { SqlHistoryRow } from './SqlHistoryRow';

/**
 * SQL履歴テーブル
 */
export const SqlHistoryTable: React.FC<SqlHistoryTableProps> = ({ data, loading }) => {
  // SQLポップオーバーの表示状態（テンプレート機能と同様）
  const [showPopover, setShowPopover] = useState<string | null>(null);

  // Popover外クリックで閉じる処理（テンプレート機能と同様）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Popover要素自体またはその子要素をクリックした場合は何もしない
      if (target.closest('.popover') || target.closest('[data-sql-trigger]')) {
        return;
      }
      setShowPopover(null);
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  // ローディング中で、まだデータがない場合
  if (loading && data.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <div className="mt-2 text-muted">履歴を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="table-responsive mt-3">
      <table className="table table-striped table-hover">
        <thead className="table-light">
          <tr>
            <th scope="col">
              <i className="fas fa-clock me-1"></i>
              実行日時
            </th>
            <th scope="col">
              <i className="fas fa-code me-1"></i>
              SQL文
            </th>
            <th scope="col">
              <i className="fas fa-stopwatch me-1"></i>
              処理時間(秒)
            </th>
            <th scope="col">
              <i className="fas fa-check-circle me-1"></i>
              実行結果
            </th>
            <th scope="col">
              <i className="fas fa-list-ol me-1"></i>
              行数
            </th>
            <th scope="col">
              <i className="fas fa-copy me-1"></i>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                <i className="fas fa-info-circle me-2"></i>
                履歴がありません
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              // 確実に一意キーを生成（SQL履歴Row内の生成ロジックと一致）
              const uniqueKey = item.id 
                ? `sql-history-${item.id}` 
                : `sql-history-row-${index}-${Date.parse(item.timestamp)}-${item.sql.length}`;
              
              return (
                <SqlHistoryRow 
                  key={uniqueKey} 
                  item={item} 
                  index={index}
                  showPopover={showPopover}
                  onTogglePopover={setShowPopover}
                />
              );
            })
          )}
        </tbody>
      </table>
      
      {/* データ件数の表示 */}
      {data.length > 0 && (
        <div className="text-end text-muted small mt-2">
          <i className="fas fa-info-circle me-1"></i>
          {data.length.toLocaleString()}件の履歴を表示中
        </div>
      )}
    </div>
  );
};
