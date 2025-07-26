import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Tab, Tabs, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faEye, faSort } from '@fortawesome/free-solid-svg-icons';

import { useTemplates } from '../../../hooks/useTemplates';
import { useTemplateContext } from '../../../hooks/useTemplateContext';
import { UserTemplateList } from './UserTemplateList';
import { UserTemplateEditModal } from './UserTemplateEditModal';
import { UserTemplateDeleteModal } from './UserTemplateDeleteModal';

import type { TemplateWithPreferences } from '../../../types/template';

/**
 * ユーザーテンプレート管理のメインページ
 * 個人テンプレートの一覧・編集・削除・順序変更・表示制御を統合管理
 */
export const UserTemplateManagementPage: React.FC = () => {
  const { state } = useTemplateContext();
  const { 
    getUserTemplates, 
    savePreferences, 
    initializeTemplates, 
    updateTemplate, 
    deleteTemplate 
  } = useTemplates();

  // ローカル状態
  const [activeTab, setActiveTab] = useState<string>('list');
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithPreferences | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateWithPreferences | null>(null);
  const [saveMessage, setSaveMessage] = useState<string>('');

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
  }, [initializeTemplates, isInitialized, state.isInitialized]);

  // ユーザーテンプレート一覧取得
  const userTemplates = getUserTemplates();

  // デバッグ用：テンプレートデータの確認
  console.log('UserTemplateManagementPage デバッグ情報:');
  console.log('userTemplates:', userTemplates);
  console.log('userTemplates.length:', userTemplates.length);
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

  // 設定保存処理
  const handleSavePreferences = async () => {
    const success = await savePreferences();
    if (success) {
      setSaveMessage('設定を保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

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
            <Card.Header>
              <Tabs 
                activeKey={activeTab} 
                onSelect={(key) => setActiveTab(key || 'list')}
                className="card-header-tabs"
              >
                <Tab 
                  eventKey="list" 
                  title={
                    <span>
                      <FontAwesomeIcon icon={faList} className="me-2" />
                      テンプレート一覧
                    </span>
                  } 
                />
                <Tab 
                  eventKey="visibility" 
                  title={
                    <span>
                      <FontAwesomeIcon icon={faEye} className="me-2" />
                      表示設定
                    </span>
                  } 
                />
                <Tab 
                  eventKey="order" 
                  title={
                    <span>
                      <FontAwesomeIcon icon={faSort} className="me-2" />
                      順序設定
                    </span>
                  } 
                />
              </Tabs>
            </Card.Header>
            
            <Card.Body>
              {activeTab === 'list' && (
                <UserTemplateList
                  templates={userTemplates}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                  isLoading={state.isLoading}
                />
              )}
              
              {activeTab === 'visibility' && (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faEye} size="3x" className="text-muted mb-3" />
                  <h5>表示設定</h5>
                  <p className="text-muted">
                    テンプレートの表示・非表示を制御する機能は次のバージョンで実装予定です
                  </p>
                </div>
              )}
              
              {activeTab === 'order' && (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faSort} size="3x" className="text-muted mb-3" />
                  <h5>順序設定</h5>
                  <p className="text-muted">
                    テンプレートの表示順序を変更する機能は次のバージョンで実装予定です
                  </p>
                  {state.hasUnsavedChanges && (
                    <button 
                      className="btn btn-primary mt-3"
                      onClick={handleSavePreferences}
                      disabled={state.isLoading}
                    >
                      設定を保存
                    </button>
                  )}
                </div>
              )}
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
