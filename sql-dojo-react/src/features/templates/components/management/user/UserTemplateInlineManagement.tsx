import React, { useState, useCallback } from 'react';
import { Card, Table, Button, ButtonGroup, Form, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faTrash, 
  faArrowUp,
  faArrowDown,
  faArrowsUpDown,
  faUser,
  faUserShield,
  faSave,
  faUndo
} from '@fortawesome/free-solid-svg-icons';

import type { TemplateWithPreferences } from '../../../types/template';

interface UserTemplateInlineManagementProps {
  templates: TemplateWithPreferences[];
  onEdit: (template: TemplateWithPreferences) => void;
  onDelete: (template: TemplateWithPreferences) => void;
  onReorder: (templateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => Promise<void>;
  onUpdatePreferences: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * テンプレートのインライン管理コンポーネント
 * 一覧表示と同時に編集・順序変更・表示制御が可能
 */
export const UserTemplateInlineManagement: React.FC<UserTemplateInlineManagementProps> = ({
  templates,
  onEdit,
  onDelete,
  onReorder,
  onUpdatePreferences,
  isLoading = false
}) => {
  console.log('UserTemplateInlineManagement received templates:', templates);
  console.log('templates.length:', templates.length);
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>(() => {
    console.log('templates for localVisibility init:', templates);
    const visibility: Record<string, boolean> = {};
    templates.forEach(template => {
      console.log('template for visibility init:', template);
      const templateId = template.template_id;
      if (templateId) {
        visibility[templateId] = template.is_visible;
      } else {
        console.warn('template_id is undefined for template:', template);
      }
    });
    console.log('initial visibility state:', visibility);
    return visibility;
  });
  
  const [hasVisibilityChanges, setHasVisibilityChanges] = useState(false);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);

  // 表示/非表示の切り替え（個別のテンプレートだけを変更）
  const handleVisibilityToggle = useCallback((templateId: string, isVisible: boolean) => {
    console.log(`個別表示切り替え: ${templateId} -> ${isVisible}`);
    if (!templateId) {
      console.error('templateId is undefined in handleVisibilityToggle');
      return;
    }
    setLocalVisibility(prev => {
      const newVisibility = { ...prev };
      newVisibility[templateId] = isVisible;
      console.log('新しい表示状態:', newVisibility);
      return newVisibility;
    });
    setHasVisibilityChanges(true);
  }, []);

  // 表示設定の保存
  const handleSaveVisibility = useCallback(async () => {
    if (!hasVisibilityChanges || isSavingVisibility) return;

    setIsSavingVisibility(true);
    try {
      await onUpdatePreferences();
      setHasVisibilityChanges(false);
    } catch (error) {
      console.error('表示設定保存エラー:', error);
    } finally {
      setIsSavingVisibility(false);
    }
  }, [onUpdatePreferences, hasVisibilityChanges, isSavingVisibility]);

  // 表示設定のリセット
  const handleResetVisibility = useCallback(() => {
    const visibility: Record<string, boolean> = {};
    templates.forEach(template => {
      visibility[template.template_id] = template.is_visible;
    });
    setLocalVisibility(visibility);
    setHasVisibilityChanges(false);
  }, [templates]);

  // 全テンプレートを統合表示（個人・管理者テンプレート両方を表示）
  const allTemplates = templates;

  const renderTemplateRow = (template: TemplateWithPreferences, index: number, isLast: boolean) => (
    <tr key={template.template_id}>
      <td style={{ width: '40px' }}>
        <Badge 
          bg={template.is_common ? 'warning' : 'primary'} 
          className="d-flex align-items-center justify-content-center"
          style={{ width: '24px', height: '24px', fontSize: '12px' }}
        >
          <FontAwesomeIcon icon={template.is_common ? faUserShield : faUser} />
        </Badge>
      </td>
      
      <td style={{ width: '80px', textAlign: 'center' }}>
        <span className="text-muted small">#{template.display_order}</span>
      </td>
      
      <td>
        <div>
          <strong>{template.name}</strong>
        </div>
      </td>
      
      <td>
        {template.sql && (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`sql-tooltip-${template.template_id}`}>
                <div style={{ 
                  maxWidth: '500px', 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '18px'
                }}>
                  {template.sql.length > 1000 ? 
                    `${template.sql.substring(0, 1000)}...` : 
                    template.sql
                  }
                </div>
              </Tooltip>
            }
          >
            <small 
              className="text-muted" 
              style={{ 
                maxWidth: '400px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                display: 'block',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              {template.sql.substring(0, 100)}...
            </small>
          </OverlayTrigger>
        )}
      </td>
      
      <td style={{ width: '80px', textAlign: 'center' }}>
        <Form.Check
          type="switch"
          id={`visibility-${template.template_id}`}
          checked={localVisibility[template.template_id] ?? template.is_visible}
          onChange={(e) => handleVisibilityToggle(template.template_id, e.target.checked)}
          disabled={isLoading || isSavingVisibility}
        />
      </td>
      
      <td style={{ width: '120px' }}>
        <ButtonGroup size="sm">
          <Button
            variant="outline-secondary"
            onClick={() => onReorder(template.template_id, 'up')}
            disabled={index === 0 || isLoading || template.is_common}
            title={template.is_common ? "管理者テンプレートは順序変更できません" : "上に移動"}
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => onReorder(template.template_id, 'down')}
            disabled={isLast || isLoading || template.is_common}
            title={template.is_common ? "管理者テンプレートは順序変更できません" : "下に移動"}
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </Button>
        </ButtonGroup>
      </td>
      
      <td style={{ width: '100px' }}>
        <ButtonGroup size="sm">
          <Button
            variant="outline-primary"
            onClick={() => onEdit(template)}
            disabled={isLoading || template.is_common}
            title={template.is_common ? "管理者テンプレートは編集できません" : "編集"}
          >
            <FontAwesomeIcon icon={faEdit} />
          </Button>
          <Button
            variant="outline-danger"
            onClick={() => onDelete(template)}
            disabled={isLoading || template.is_common}
            title={template.is_common ? "管理者テンプレートは削除できません" : "削除"}
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </ButtonGroup>
      </td>
    </tr>
  );

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FontAwesomeIcon icon={faArrowsUpDown} className="me-2" />
            テンプレート管理
          </h6>
          {hasVisibilityChanges && (
            <div>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleResetVisibility}
                disabled={isSavingVisibility}
                className="me-2"
              >
                <FontAwesomeIcon icon={faUndo} />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveVisibility}
                disabled={isSavingVisibility}
              >
                {isSavingVisibility ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <FontAwesomeIcon icon={faSave} />
                )}
                <span className="ms-1">保存</span>
              </Button>
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        {isLoading ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <div className="mt-2">読み込み中...</div>
          </div>
        ) : (
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}>種別</th>
                <th style={{ width: '80px' }}>順序</th>
                <th style={{ width: '200px' }}>テンプレート名</th>
                <th>SQL内容</th>
                <th style={{ width: '80px' }}>表示</th>
                <th style={{ width: '120px' }}>順序変更</th>
                <th style={{ width: '100px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {/* 全テンプレートを表示（個人+管理者） */}
              {allTemplates.map((template, index) => 
                renderTemplateRow(template, index, index === allTemplates.length - 1)
              )}
              
              {allTemplates.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted p-4">
                    テンプレートがありません
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};
