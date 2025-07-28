import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';

interface AdminTemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, sql: string) => Promise<boolean>;
  isLoading?: boolean;
}

/**
 * 管理者用テンプレート新規作成モーダル
 * 名前とSQLの入力フォームを提供
 */
export const AdminTemplateCreateModal: React.FC<AdminTemplateCreateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [sql, setSql] = useState('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // モーダルを閉じる時の処理
  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setSql('');
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

    setIsSaving(true);
    try {
      const success = await onConfirm(name.trim(), sql.trim());
      if (success) {
        setName('');
        setSql('');
        setError('');
      } else {
        setError('テンプレートの作成に失敗しました');
      }
    } catch (error) {
      console.error('Create template error:', error);
      setError('テンプレートの作成中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton={!isSaving}>
        <Modal.Title>
          <FontAwesomeIcon icon={faPlus} className="me-2 text-primary" />
          新規共通テンプレート作成
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
              共通テンプレートとして全ユーザーが利用できます
            </Form.Text>
          </Form.Group>
        </Form>
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
              作成中...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} className="me-2" />
              作成
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
