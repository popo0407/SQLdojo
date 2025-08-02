/**
 * SQL履歴行コンポーネント
 * テーブルの各行を表示する
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SqlHistoryRowProps } from '../types/sqlHistory';
import { SqlTooltip } from './SqlTooltip';
import { formatISODateTime } from '../utils/dateFormat';
import { copyToEditor, truncateSql, isValidSqlForCopy } from '../utils/sqlCopyHandler';

/**
 * SQL履歴テーブルの行コンポーネント
 */
export const SqlHistoryRow: React.FC<SqlHistoryRowProps> = ({ 
  item, 
  index, 
  showPopover, 
  onTogglePopover 
}) => {
  const navigate = useNavigate();
  const formattedDate = formatISODateTime(item.timestamp);
  const truncatedSql = truncateSql(item.sql, 100);
  const canCopy = isValidSqlForCopy(item.sql);
  
  // 確実に一意IDを生成（テンプレート機能と同様）
  const uniqueId = item.id 
    ? `sql-history-${item.id}` 
    : `sql-history-row-${index}-${Date.parse(item.timestamp)}-${item.sql.length}`;

  const handleCopyClick = () => {
    if (canCopy) {
      copyToEditor(item.sql);
      // React Routerを使用してメインページに遷移
      navigate('/');
    }
  };

  const handlePopoverToggle = () => {
    // テンプレート機能のAdminTemplateList.tsxと完全に同じ呼び出し方式
    // setShowPopover(template.template_id) と同じパターン
    // 開閉ロジックは外クリック処理に任せる
    onTogglePopover(uniqueId);
  };

  return (
    <tr>
      {/* 実行日時 */}
      <td>{formattedDate}</td>
      
      {/* SQL文（ポップオーバー付き） */}
      <td>
        <SqlTooltip 
          sql={item.sql}
          show={showPopover === uniqueId}
          onToggle={handlePopoverToggle}
          id={uniqueId}
        >
          {truncatedSql}
        </SqlTooltip>
      </td>
      
      {/* 処理時間 */}
      <td>
        {item.execution_time !== null && item.execution_time !== undefined 
          ? item.execution_time.toFixed(3) 
          : '-'
        }
      </td>
      
      {/* 実行結果 */}
      <td>
        {item.success !== undefined ? (
          <span className={`badge ${item.success ? 'bg-success' : 'bg-danger'}`}>
            {item.success ? '成功' : '失敗'}
          </span>
        ) : (
          <span className="badge bg-secondary">不明</span>
        )}
      </td>
      
      {/* 行数 */}
      <td>
        {item.row_count !== null && item.row_count !== undefined 
          ? item.row_count.toLocaleString() 
          : '-'
        }
      </td>
      
      {/* 操作ボタン */}
      <td>
        <button 
          className="btn btn-sm btn-primary"
          onClick={handleCopyClick}
          disabled={!canCopy}
          title={canCopy ? 'エディタにコピー' : 'コピーできません'}
        >
          エディタにコピー
        </button>
      </td>
    </tr>
  );
};
