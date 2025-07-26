import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faSave, faTimes, faCode } from '@fortawesome/free-solid-svg-icons';

import type { TemplateWithPreferences } from '../../../types/template';

export interface UserTemplateEditModalProps {
  template: TemplateWithPreferences;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: TemplateWithPreferences) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ユーザーテンプレート編集モーダル
 * テンプレート名とSQL内容の編集が可能
 */
export const UserTemplateEditModal: React.FC<UserTemplateEditModalProps> = ({
  template,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  // フォーム状態
  const [name, setName] = useState('');
  const [sql, setSql] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // テンプレートが変更された時にフォームを初期化
  useEffect(() => {
    if (template) {
      setName(template.name);
      setSql(template.sql);
      setHasChanges(false);
      setValidationErrors([]);
    }
  }, [template]);

  // フォーム値変更検知
  useEffect(() => {
    if (template) {
      const nameChanged = name !== template.name;
      const sqlChanged = sql !== template.sql;
      setHasChanges(nameChanged || sqlChanged);
    }
  }, [name, sql, template]);

  // バリデーション
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push('テンプレート名を入力してください');
    } else if (name.trim().length > 100) {
      errors.push('テンプレート名は100文字以内で入力してください');
    }

    if (!sql.trim()) {
      errors.push('SQL内容を入力してください');
    } else if (sql.trim().length > 10000) {
      errors.push('SQL内容は10,000文字以内で入力してください');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // 保存処理
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const updatedTemplate: TemplateWithPreferences = {
      ...template,
      name: name.trim(),
      sql: sql.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      await onSave(updatedTemplate);
    } catch (error) {
      console.error('テンプレート更新エラー:', error);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        '変更が保存されていません。閉じてもよろしいですか？'
      );
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  // Enter キーでの保存処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Modal 
      show={isOpen} 
      onHide={handleCancel}
      size="lg"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header>
        <Modal.Title>
          <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
          テンプレート編集
        </Modal.Title>
        <Button 
          variant="link" 
          className="btn-close-custom"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      </Modal.Header>

      <Modal.Body>
        {/* バリデーションエラー */}
        {validationErrors.length > 0 && (
          <Alert variant="danger">
            <ul className="mb-0">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Form onKeyDown={handleKeyDown}>
          {/* テンプレート名 */}
          <Form.Group className="mb-3">
            <Form.Label>
              テンプレート名 <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="テンプレート名を入力してください"
              disabled={isLoading}
              maxLength={100}
            />
            <Form.Text className="text-muted">
              {name.length}/100文字
            </Form.Text>
          </Form.Group>

          {/* SQL内容 */}
          <Form.Group className="mb-3">
            <Form.Label>
              <FontAwesomeIcon icon={faCode} className="me-2" />
              SQL内容 <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={12}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SQL文を入力してください"
              disabled={isLoading}
              className="font-monospace"
              style={{ fontSize: '14px' }}
            />
            <Form.Text className="text-muted">
              {sql.length}/10,000文字 | Ctrl+Enter で保存
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <div>
          {hasChanges && (
            <small className="text-warning">
              <FontAwesomeIcon icon={faEdit} className="me-1" />
              未保存の変更があります
            </small>
          )}
        </div>
        
        <div className="d-flex gap-2">
          <Button 
            variant="secondary" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="me-1" />
            キャンセル
          </Button>
          
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                保存中...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="me-1" />
                保存
              </>
            )}
          </Button>
        </div>
      </Modal.Footer>

      <style>
        {`
          .btn-close-custom {
            position: absolute;
            top: 1rem;
            right: 1rem;
            z-index: 1;
            padding: 0.25rem;
            color: #6c757d;
            border: none;
            background: none;
          }
          .btn-close-custom:hover {
            color: #dc3545;
          }
        `}
      </style>
    </Modal>
  );
};
