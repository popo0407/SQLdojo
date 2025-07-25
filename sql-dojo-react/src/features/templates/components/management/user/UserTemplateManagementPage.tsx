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
    deleteTemplate,
    // reorderTemplate  // 一時的にコメントアウト
  } = useTemplates();

  // 順序変更処理 - actionsから直接使用
  const handleReorderTemplate = async (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    try {
      console.log('順序変更開始:', { templateId, direction });
      console.log('templateId type:', typeof templateId);
      console.log('templateIdの値:', `"${templateId}"`);
      
      // template_idから実際のidにマッピング
      // allTemplatesでtemplate_idにマッピングしたが、実際の操作は元のidで行う
      const actualId = templateId; // template_idは実際はidの値なので、そのまま使用
      
      console.log('実際のID:', actualId);
      console.log('実際のID type:', typeof actualId);
      
      // actions.reorderTemplateを直接使用して順序変更
      await actions.reorderTemplate(actualId, direction);
      
      console.log('順序変更完了');
    } catch (error) {
      console.error('テンプレート順序変更エラー:', error);
      throw error;
    }
  };

  // ローカル状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithPreferences | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateWithPreferences | null>(null);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // 初期化処理
  useEffect(() => {
    console.log('useEffect初期化チェック:', { 
      isInitialized, 
      'state.isInitialized': state.isInitialized,
      'state.templatePreferences.length': state.templatePreferences.length
    });
    
    const initialize = async () => {
      if (!isInitialized && !state.isInitialized) {
        console.log('初期化開始: グローバル初期化が必要');
        // グローバルに初期化されていない場合のみ初期化
        await initializeTemplates();
        setIsInitialized(true);
      } else if (!isInitialized && state.isInitialized) {
        console.log('初期化スキップ: 既にグローバル初期化済み');
        // 既にグローバル初期化済みの場合
        setIsInitialized(true);
      } else {
        console.log('初期化不要:', { isInitialized, 'state.isInitialized': state.isInitialized });
      }
    };

    initialize();
  }, [initializeTemplates, isInitialized, state.isInitialized, state.templatePreferences.length]);

  // 全テンプレート一覧取得（個人＋管理者）
  console.log('state.templatePreferences:', state.templatePreferences);
  
  const allTemplates: TemplateWithPreferences[] = state.templatePreferences
    .filter(template => {
      const hasId = !!template.template_id;
      console.log('template filter check:', { template_id: template.template_id, hasId, template });
      return hasId;
    }); // IDが存在するテンプレートのみを含める
  
  console.log('final allTemplates:', allTemplates);

  // ユーザーテンプレートのみ（下位互換性のため）
  const userTemplates = allTemplates.filter(template => !template.is_common);

  // デバッグ用：テンプレートデータの確認
  console.log('UserTemplateManagementPage デバッグ情報:');
  console.log('allTemplates:', allTemplates);
  console.log('userTemplates:', userTemplates);
  console.log('allTemplates.length:', allTemplates.length);
  console.log('state:', state);

  // 編集モーダルを開く
  const handleEditTemplate = (template: TemplateWithPreferences) => {
    setEditingTemplate(template);
  };

  // 編集モーダルを閉じる
  const handleCloseEditModal = () => {
    setEditingTemplate(null);
  };

  // テンプレート更新処理
  const handleUpdateTemplate = async (updatedTemplate: TemplateWithPreferences) => {
    const success = await updateTemplate(updatedTemplate);
    if (success) {
      setSaveMessage('テンプレートを更新しました');
      setTimeout(() => setSaveMessage(''), 3000);
      handleCloseEditModal();
    }
  };

  // 削除モーダルを開く
  const handleDeleteTemplate = (template: TemplateWithPreferences) => {
    setDeletingTemplate(template);
  };

  // 削除モーダルを閉じる
  const handleCloseDeleteModal = () => {
    setDeletingTemplate(null);
  };

  // テンプレート削除処理
  const handleConfirmDelete = async (templateId: string) => {
    const success = await deleteTemplate(templateId);
    if (success) {
      setSaveMessage('テンプレートを削除しました');
      setTimeout(() => setSaveMessage(''), 3000);
      handleCloseDeleteModal();
    }
  };
  // ローディング中の表示
  console.log('ローディング状態チェック:', { 
    isInitialized, 
    'state.isLoading': state.isLoading,
    'state.isLoadingPreferences': state.isLoadingPreferences,
    'shouldShowLoading': !isInitialized || state.isLoading
  });
  
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
                onReorder={async (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
                  try {
                    await handleReorderTemplate(templateId, direction);
                    setSaveMessage('順序を変更しました');
                    setTimeout(() => setSaveMessage(''), 3000);
                  } catch (error) {
                    console.error('順序変更エラー:', error);
                  }
                }}
                onUpdatePreferences={async () => {
                  try {
                    // 直接APIを呼び出して設定を更新
                    await actions.updateTemplatePreferences();
                    setSaveMessage('表示設定を保存しました');
                    setTimeout(() => setSaveMessage(''), 3000);
                  } catch (error) {
                    console.error('表示設定保存エラー:', error);
                  }
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
