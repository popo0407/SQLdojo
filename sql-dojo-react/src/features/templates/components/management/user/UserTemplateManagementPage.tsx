import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faSort } from '@fortawesome/free-solid-svg-icons';

import { useTemplates } from '../../../hooks/useTemplates';
import { useTemplateContext } from '../../../hooks/useTemplateContext';
import { UserTemplateEditModal } from './UserTemplateEditModal';
import { UserTemplateDeleteModal } from './UserTemplateDeleteModal';
import { UserTemplateInlineManagement } from './UserTemplateInlineManagement';

import type { TemplateWithPreferences } from '../../../types/template';

/**
 * ユーザーテンプレート管理のメインページ
 * 個人テンプレートの一覧・編集・削除・順序変更・表示制御を統合管理
 */
export const UserTemplateManagementPage: React.FC = () => {
  const { state, actions } = useTemplateContext();
  const { 
    initializeTemplates,
    updateTemplate,
    deleteTemplate
  } = useTemplates();

  // ローカル状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithPreferences | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateWithPreferences | null>(null);

  // ブラウザの beforeunload イベントで未保存変更を警告
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // 初期化処理
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialized && !state.isInitialized) {
        // グローバルに初期化されていない場合のみ初期化
        await initializeTemplates();
        setIsInitialized(true);
      } else if (!isInitialized && state.isInitialized) {
        // 既にグローバル初期化済みの場合
        setIsInitialized(true);
      }
    };

    initialize();
  }, [initializeTemplates, isInitialized, state.isInitialized, state.templatePreferences.length]);

  // 変更状態の更新ハンドラー
  const handleHasChangesChange = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

  // 編集モーダル関連のハンドラー
  const handleEditTemplate = (template: TemplateWithPreferences) => {
    setEditingTemplate(template);
  };

  const handleCloseEditModal = () => {
    setEditingTemplate(null);
  };

  const handleUpdateTemplate = async (updatedTemplate: TemplateWithPreferences) => {
    const success = await updateTemplate(updatedTemplate);
    if (success) {
      setEditingTemplate(null);
      setSaveMessage('テンプレートを更新しました');
      setTimeout(() => setSaveMessage(''), 3000);
      // テンプレート更新後にデータを再読み込み
      await actions.loadTemplatePreferences();
    }
  };

  // 削除モーダル関連のハンドラー
  const handleDeleteTemplate = (template: TemplateWithPreferences) => {
    setDeletingTemplate(template);
  };

  const handleCloseDeleteModal = () => {
    setDeletingTemplate(null);
  };

  const handleConfirmDelete = async (templateId: string) => {
    const success = await deleteTemplate(templateId);
    if (success) {
      setDeletingTemplate(null);
      setSaveMessage('テンプレートを削除しました');
      setTimeout(() => setSaveMessage(''), 3000);
      // テンプレート削除後にデータを再読み込み
      await actions.loadTemplatePreferences();
    }
  };

  // 全テンプレート一覧取得（個人＋管理者）
  const allTemplates: TemplateWithPreferences[] = state.templatePreferences
    .filter(template => {
      const hasId = !!template.template_id;
      return hasId;
    }); // IDが存在するテンプレートのみを含める

  // ユーザーテンプレートのみ（下位互換性のため）
  const userTemplates = allTemplates.filter(template => !template.is_common);

  // ローディング中の表示
  if (!isInitialized || state.isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3">
            <span className="visually-hidden">読み込み中...</span>
          </Spinner>
          <div>テンプレート管理画面を読み込んでいます...</div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          {/* ヘッダー */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">
                <FontAwesomeIcon icon={faList} className="me-2 text-primary" />
                テンプレート管理
              </h2>
              <p className="text-muted mb-0">
                個人テンプレートの一覧・編集・順序変更・表示設定を管理できます
              </p>
            </div>
            <div className="text-end">
              <small className="text-muted">
                全 {userTemplates.length} 件のテンプレート
              </small>
            </div>
          </div>

          {/* 保存メッセージ */}
          {saveMessage && (
            <Alert variant="success" className="mb-3" dismissible onClose={() => setSaveMessage('')}>
              <FontAwesomeIcon icon={faList} className="me-2" />
              {saveMessage}
            </Alert>
          )}

          {/* エラーメッセージ */}
          {state.error && (
            <Alert variant="danger" className="mb-3">
              <strong>エラー:</strong> {state.error}
            </Alert>
          )}

          {/* 未保存変更の警告 */}
          {state.hasUnsavedChanges && (
            <Alert variant="warning" className="mb-3">
              <FontAwesomeIcon icon={faSort} className="me-2" />
              未保存の変更があります。設定を保存してください。
            </Alert>
          )}

          {/* メインコンテンツ */}
          <Card>
            <Card.Body>
              <UserTemplateInlineManagement
                templates={allTemplates}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
                onHasChangesChange={handleHasChangesChange}
                onUpdatePreferences={async (updatedTemplates: TemplateWithPreferences[]) => {
                  // 【修正】状態を更新してから保存するのではなく、更新されたデータを直接使用
                  // 更新されたテンプレート状態をTemplateProviderに反映
                  actions.setTemplatePreferences(updatedTemplates);
                  
                  // 直接updatedTemplatesを使ってAPI呼び出し用のデータを作成
                  const preferences = updatedTemplates.map(template => ({
                    template_id: template.template_id,
                    template_type: template.type,
                    display_order: template.display_order,
                    is_visible: template.is_visible,
                  }));

                  // 直接API呼び出し（状態更新を待たない）
                  const token = localStorage.getItem('token');
                  const response = await fetch('http://localhost:8001/api/v1/users/template-preferences', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { 'Authorization': `Bearer ${token}` }),
                    },
                    body: JSON.stringify({ preferences }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `API Error: ${response.statusText}`);
                  }

                  
                  // 保存成功後にデータを明示的に再読み込み
                  await actions.loadTemplatePreferences();
                  
                  setSaveMessage('表示設定を保存しました');
                  setTimeout(() => setSaveMessage(''), 3000);
                  // 保存成功時に未保存変更フラグをリセット
                  setHasUnsavedChanges(false);
                }}
                isLoading={state.isLoading || state.isLoadingPreferences}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 編集モーダル */}
      {editingTemplate && (
        <UserTemplateEditModal
          template={editingTemplate}
          isOpen={true}
          onClose={handleCloseEditModal}
          onSave={handleUpdateTemplate}
          isLoading={state.isLoading}
        />
      )}

      {/* 削除モーダル */}
      {deletingTemplate && (
        <UserTemplateDeleteModal
          template={deletingTemplate}
          isOpen={true}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          isLoading={state.isLoading}
        />
      )}
    </Container>
  );
};
