import React from 'react';
import { Table, Button, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

import type { TemplateWithPreferences } from '../../../types/template';

interface AdminTemplateListProps {
  templates: TemplateWithPreferences[];
  onDelete: (template: TemplateWithPreferences) => void;
  isLoading?: boolean;
}

/**
 * 管理者用テンプレート一覧表示コンポーネント
 * シンプルなテーブル表示でCRUD操作ボタンを提供
 * 注意: 編集機能は現在無効化されています
 */
export const AdminTemplateList: React.FC<AdminTemplateListProps> = ({
  templates,
  onDelete,
  isLoading = false
}) => {
  // SQL内容のプレビューツールチップ
  const renderSqlTooltip = (sql: string) => (
    <Tooltip>
      <div style={{ 
        maxWidth: '500px', 
        maxHeight: '300px', 
        overflow: 'auto',
        fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
        fontSize: '14px',
        whiteSpace: 'pre-wrap'
      }}>
        {sql.length > 1000 ? `${sql.substring(0, 1000)}...` : sql}
      </div>
    </Tooltip>
  );

  const renderTemplateRow = (template: TemplateWithPreferences, index: number) => (
    <tr key={template.template_id}>
      <td style={{ width: '50px' }}>
        <Badge bg="warning" className="d-flex align-items-center justify-content-center">
          {index + 1}
        </Badge>
      </td>
      
      <td style={{ width: '200px' }}>
        <div className="fw-bold">{template.name}</div>
        <small className="text-muted">共通テンプレート</small>
      </td>
      
      <td>
        <div className="d-flex align-items-center">
          <div 
            style={{ 
              maxWidth: '400px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {template.sql.substring(0, 100)}
            {template.sql.length > 100 && '...'}
          </div>
          {template.sql.length > 0 && (
            <OverlayTrigger
              placement="top"
              overlay={renderSqlTooltip(template.sql)}
            >
              <Button variant="link" size="sm" className="p-1 ms-2">
                <FontAwesomeIcon icon={faInfoCircle} />
              </Button>
            </OverlayTrigger>
          )}
        </div>
      </td>
      
      <td style={{ width: '120px' }}>
        <div className="d-flex gap-2">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>編集機能は現在無効化されています</Tooltip>}
          >
            <span className="d-inline-block">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={true}
                title="編集機能は現在無効化されています"
                style={{ pointerEvents: 'none' }}
              >
                <FontAwesomeIcon icon={faEdit} />
              </Button>
            </span>
          </OverlayTrigger>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDelete(template)}
            disabled={isLoading}
            title="削除"
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      </td>
    </tr>
  );

  if (templates.length === 0) {
    return (
      <div className="text-center py-5">
        <FontAwesomeIcon icon={faInfoCircle} size="3x" className="text-muted mb-3" />
        <h5 className="text-muted">共通テンプレートがありません</h5>
        <p className="text-muted">
          新規作成ボタンから最初のテンプレートを作成してください
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h6 className="mb-0">
          <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-info" />
          共通テンプレート一覧
        </h6>
        <small className="text-muted">
          システム全体で使用される共通テンプレートの管理
        </small>
      </div>

      <Table striped hover responsive>
        <thead>
          <tr>
            <th style={{ width: '50px' }}>#</th>
            <th style={{ width: '200px' }}>テンプレート名</th>
            <th>SQL内容</th>
            <th style={{ width: '120px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template, index) => renderTemplateRow(template, index))}
        </tbody>
      </Table>
    </div>
  );
};
