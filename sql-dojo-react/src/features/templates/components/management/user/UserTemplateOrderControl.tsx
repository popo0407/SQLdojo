import React, { useCallback } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowUp, 
  faArrowDown, 
  faAngleDoubleUp, 
  faAngleDoubleDown 
} from '@fortawesome/free-solid-svg-icons';

import type { TemplateWithPreferences } from '../../../types/template';

export interface UserTemplateOrderControlProps {
  template: TemplateWithPreferences;
  templates: TemplateWithPreferences[];
  onReorder: (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => Promise<void>;
  isLoading?: boolean;
}

/**
 * ユーザーテンプレート順序変更コントロール
 * 上下移動・先頭末尾移動機能を提供
 */
export const UserTemplateOrderControl: React.FC<UserTemplateOrderControlProps> = ({
  template,
  templates,
  onReorder,
  isLoading = false
}) => {
  // 現在のインデックスを取得
  const currentIndex = templates.findIndex(t => t.template_id === template.template_id);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === templates.length - 1;

  // 順序変更処理
  const handleReorder = useCallback(async (direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (isLoading) return;
    
    try {
      await onReorder(template.template_id, direction);
    } catch (error) {
      console.error('順序変更エラー:', error);
    }
  }, [template.template_id, onReorder, isLoading]);

  // キーボードショートカット対応
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (event.shiftKey && !isFirst) {
            handleReorder('top');
          } else if (!isFirst) {
            handleReorder('up');
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (event.shiftKey && !isLast) {
            handleReorder('bottom');
          } else if (!isLast) {
            handleReorder('down');
          }
          break;
      }
    }
  }, [handleReorder, isFirst, isLast]);

  return (
    <div 
      className="template-order-control" 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      title="Ctrl+↑/↓: 1つ移動, Ctrl+Shift+↑/↓: 先頭/末尾移動"
    >
      <ButtonGroup size="sm">
        {/* 先頭に移動 */}
        <Button
          variant="outline-secondary"
          disabled={isFirst || isLoading}
          onClick={() => handleReorder('top')}
          title="先頭に移動 (Ctrl+Shift+↑)"
        >
          <FontAwesomeIcon icon={faAngleDoubleUp} />
        </Button>

        {/* 上に移動 */}
        <Button
          variant="outline-secondary"
          disabled={isFirst || isLoading}
          onClick={() => handleReorder('up')}
          title="上に移動 (Ctrl+↑)"
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </Button>

        {/* 下に移動 */}
        <Button
          variant="outline-secondary"
          disabled={isLast || isLoading}
          onClick={() => handleReorder('down')}
          title="下に移動 (Ctrl+↓)"
        >
          <FontAwesomeIcon icon={faArrowDown} />
        </Button>

        {/* 末尾に移動 */}
        <Button
          variant="outline-secondary"
          disabled={isLast || isLoading}
          onClick={() => handleReorder('bottom')}
          title="末尾に移動 (Ctrl+Shift+↓)"
        >
          <FontAwesomeIcon icon={faAngleDoubleDown} />
        </Button>
      </ButtonGroup>

      {/* 現在位置表示 */}
      <small className="text-muted ms-2">
        {currentIndex + 1} / {templates.length}
      </small>
    </div>
  );
};
