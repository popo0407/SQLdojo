import React, { useState, useEffect, useRef } from 'react';
import type { TemplateSaveModalProps } from '../types/template';

/**
 * テンプレート保存モーダルコンポーネント
 * 新しいテンプレートを保存するためのモーダル
 */
export const TemplateSaveModal: React.FC<TemplateSaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSql = '',
  isLoading = false,
}) => {
  const [templateName, setTemplateName] = useState('');
  const [sqlContent, setSqlContent] = useState(initialSql);
  const [error, setError] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開かれた時の初期化
  useEffect(() => {
    if (isOpen) {
      setTemplateName('');
      setSqlContent(initialSql);
      setError('');
      
      // 少し遅延させてフォーカスを設定
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialSql]);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isLoading, onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // バリデーション
    if (!templateName.trim()) {
      setError('テンプレート名を入力してください');
      nameInputRef.current?.focus();
      return;
    }

    if (templateName.trim().length > 100) {
      setError('テンプレート名は100文字以内で入力してください');
      nameInputRef.current?.focus();
      return;
    }

    if (!sqlContent.trim()) {
      setError('SQLを入力してください');
      return;
    }

    if (sqlContent.trim().length > 10000) {
      setError('SQLは10000文字以内で入力してください');
      return;
    }

    try {
      setError('');
      await onSave(templateName.trim(), sqlContent.trim());
      // 成功時はモーダルを閉じる（親コンポーネントで制御）
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存に失敗しました';
      setError(errorMessage);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTemplateName(event.target.value);
    if (error) {
      setError('');
    }
  };

  const handleSqlChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSqlContent(event.target.value);
    if (error) {
      setError('');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* モーダル背景 */}
      <div 
        className="modal-backdrop fade show" 
        onClick={handleBackdropClick}
        style={{ zIndex: 1040 }}
      />
      
      {/* モーダル本体 */}
      <div 
        className="modal fade show" 
        style={{ display: 'block', zIndex: 1050 }}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="templateSaveModalLabel"
        aria-hidden="false"
      >
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            {/* ヘッダー */}
            <div className="modal-header">
              <h5 className="modal-title" id="templateSaveModalLabel">
                <i className="fas fa-save me-2"></i>
                テンプレート保存
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isLoading}
                aria-label="閉じる"
              />
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* エラーメッセージ */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <div>{error}</div>
                  </div>
                )}

                {/* テンプレート名 */}
                <div className="mb-3">
                  <label htmlFor="templateName" className="form-label">
                    テンプレート名 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="templateName"
                    ref={nameInputRef}
                    value={templateName}
                    onChange={handleNameChange}
                    disabled={isLoading}
                    placeholder="テンプレート名を入力してください"
                    maxLength={100}
                    required
                  />
                  <div className="form-text">
                    {templateName.length}/100文字
                  </div>
                </div>

                {/* SQL内容 */}
                <div className="mb-3">
                  <label htmlFor="sqlContent" className="form-label">
                    SQL内容 <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    id="sqlContent"
                    rows={10}
                    value={sqlContent}
                    onChange={handleSqlChange}
                    disabled={isLoading}
                    placeholder="SQLを入力してください"
                    maxLength={10000}
                    required
                    style={{ 
                      fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                      fontSize: '14px'
                    }}
                  />
                  <div className="form-text">
                    {sqlContent.length}/10000文字
                  </div>
                </div>

                {/* 注意事項 */}
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <small>
                    保存されたテンプレートは、メインページのテンプレート選択から呼び出すことができます。
                    <br />
                    表示順序や表示/非表示の設定は、ユーザーページで変更できます。
                  </small>
                </div>
              </div>

              {/* フッター */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading || !templateName.trim() || !sqlContent.trim()}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin me-2"></i>
                      保存中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      保存
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
