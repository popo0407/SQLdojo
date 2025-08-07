/**
 * ロール列管理コンポーネント
 * 
 * 開発憲章準拠:
 * - 単一責任の原則: ロールの追加・削除操作のみ
 * - ユーザビリティ: 明確なフィードバックと操作性
 * - エラーハンドリング: バリデーションと適切なエラー表示
 */

import React, { useState, useCallback } from 'react';
import { Button, Form, InputGroup, Row, Col, Alert } from 'react-bootstrap';
import type { RoleColumnManagerProps } from '../../types/visibility';
import { PROTECTED_ROLES } from '../../types/visibility';

export const RoleColumnManager: React.FC<RoleColumnManagerProps> = ({
  roles,
  onAddRole,
  onDeleteRole,
}) => {
  const [newRoleName, setNewRoleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ロール追加処理
  const handleAddRole = useCallback(() => {
    const trimmedName = newRoleName.trim();
    
    // バリデーション
    if (!trimmedName) {
      setError('ロール名を入力してください');
      return;
    }
    
    if (roles.includes(trimmedName)) {
      setError('そのロール名は既に存在します');
      return;
    }
    
    // ロール追加実行
    onAddRole(trimmedName);
    setNewRoleName('');
    setError(null);
  }, [newRoleName, roles, onAddRole]);

  // Enter キーでの追加
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddRole();
    }
  }, [handleAddRole]);

  // ロール削除処理
  const handleDeleteRole = useCallback((roleName: string) => {
    if (PROTECTED_ROLES.includes(roleName)) {
      setError(`${roleName} ロールは削除できません`);
      return;
    }
    
    const confirmed = window.confirm(`ロール「${roleName}」を削除しますか？\nこのロールの設定もすべて削除されます。`);
    if (confirmed) {
      onDeleteRole(roleName);
      setError(null);
    }
  }, [onDeleteRole]);

  // 削除可能なロール一覧
  const deletableRoles = roles.filter(role => !PROTECTED_ROLES.includes(role));

  return (
    <div className="mb-3">
      <Row className="align-items-center">
        <Col md={6}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="新しいロール名を入力"
              value={newRoleName}
              onChange={(e) => {
                setNewRoleName(e.target.value);
                setError(null); // 入力時にエラーをクリア
              }}
              onKeyPress={handleKeyPress}
              isInvalid={!!error}
            />
            <Button 
              variant="primary" 
              onClick={handleAddRole}
              disabled={!newRoleName.trim()}
            >
              <i className="fas fa-plus me-1" />
              追加
            </Button>
          </InputGroup>
        </Col>
        
        <Col md={6}>
          {deletableRoles.length > 0 && (
            <div>
              <small className="text-muted me-2">削除:</small>
              {deletableRoles.map(role => (
                <Button
                  key={role}
                  variant="outline-danger"
                  size="sm"
                  className="me-1 mb-1"
                  onClick={() => handleDeleteRole(role)}
                  title={`${role} ロールを削除`}
                >
                  {role} <i className="fas fa-times ms-1" />
                </Button>
              ))}
            </div>
          )}
        </Col>
      </Row>
      
      {error && (
        <Alert variant="danger" className="mt-2 mb-0" dismissible onClose={() => setError(null)}>
          <small>{error}</small>
        </Alert>
      )}
    </div>
  );
};
