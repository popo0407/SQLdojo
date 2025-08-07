import React from 'react';
import type { TemplateDropdownItem } from '../types/template';

interface TemplateListProps {
  templates: TemplateDropdownItem[];
  onSelectTemplate: (template: TemplateDropdownItem) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * テンプレートリストコンポーネント
 * ボタンなしでテンプレートのリストのみを表示
 */
export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onSelectTemplate,
  isLoading = false,
  className = '',
}) => {
  const handleSelectTemplate = (template: TemplateDropdownItem) => {
    onSelectTemplate(template);
  };

  if (isLoading) {
    return (
      <div className={`template-list ${className}`}>
        <div className="text-center p-3">
          <i className="fas fa-spinner fa-spin me-2"></i>
          読み込み中...
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={`template-list ${className}`}>
        <div className="text-center p-3 text-muted">
          テンプレートがありません
        </div>
      </div>
    );
  }

  return (
    <div className={`template-list ${className}`}>
      <div className="dropdown-menu show" style={{ position: 'static', width: '100%' }}>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="dropdown-item"
            onClick={() => handleSelectTemplate(template)}
            title={template.sql}
          >
            <div className="d-flex justify-content-between align-items-center">
              <span className="template-name">{template.name}</span>
              <small className="text-muted">
                {template.type === 'admin' ? '管理者' : 'ユーザー'}
              </small>
            </div>
            <small className="text-muted d-block text-truncate" style={{ maxWidth: '300px' }}>
              {template.sql}
            </small>
          </button>
        ))}
      </div>
      
      <style>{`
        .template-list {
          border: 1px solid #dee2e6;
          border-radius: 0.375rem;
          background: white;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          max-height: 300px;
          overflow-y: auto;
        }
        
        .template-list .dropdown-item {
          border: none;
          background: none;
          text-align: left;
          width: 100%;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid #f8f9fa;
        }
        
        .template-list .dropdown-item:hover {
          background-color: #f8f9fa;
        }
        
        .template-list .dropdown-item:last-child {
          border-bottom: none;
        }
        
        .template-name {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
