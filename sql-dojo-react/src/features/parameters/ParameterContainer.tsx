import React, { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import { ParameterForm } from './ParameterForm';
import { useTabStore } from '../../stores/useTabStore';

interface ParameterContainerProps {
  tabId: string;
}

/**
 * パラメータフォームのコンテナコンポーネント（タブ対応版）
 * 特定のタブのパラメータ状態を表示・編集
 */
export const ParameterContainer: React.FC<ParameterContainerProps> = ({ tabId }) => {
  const { getTab, setTabParameterValue } = useTabStore();
  const tab = getTab(tabId);

  // 折りたたみ状態の管理
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!tab) {
    return null;
  }

  const { currentPlaceholders, values } = tab.parameterState;

  // プレースホルダーがない場合は何も表示しない
  if (currentPlaceholders.length === 0) {
    return null;
  }

  // 折りたたみの切り替え
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // パラメータ値の変更ハンドラー
  const handleParameterChange = (key: string, value: string | string[]) => {
    setTabParameterValue(tabId, key, value);
  };

  return (
    <Card className="mb-3">
      <Card.Header className="py-2 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h6 className="mb-0 me-2">
            <i className="fas fa-edit me-2"></i>
            パラメータ入力
          </h6>
          {currentPlaceholders.length > 0 && (
            <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
              {currentPlaceholders.length}
            </span>
          )}
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={toggleCollapse}
          className="border-0"
          style={{ 
            padding: '2px 6px',
            fontSize: '0.75rem'
          }}
          title={isCollapsed ? "パラメータ入力を展開" : "パラメータ入力を最小化"}
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
        </Button>
      </Card.Header>
      {!isCollapsed && (
        <Card.Body className="py-2">
          {currentPlaceholders.map((placeholder) => {
            // 複数要素のパラメータかどうかを判定
            const isMultiType = placeholder.type === 'multi-text' || placeholder.type === 'multi-text-quoted';
            // 適切なデフォルト値を設定
            const defaultValue = isMultiType ? [] : '';
            const currentValue = values[placeholder.displayName] || defaultValue;
            
            return (
              <ParameterForm
                key={placeholder.displayName}
                placeholder={placeholder}
                value={currentValue}
                onChange={(value) => handleParameterChange(placeholder.displayName, value)}
              />
            );
          })}
        </Card.Body>
      )}
      {isCollapsed && currentPlaceholders.length > 0 && (
        <Card.Body className="py-1" style={{ backgroundColor: '#f8f9fa' }}>
          <small className="text-muted">
            {currentPlaceholders.map(p => p.displayName).join(', ')}
          </small>
        </Card.Body>
      )}
    </Card>
  );
}; 