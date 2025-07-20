import React, { useEffect } from 'react';
import { Card } from 'react-bootstrap';
import { ParameterForm } from './ParameterForm';
import { useParameterStore } from '../../stores/useParameterStore';
import { useEditorStore } from '../../stores/useEditorStore';

/**
 * パラメータフォームのコンテナコンポーネント
 * SQLの変更を監視し、プレースホルダーを検出してフォームを動的生成
 */
export const ParameterContainer: React.FC = () => {
  const { sql } = useEditorStore();
  const { 
    currentPlaceholders, 
    values, 
    setValue, 
    updatePlaceholders 
  } = useParameterStore();

  // SQL変更時にプレースホルダーを更新
  useEffect(() => {
    updatePlaceholders(sql);
  }, [sql, updatePlaceholders]);

  // プレースホルダーがない場合は何も表示しない
  if (currentPlaceholders.length === 0) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Header className="py-2">
        <h6 className="mb-0">
          <i className="fas fa-edit me-2"></i>
          パラメータ入力
        </h6>
      </Card.Header>
      <Card.Body className="py-2">
        {currentPlaceholders.map((placeholder) => (
          <ParameterForm
            key={placeholder.displayName}
            placeholder={placeholder}
            value={values[placeholder.displayName] || ''}
            onChange={(value) => setValue(placeholder.displayName, value)}
          />
        ))}
      </Card.Body>
    </Card>
  );
}; 