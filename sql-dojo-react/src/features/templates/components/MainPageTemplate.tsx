import React, { useCallback, useEffect, useState, useRef } from 'react';
import { TemplateDropdown } from './TemplateDropdown';
import { TemplateSaveModal } from './TemplateSaveModal';
import { useTemplates, useTemplateModals } from '../hooks/useTemplates';
import type { TemplateDropdownItem } from '../types/template';

/**
 * メインページテンプレート統合コンポーネントのProps
 */
interface MainPageTemplateProps {
  // エディタとの連携用コールバック
  onInsertTemplate: (sql: string) => void;
  onGetEditorContent: () => string;
  onGetSelectedContent: () => string;
  
  // エディタの選択状態
  hasSelection: boolean;
  
  // 追加のクラス名
  className?: string;
}

/**
 * メインページテンプレート統合コンポーネント
 * ドロップダウンと保存モーダルを統合し、既存のエディタと連携する
 */
export const MainPageTemplate: React.FC<MainPageTemplateProps> = ({
  onInsertTemplate,
  onGetEditorContent,
  onGetSelectedContent,
  hasSelection,
  className = '',
}) => {
  const { 
    state, 
    getVisibleTemplates, 
    saveTemplate, 
    initializeTemplates,
    actions 
  } = useTemplates();

  const {
    isSaveModalOpen,
    openSaveModal,
    closeSaveModal,
  } = useTemplateModals();

  // 初期化処理を再有効化
  const [isInitialized, setIsInitialized] = useState(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!isInitialized && !state.isInitialized && !initializingRef.current) {
      setIsInitialized(true);
      initializingRef.current = true;
      console.log('MainPageTemplate: Starting template initialization...');
      // initializeTemplatesを使用して統一
      initializeTemplates().then(() => {
        // 初期化完了
        console.log('MainPageTemplate: Template initialization completed');
        initializingRef.current = false;
      }).catch((error) => {
        console.error('テンプレート初期化エラー:', error);
        setIsInitialized(false); // エラー時はリセット
        initializingRef.current = false;
      });
    } else if (!isInitialized && state.isInitialized) {
      // 既にグローバル初期化済みの場合
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, state.isInitialized]);

  /**
   * テンプレート選択時の処理
   */
  const handleSelectTemplate = useCallback((template: TemplateDropdownItem) => {
    onInsertTemplate(template.sql);
  }, [onInsertTemplate]);

  /**
   * テンプレート保存ボタンクリック時の処理
   */
  const handleSaveButtonClick = useCallback(() => {
    openSaveModal();
  }, [openSaveModal]);

  /**
   * テンプレート保存処理
   */
  const handleSaveTemplate = useCallback(async (name: string, sql: string) => {
    const success = await saveTemplate(name, sql);
    if (success) {
      closeSaveModal();
    }
  }, [saveTemplate, closeSaveModal]);

  /**
   * 保存対象のSQL内容を取得
   */
  const getSqlToSave = useCallback((): string => {
    if (hasSelection) {
      const selected = onGetSelectedContent();
      if (selected.trim()) {
        return selected;
      }
    }
    return onGetEditorContent();
  }, [hasSelection, onGetSelectedContent, onGetEditorContent]);

  // 表示可能なテンプレート一覧を取得
  const visibleTemplates = getVisibleTemplates();

  return (
    <div className={`main-page-template ${className}`}>
      {/* テンプレート操作ボタン群 */}
      <div className="template-controls d-flex gap-2 align-items-center">
        {/* テンプレート選択ドロップダウン */}
        <TemplateDropdown
          templates={visibleTemplates}
          onSelectTemplate={handleSelectTemplate}
          isLoading={state.isLoadingDropdown}
          className="flex-grow-1"
        />

        {/* テンプレート保存ボタン */}
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={handleSaveButtonClick}
          disabled={state.isLoading}
          title={hasSelection 
            ? "選択されたSQLをテンプレートとして保存" 
            : "エディタ全体のSQLをテンプレートとして保存"
          }
        >
          <i className="fas fa-save me-2"></i>
          テンプレート保存
        </button>
      </div>

      {/* エラー表示 */}
      {state.error && (
        <div className="alert alert-danger mt-2 mb-0" role="alert">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {state.error}
            </div>
            <button
              type="button"
              className="btn-close btn-sm"
              onClick={() => actions.clearError()}
              aria-label="エラーを閉じる"
            />
          </div>
        </div>
      )}

      {/* テンプレート保存モーダル */}
      <TemplateSaveModal
        isOpen={isSaveModalOpen}
        onClose={closeSaveModal}
        onSave={handleSaveTemplate}
        initialSql={getSqlToSave()}
        isLoading={state.isLoading}
      />

      {/* 追加のスタイル */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .main-page-template {
            width: 100%;
          }

          .template-controls {
            flex-wrap: wrap;
          }

          @media (max-width: 768px) {
            .template-controls {
              flex-direction: column;
            }
            
            .template-controls .btn {
              width: 100%;
            }
          }
        `
      }} />
    </div>
  );
};

/**
 * メインページテンプレート統合用のプロバイダー付きコンポーネント
 * 使用する際は、このコンポーネントをTemplateProvider内で使用してください
 */
export default MainPageTemplate;
