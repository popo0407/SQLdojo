import React, { useState, useMemo } from 'react';
import { Table, Button, Form, InputGroup, Card, Badge, OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faTrash, 
  faSearch, 
  faCode, 
  faCalendar,
  faSortUp,
  faSortDown
} from '@fortawesome/free-solid-svg-icons';

import type { TemplateWithPreferences } from '../../../types/template';

export interface UserTemplateListProps {
  templates: TemplateWithPreferences[];
  onEdit: (template: TemplateWithPreferences) => void;
  onDelete: (template: TemplateWithPreferences) => void;
  isLoading?: boolean;
}

type SortField = 'name' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

/**
 * ユーザーテンプレート一覧表示コンポーネント
 * 検索・ソート・プレビュー機能付き
 */
export const UserTemplateList: React.FC<UserTemplateListProps> = ({
  templates,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  // ローカル状態
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // 検索・ソート済みテンプレート一覧
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates;

    // 検索フィルタ
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = templates.filter(template => 
        template.name.toLowerCase().includes(term) ||
        template.sql.toLowerCase().includes(term)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
        case 'updated_at':
          aValue = a[sortField] ? new Date(a[sortField]).getTime() : 0;
          bValue = b[sortField] ? new Date(b[sortField]).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [templates, searchTerm, sortField, sortDirection]);

  // ソート変更処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ソートアイコン取得
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? faSortUp : faSortDown;
  };

  // 日付フォーマット
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '不明';
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // SQLプレビュー（最初の3行まで表示）
  const getSqlPreview = (sql: string) => {
    const lines = sql.split('\n');
    const preview = lines.slice(0, 3).join('\n');
    const hasMore = lines.length > 3;
    return hasMore ? `${preview}\n...` : preview;
  };

  return (
    <div>
      {/* 検索・フィルタエリア */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="テンプレート名またはSQL内容で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6} className="text-end">
              <small className="text-muted">
                {filteredAndSortedTemplates.length} / {templates.length} 件を表示
              </small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* テンプレート一覧テーブル */}
      {filteredAndSortedTemplates.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <FontAwesomeIcon icon={faSearch} size="3x" className="text-muted mb-3" />
            <h5>テンプレートが見つかりません</h5>
            <p className="text-muted">
              {searchTerm ? '検索条件を変更してください' : 'まだテンプレートが作成されていません'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('name')}
                  >
                    テンプレート名
                    {getSortIcon('name') && (
                      <FontAwesomeIcon icon={getSortIcon('name')!} className="ms-1" />
                    )}
                  </th>
                  <th>SQL内容</th>
                  <th>タイプ</th>
                  <th 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('updated_at')}
                  >
                    更新日時
                    {getSortIcon('updated_at') && (
                      <FontAwesomeIcon icon={getSortIcon('updated_at')!} className="ms-1" />
                    )}
                  </th>
                  <th 
                    className="cursor-pointer user-select-none"
                    onClick={() => handleSort('created_at')}
                  >
                    作成日時
                    {getSortIcon('created_at') && (
                      <FontAwesomeIcon icon={getSortIcon('created_at')!} className="ms-1" />
                    )}
                  </th>
                  <th style={{ width: '120px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTemplates.map((template) => (
                  <tr key={template.template_id}>
                    <td>
                      <div className="fw-semibold">{template.name}</div>
                    </td>
                    <td>
                      <div 
                        className="font-monospace small text-muted"
                        style={{ 
                          maxWidth: '300px', 
                          whiteSpace: 'pre-line',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                        onClick={() => setPreviewTemplateId(
                          previewTemplateId === template.template_id ? null : template.template_id
                        )}
                      >
                        {previewTemplateId === template.template_id 
                          ? template.sql 
                          : getSqlPreview(template.sql)
                        }
                        {template.sql.split('\n').length > 3 && (
                          <div className="text-primary small mt-1">
                            <FontAwesomeIcon icon={faCode} className="me-1" />
                            {previewTemplateId === template.template_id ? '折りたたむ' : '全体を表示'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge bg={template.type === 'user' ? 'primary' : 'secondary'}>
                        {template.type === 'user' ? '個人' : '共通'}
                      </Badge>
                    </td>
                    <td>
                      <small className="text-muted">
                        <FontAwesomeIcon icon={faCalendar} className="me-1" />
                        {formatDate(template.updated_at)}
                      </small>
                    </td>
                    <td>
                      <small className="text-muted">
                        <FontAwesomeIcon icon={faCalendar} className="me-1" />
                        {formatDate(template.created_at)}
                      </small>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>編集</Tooltip>}
                        >
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => onEdit(template)}
                            disabled={isLoading}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                        </OverlayTrigger>
                        
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>削除</Tooltip>}
                        >
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => onDelete(template)}
                            disabled={isLoading}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </OverlayTrigger>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* カスタムCSS */}
      <style>
        {`
          .cursor-pointer {
            cursor: pointer;
          }
          .user-select-none {
            user-select: none;
          }
        `}
      </style>
    </div>
  );
};
