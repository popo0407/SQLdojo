/**
 * 表示制御用チェックボックスコンポーネント
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: チェックボックスの表示と状態管理のみ
 * - React最適化: React.memo による不要な再レンダリング防止
 * - アクセシビリティ: 適切なARIA属性
 */

import React, { memo } from 'react';
import { Form } from 'react-bootstrap';
import type { VisibilityCheckboxProps } from '../../types/visibility';

const VisibilityCheckboxComponent: React.FC<VisibilityCheckboxProps> = ({
  objectName,
  roleName,
  isVisible,
  onChange,
}) => {
  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(objectName, roleName, event.target.checked);
  }, [objectName, roleName, onChange]);

  return (
    <Form.Check
      type="checkbox"
      checked={isVisible}
      onChange={handleChange}
      className="text-center"
      aria-label={`${objectName} の ${roleName} ロールでの表示設定`}
      data-testid={`visibility-checkbox-${objectName}-${roleName}`}
    />
  );
};

// パフォーマンス最適化: props が変更されない限り再レンダリングを防ぐ
export const VisibilityCheckbox = memo(VisibilityCheckboxComponent);
