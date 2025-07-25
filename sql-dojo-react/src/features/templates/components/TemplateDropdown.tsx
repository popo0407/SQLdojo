import React, { useState, useRef, useEffect } from 'react';
import type { TemplateDropdownProps, TemplateDropdownItem } from '../types/template';

/**
 * テンプレートドロップダウンコンポーネント
 * 既存のJavaScript実装と同等の機能を提供
 */
export const TemplateDropdown: React.FC<TemplateDropdownProps> = ({
  templates,
  onSelectTemplate,
  isLoading = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTemplate, setHoveredTemplate] = useState<TemplateDropdownItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectTemplate = (template: TemplateDropdownItem) => {
    onSelectTemplate(template);
    setIsOpen(false);
    setHoveredTemplate(null);
  };

  const handleMouseEnter = (template: TemplateDropdownItem, event: React.MouseEvent) => {
    setHoveredTemplate(template);
    
    // ツールチップの位置を調整
    if (tooltipRef.current) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      tooltipRef.current.style.top = `${rect.top}px`;
      tooltipRef.current.style.left = `${rect.right + 10}px`;
    }
  };

  const handleMouseLeave = () => {
    setHoveredTemplate(null);
  };

  // 個人テンプレートと共通テンプレートを分離
  const userTemplates = templates.filter(t => t.type === 'user');
  const adminTemplates = templates.filter(t => t.type === 'admin');

  return (
    <div className={`template-dropdown ${className}`} ref={dropdownRef}>
      {/* ドロップダウンボタン */}
      <button
        type="button"
        className="btn btn-outline-secondary dropdown-toggle"
        onClick={handleToggleDropdown}
        disabled={isLoading}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isLoading ? (
          <>
            <i className="fas fa-spinner fa-spin me-2"></i>
            読み込み中...
          </>
        ) : (
          <>
            <i className="fas fa-file-code me-2"></i>
            テンプレート選択
          </>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && !isLoading && (
        <div className="dropdown-menu show" style={{ display: 'block', minWidth: '250px' }}>
          {templates.length === 0 ? (
            <div className="dropdown-item-text text-muted">
              <i className="fas fa-info-circle me-2"></i>
              テンプレートがありません
              <br />
              <small>「テンプレート保存」ボタンで新しいテンプレートを作成できます</small>
            </div>
          ) : (
            <>
              {/* 個人テンプレート */}
              {userTemplates.length > 0 && (
                <>
                  <h6 className="dropdown-header">
                    <i className="fas fa-user me-2"></i>
                    個人テンプレート
                  </h6>
                  {userTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="dropdown-item template-item"
                      onClick={() => handleSelectTemplate(template)}
                      onMouseEnter={(e) => handleMouseEnter(template, e)}
                      onMouseLeave={handleMouseLeave}
                      title={template.sql}
                    >
                      <i className="fas fa-user me-2"></i>
                      {template.name}
                    </button>
                  ))}
                </>
              )}

              {/* 区切り線 */}
              {userTemplates.length > 0 && adminTemplates.length > 0 && (
                <div className="dropdown-divider"></div>
              )}

              {/* 共通テンプレート */}
              {adminTemplates.length > 0 && (
                <>
                  <h6 className="dropdown-header">
                    <i className="fas fa-shield-alt me-2"></i>
                    共通テンプレート
                  </h6>
                  {adminTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="dropdown-item template-item"
                      onClick={() => handleSelectTemplate(template)}
                      onMouseEnter={(e) => handleMouseEnter(template, e)}
                      onMouseLeave={handleMouseLeave}
                      title={template.sql}
                    >
                      <i className="fas fa-shield-alt me-2"></i>
                      {template.name}
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* SQLプレビューツールチップ */}
      {hoveredTemplate && (
        <div
          ref={tooltipRef}
          className="template-tooltip"
          style={{
            position: 'fixed',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '8px',
            maxWidth: '400px',
            maxHeight: '200px',
            overflow: 'auto',
            zIndex: 1050,
            fontSize: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          }}
        >
          <div className="fw-bold mb-1">{hoveredTemplate.name}</div>
          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
            {hoveredTemplate.sql.length > 200 
              ? `${hoveredTemplate.sql.substring(0, 200)}...` 
              : hoveredTemplate.sql
            }
          </pre>
        </div>
      )}

      {/* CSS スタイル */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .template-dropdown {
            position: relative;
          }

          .dropdown-menu {
            max-height: 400px;
            overflow-y: auto;
          }

          .template-item {
            display: flex;
            align-items: center;
            padding: 8px 16px;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
          }

          .template-item:hover {
            background-color: #f8f9fa;
          }

          .template-item:focus {
            background-color: #e9ecef;
            outline: none;
          }

          .dropdown-header {
            font-size: 0.875rem;
            font-weight: 600;
            color: #6c757d;
            padding: 8px 16px 4px;
            margin: 0;
          }

          .dropdown-item-text {
            padding: 12px 16px;
            color: #6c757d;
            text-align: center;
          }

          .template-tooltip {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          }
        `
      }} />
    </div>
  );
};
