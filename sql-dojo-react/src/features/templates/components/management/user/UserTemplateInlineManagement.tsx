import React, { useState, useCallback, useEffect } from 'react';
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
  onUpdatePreferences: (updatedTemplates: TemplateWithPreferences[]) => Promise<void>;
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
  onUpdatePreferences,
  isLoading = false
}) => {
  // 表示/非表示のローカル状態
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>(() => {
    const visibility: Record<string, boolean> = {};
    templates.forEach(template => {
      const templateId = template.template_id;
      if (templateId) {
        visibility[templateId] = template.is_visible;
      } else {
        console.warn('template_id is undefined for template:', template);
      }
    });
    return visibility;
  });

  // 順序のローカル状態（display_order順でソート）
  const [localTemplates, setLocalTemplates] = useState<TemplateWithPreferences[]>(() => {
    const sortedTemplates = [...templates].sort((a, b) => {
      // display_order でソート（昇順）
      return a.display_order - b.display_order;
    });
    return sortedTemplates;
  });
  
  // 統合変更フラグ（表示/非表示と順序の両方）
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // templates プロパティが変更された時にローカル状態を同期
  useEffect(() => {
    // display_order順でソート
    const sortedTemplates = [...templates].sort((a, b) => {
      // display_order でソート（昇順）
      return a.display_order - b.display_order;
    });
    
    setLocalTemplates(sortedTemplates);
    
    // 表示状態も同期
    const newVisibility: Record<string, boolean> = {};
    templates.forEach(template => {
      const templateId = template.template_id;
      if (templateId) {
        newVisibility[templateId] = template.is_visible;
      }
    });
    setLocalVisibility(newVisibility);
    
    // プロパティが変更された場合は変更フラグをリセット
    setHasChanges(false);
  }, [templates]);

  // 表示/非表示の切り替え（個別のテンプレートだけを変更）
  const handleVisibilityToggle = useCallback((templateId: string, isVisible: boolean) => {
    if (!templateId) {
      console.error('templateId is undefined in handleVisibilityToggle');
      return;
    }
    setLocalVisibility(prev => {
      const newVisibility = { ...prev };
      newVisibility[templateId] = isVisible;
      return newVisibility;
    });
    setHasChanges(true);
  }, []);

  // 順序変更処理
  const handleReorder = useCallback((templateId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setLocalTemplates(prev => {
      const currentIndex = prev.findIndex(t => t.template_id === templateId);
      if (currentIndex === -1) return prev;

      let newIndex: number;
      switch (direction) {
        case 'up':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'down':
          newIndex = Math.min(prev.length - 1, currentIndex + 1);
          break;
        case 'top':
          newIndex = 0;
          break;
        case 'bottom':
          newIndex = prev.length - 1;
          break;
        default:
          return prev;
      }

      if (newIndex === currentIndex) return prev;

      const newTemplates = [...prev];
      const [movedTemplate] = newTemplates.splice(currentIndex, 1);
      newTemplates.splice(newIndex, 0, movedTemplate);
      
      return newTemplates;
    });
    setHasChanges(true);
  }, []);

  // 設定の保存（表示/非表示と順序の両方）
  const handleSaveSettings = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      // ローカル状態を統合したテンプレートリストを作成
      const updatedTemplates = localTemplates.map((template, index) => ({
        ...template,
        display_order: index + 1, // 新しい順序（1から開始）
        is_visible: localVisibility[template.template_id] ?? template.is_visible // ローカルの表示状態を反映
      }));
      
      await onUpdatePreferences(updatedTemplates);
      setHasChanges(false);
    } catch (error) {
      console.error('設定保存エラー:', error);
      // エラー時はローカル状態をリセット
      setLocalVisibility(() => {
        const visibility: Record<string, boolean> = {};
        templates.forEach(template => {
          const templateId = template.template_id;
          if (templateId) {
            visibility[templateId] = template.is_visible;
          }
        });
        return visibility;
      });
      setLocalTemplates([...templates]);
      setHasChanges(false);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [onUpdatePreferences, hasChanges, isSaving, localTemplates, localVisibility, templates]);

  // 設定のリセット（表示/非表示と順序の両方）
  const handleResetSettings = useCallback(() => {
    const visibility: Record<string, boolean> = {};
    templates.forEach(template => {
      visibility[template.template_id] = template.is_visible;
    });
    setLocalVisibility(visibility);
    setLocalTemplates([...templates]);
    setHasChanges(false);
  }, [templates]);

  // 全テンプレートを統合表示（個人・管理者テンプレート両方を表示）
  const allTemplates = localTemplates;

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
          disabled={isLoading || isSaving}
        />
      </td>
      
      <td style={{ width: '120px' }}>
        <ButtonGroup size="sm">
          <Button
            variant="outline-secondary"
            onClick={() => handleReorder(template.template_id, 'up')}
            disabled={index === 0 || isLoading || isSaving}
            title="上に移動"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => handleReorder(template.template_id, 'down')}
            disabled={isLast || isLoading || isSaving}
            title="下に移動"
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
          {hasChanges && (
            <div>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleResetSettings}
                disabled={isSaving}
                className="me-2"
              >
                <FontAwesomeIcon icon={faUndo} />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <FontAwesomeIcon icon={faSave} />
                )}
                <span className="ms-1">設定を保存</span>
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
