/**
 * SQLツールチップコンプーネント
 * テンプレート機能と完全同一の実装でSQL全文を表示
 */

import React from 'react';
import { OverlayTrigger, Popover, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import type { SqlTooltipProps } from '../types/sqlHistory';

/**
 * SQLツールチップコンポーネント
 * クリックでSQL全文をポップオーバーで表示（AdminTemplateList.tsxと完全一致）
 */
export const SqlTooltip: React.FC<SqlTooltipProps> = ({ 
  sql, 
  children, 
  show = false, 
  onToggle,
  id
}) => {

  // SQL文が短い場合や空の場合は普通のテキストとして表示
  if (!sql || sql.length <= 100) {
    return <>{children}</>;
  }

  // SQL内容のプレビューポップオーバー（AdminTemplateList.tsxと完全同一）
  const renderSqlTooltip = (sql: string) => (
    <Popover id={`sql-popover-${id}`} style={{ maxWidth: 'none' }}>
      <Popover.Header as="h6" className="d-flex justify-content-between align-items-center">
        SQL内容 
        <small className="text-muted">(キーボードでスクロール可能)</small>
      </Popover.Header>
      <Popover.Body>
        <div 
          ref={(el) => {
            // Popover表示時に自動フォーカス
            if (el && show) {
              setTimeout(() => el.focus(), 100);
            }
          }}
          style={{ 
            width: '70vw', 
            height: '40vh', 
            overflow: 'auto',
            fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            minWidth: '300px',
            minHeight: '100px',
            maxWidth: '800px',
            maxHeight: '500px',
            lineHeight: '1.4',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '8px',
            outline: 'none',
            cursor: 'text'
          }}
          tabIndex={0}
          onKeyDown={(e) => {
            const scrollAmount = 40;
            const element = e.currentTarget;
            
            switch(e.key) {
              case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop = Math.max(0, element.scrollTop - scrollAmount);
                break;
              case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop = Math.min(element.scrollHeight - element.clientHeight, element.scrollTop + scrollAmount);
                break;
              case 'PageUp':
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop = Math.max(0, element.scrollTop - element.clientHeight * 0.8);
                break;
              case 'PageDown':
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop = Math.min(element.scrollHeight - element.clientHeight, element.scrollTop + element.clientHeight * 0.8);
                break;
              case 'Home':
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop = 0;
                break;
              case 'End':
                e.preventDefault();
                e.stopPropagation();
                element.scrollTop = element.scrollHeight;
                break;
              case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                onToggle?.();
                break;
            }
          }}
        >
          {sql.length > 2000 ? `${sql.substring(0, 2000)}...` : sql}
        </div>
      </Popover.Body>
    </Popover>
  );

  return (
    <div className="d-flex align-items-center">
      {/* SQL省略表示 */}
      <div 
        style={{ 
          maxWidth: '400px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        <small className="text-muted" style={{ fontFamily: 'monospace' }}>
          {children}
        </small>
      </div>
      
      {/* ポップオーバートリガーボタン（AdminTemplateList.tsxと完全一致） */}
      {sql.length > 0 && (
        <OverlayTrigger
          placement="auto"
          show={show}
          overlay={renderSqlTooltip(sql)}
        >
          <Button 
            variant="link" 
            size="sm" 
            className="p-1 ms-2"
            data-sql-trigger
            onClick={() => onToggle?.()}
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </Button>
        </OverlayTrigger>
      )}
    </div>
  );
};
