import React, { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faTimes, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

import type { Template } from '../../../types/template';

interface AdminTemplateDeleteModalProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (templateId: string) => Promise<boolean>;
}

/**
 * 管理者用テンプレート削除モーダル
 * 削除確認と警告メッセージを表示
 */
export const AdminTemplateDeleteModal: React.FC<AdminTemplateDeleteModalProps> = ({
  template,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [error, setError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // モーダルを閉じる時の処理
  const handleClose = () => {
    if (!isDeleting) {
      setError('');
      onClose();
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!template.id) {
      setError('テンプレートIDが見つかりません');
      return;
    }

    setError('');
    setIsDeleting(true);
    
    try {
      const success = await onConfirm(template.id);
      if (!success) {
        setError('テンプレートの削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete template error:', error);
      setError('テンプレートの削除中にエラーが発生しました');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal show={isOpen} onHide={handleClose} backdrop="static">
      <Modal.Header closeButton={!isDeleting}>
        <Modal.Title>
          <FontAwesomeIcon icon={faTrash} className="me-2 text-danger" />
          共通テンプレートの削除
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            <strong>エラー:</strong> {error}
          </Alert>
        )}

        <Alert variant="warning" className="mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          <strong>警告:</strong> この操作は取り消すことができません
        </Alert>

        <div className="mb-4">
          <h6>削除するテンプレート:</h6>
          <div className="bg-light p-3 rounded">
            <div className="fw-bold mb-2">{template.name}</div>
            <div 
              className="text-muted small"
              style={{ 
                fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
                maxHeight: '150px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {template.sql.length > 500 
                ? `${template.sql.substring(0, 500)}...` 
                : template.sql
              }
            </div>
          </div>
        </div>

        <Alert variant="info" className="mb-0">
          <strong>影響範囲:</strong>
          <ul className="mb-0 mt-2">
            <li>このテンプレートを使用している全ユーザーのドロップダウンから削除されます</li>
            <li>既存の保存済みSQLには影響しません</li>
            <li>削除後はテンプレートの復元はできません</li>
          </ul>
        </Alert>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleClose}
          disabled={isDeleting}
        >
          <FontAwesomeIcon icon={faTimes} className="me-2" />
          キャンセル
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              削除中...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faTrash} className="me-2" />
              削除する
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
