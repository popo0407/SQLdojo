import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useTemplateContext } from '../../../hooks/useTemplateContext';
import { templateApi } from '../../../api/templateApi';
import { AdminTemplateList } from './AdminTemplateList';
import { AdminTemplateCreateModal } from './AdminTemplateCreateModal';
import { UserTemplateDeleteModal } from '../user/UserTemplateDeleteModal';
import type { Template, TemplateWithPreferences } from '../../../types/template';

/**
 * 管理者テンプレート管理ページ
 */
export const AdminTemplateManagementPage: React.FC = () => {
  const { 
    state: { adminTemplates, isLoading, error },
    actions: { loadAdminTemplates }
  } = useTemplateContext();

  // 管理者テンプレート作成ハンドラー
  const handleCreateTemplate = async (templateData: Omit<Template, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await templateApi.createAdminTemplate({
        name: templateData.name,
        sql: templateData.sql,
      });
      await loadAdminTemplates(); // 作成後にリロード
    } catch (error) {
      console.error('[ADMIN] テンプレート作成エラー:', error);
    }
  };

  // 管理者テンプレート削除ハンドラー
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await templateApi.deleteAdminTemplate(templateId);
      await loadAdminTemplates(); // 削除後にリロード
    } catch (error) {
      console.error('[ADMIN] テンプレート削除エラー:', error);
    }
  };

  // モーダル状態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithPreferences | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    loadAdminTemplates().catch((error) => {
      console.error('[ADMIN] loadAdminTemplates実行エラー:', error);
    });
  }, [loadAdminTemplates]);

  // adminTemplatesをTemplateWithPreferencesに変換
  const templatesWithPreferences: TemplateWithPreferences[] = adminTemplates.map(template => {
    return {
      template_id: template.id,
      name: template.name,
      sql: template.sql,
      created_at: template.created_at,
      updated_at: template.updated_at,
      type: template.type,
      is_common: template.is_common,
      display_order: 0,
      is_visible: true
    };
  });

  // 新規作成ハンドラー
  const handleCreate = async (templateData: { name: string; sql: string; description?: string }) => {
    try {
      const newTemplate: Omit<Template, 'id' | 'created_at' | 'updated_at'> = {
        name: templateData.name,
        sql: templateData.sql,
        is_common: true,
        type: 'admin'
      };
      await handleCreateTemplate(newTemplate);
      setShowCreateModal(false);
    } catch (error) {
      console.error('管理者テンプレート作成エラー:', error);
    }
  };

  // 削除ハンドラー
  const handleDelete = (template: TemplateWithPreferences) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">共通テンプレート管理</h4>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                disabled={isLoading}
              >
                新規作成
              </Button>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}
              
              <AdminTemplateList
                templates={templatesWithPreferences}
                isLoading={isLoading}
                onDelete={handleDelete}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 新規作成モーダル */}
      <AdminTemplateCreateModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {/* 削除モーダル（ユーザー用を流用） */}
      {selectedTemplate && (
        <UserTemplateDeleteModal
          template={selectedTemplate}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTemplate(null);
          }}
          onConfirm={async (templateId: string) => {
            await handleDeleteTemplate(templateId);
            setShowDeleteModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </Container>
  );
};
