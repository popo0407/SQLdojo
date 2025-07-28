import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';

import type { Template } from '../../../types/template';

interface AdminTemplateEditModalProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updatedTemplate: Template) => Promise<boolean>;
}

/**
 * 管理者用テンプレート編集モーダル
 * 既存テンプレートの名前とSQLを編集
 */
export const AdminTemplateEditModal: React.FC<AdminTemplateEditModalProps> = ({
  template,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [name, setName] = useState('');
  const [sql, setSql] = useState('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // テンプレートデータでフォームを初期化
  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setSql(template.sql || '');
      setError('');
    }
  }, [template]);

  // モーダルを閉じる時の処理
  const handleClose = () => {
    if (!isSaving) {
      setError('');
      onClose();
    }
  };

  // バリデーション
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('テンプレート名は必須です');
      return false;
    }
    if (!sql.trim()) {
      setError('SQLは必須です');
      return false;
    }
    if (name.trim().length > 100) {
      setError('テンプレート名は100文字以内で入力してください');
      return false;
    }
    return true;
  };

  // 保存処理
  const handleSave = async () => {
    setError('');
    
    if (!validateForm()) {
      return;
    }

    // 変更があるかチェック
    const trimmedName = name.trim();
    const trimmedSql = sql.trim();
    
    if (trimmedName === template.name && trimmedSql === template.sql) {
      setError('変更内容がありません');
      return;
    }

    setIsSaving(true);
    try {
      const updatedTemplate: Template = {
        ...template,
        name: trimmedName,
        sql: trimmedSql
      };
      
      const success = await onConfirm(updatedTemplate);
      if (!success) {
        setError('テンプレートの更新に失敗しました');
      }
    } catch (error) {
      console.error('Update template error:', error);
      setError('テンプレートの更新中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton={!isSaving}>
        <Modal.Title>
          <FontAwesomeIcon icon={faEdit} className="me-2 text-primary" />
          共通テンプレート編集
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            <strong>エラー:</strong> {error}
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>
              テンプレート名 <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="わかりやすいテンプレート名を入力"
              disabled={isSaving}
              maxLength={100}
            />
            <Form.Text className="text-muted">
              {name.length}/100文字 (すべてのユーザーに表示されます)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              SQL <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={10}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SQLを入力してください"
              disabled={isSaving}
              style={{ 
                fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                fontSize: '14px'
              }}
            />
            <Form.Text className="text-muted">
              変更内容は全ユーザーに反映されます
            </Form.Text>
          </Form.Group>
        </Form>

        {template && (
          <div className="bg-light p-3 rounded">
            <small className="text-muted">
              <strong>元のテンプレート:</strong> {template.name}
            </small>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleClose}
          disabled={isSaving}
        >
          <FontAwesomeIcon icon={faTimes} className="me-2" />
          キャンセル
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={isSaving || !name.trim() || !sql.trim()}
        >
          {isSaving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              更新中...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} className="me-2" />
              更新
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
