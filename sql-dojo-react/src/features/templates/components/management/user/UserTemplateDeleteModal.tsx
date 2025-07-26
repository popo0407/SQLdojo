import React from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

import type { TemplateWithPreferences } from '../../../types/template';

export interface UserTemplateDeleteModalProps {
  template: TemplateWithPreferences;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (templateId: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ユーザーテンプレート削除確認モーダル
 * 削除対象の詳細表示と確認処理
 */
export const UserTemplateDeleteModal: React.FC<UserTemplateDeleteModalProps> = ({
  template,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  // 削除実行処理
  const handleConfirm = async () => {
    try {
      await onConfirm(template.template_id);
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
    }
  };

  // SQL内容のプレビュー（最初の5行まで）
  const getSqlPreview = (sql: string) => {
    const lines = sql.split('\n');
    if (lines.length <= 5) {
      return sql;
    }
    return lines.slice(0, 5).join('\n') + '\n...';
  };

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header className="bg-danger text-white">
        <Modal.Title>
          <FontAwesomeIcon icon={faTrash} className="me-2" />
          テンプレート削除確認
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Alert variant="warning" className="d-flex align-items-start">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 mt-1" />
          <div>
            <strong>警告:</strong> この操作は取り消せません。<br />
            以下のテンプレートを完全に削除します。
          </div>
        </Alert>

        {/* 削除対象テンプレート情報 */}
        <div className="border rounded p-3 bg-light">
          <div className="mb-2">
            <strong>テンプレート名:</strong>
            <div className="mt-1 fw-semibold text-primary">{template.name}</div>
          </div>

          <div className="mb-2">
            <strong>作成日時:</strong>
            <div className="mt-1 text-muted small">
              {new Date(template.created_at).toLocaleString('ja-JP')}
            </div>
          </div>

          <div className="mb-2">
            <strong>最終更新:</strong>
            <div className="mt-1 text-muted small">
              {template.updated_at ? new Date(template.updated_at).toLocaleString('ja-JP') : '不明'}
            </div>
          </div>

          <div>
            <strong>SQL内容:</strong>
            <div 
              className="mt-1 font-monospace small bg-white border rounded p-2"
              style={{ 
                maxHeight: '150px',
                overflow: 'auto',
                whiteSpace: 'pre-line'
              }}
            >
              {getSqlPreview(template.sql)}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-0 text-danger small">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-1" />
            このテンプレートを削除すると、メインページのドロップダウンからも削除されます。
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onClose}
          disabled={isLoading}
        >
          <FontAwesomeIcon icon={faTimes} className="me-1" />
          キャンセル
        </Button>
        
        <Button 
          variant="danger" 
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              削除中...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faTrash} className="me-1" />
              削除実行
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
