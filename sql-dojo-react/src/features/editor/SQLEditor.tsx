import React, { useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Stack } from 'react-bootstrap';
import styles from './SQLEditor.module.css';
import { useSqlPageStore } from '../../stores/useSqlPageStore';
import { useProgressStore } from '../../stores/useProgressStore';
import { useMonacoEditor } from '../../hooks/useMonacoEditor';
import { useEditorOperations } from '../../hooks/useEditorOperations';
import { useEditorStore } from '../../stores/useEditorStore';
import { useLayoutControl } from '../../hooks/useLayoutControl';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { getEditorOptions } from '../../config/editorConfig';
import { TemplateSaveModal } from '../templates/components/TemplateSaveModal';
import { useTemplates, useTemplateModals } from '../templates/hooks/useTemplates';
import type { TemplateDropdownItem, TemplateWithPreferences } from '../templates/types/template';

const SQLEditor: React.FC = () => {
  // UIストアから状態を取得（isDownloadingを削除）
  
  // SQLページストアからアクションと状態を取得
  const { executeSql, isPending } = useSqlPageStore();
  
  // 進捗ストアから状態を取得
  const { 
    isVisible: showProgress, 
    totalCount, 
    currentCount, 
    progressPercentage, 
    message 
  } = useProgressStore();
  
  // エディタストアから選択状態を取得
  const hasSelection = useEditorStore((state) => state.hasSelection());
  
  // カスタムフックを使用
  const { handleEditorDidMount } = useMonacoEditor();
  const { sql, setSql, handleClear, handleFormat } = useEditorOperations();
  
  // レイアウト制御フックを使用
  useLayoutControl();

  // テンプレート機能のフック
  const { 
    state, 
    getVisibleTemplates, 
    saveTemplate,
    initializeTemplates
  } = useTemplates();

  // テンプレートの初期化
  useEffect(() => {
    initializeTemplates();
  }, [initializeTemplates]);

  const {
    isSaveModalOpen,
    openSaveModal,
    closeSaveModal,
  } = useTemplateModals();

  // テンプレート選択ハンドラ（ツールバーのドロップダウン用）
  const handleSelectTemplateFromToolbar = (templateSql: string) => {
    setSql(templateSql);
  };

  // テンプレート保存ハンドラ
  const handleSaveTemplate = () => {
    openSaveModal();
  };

  // テンプレート変換ユーティリティ
  const convertToDropdownItems = (templates: TemplateWithPreferences[]): TemplateDropdownItem[] => {
    const converted = templates.map(template => ({
      id: template.template_id,
      name: template.name,
      sql: template.sql,
      type: template.type,
      is_common: template.is_common,
      created_at: template.created_at
    }));
    
    return converted;
  };

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* ツールバー */}
      <EditorToolbar
        onFormat={handleFormat}
        onClear={handleClear}
        onExecute={executeSql}
        onSelectTemplate={handleSelectTemplateFromToolbar}
        onSaveTemplate={handleSaveTemplate}
        isPending={isPending}
        hasSql={!!sql.trim()}
        hasSelection={hasSelection}
        templates={convertToDropdownItems(getVisibleTemplates())}
        isTemplatesLoading={state.isLoading}
        progressData={{
          total_count: totalCount,
          current_count: currentCount,
          progress_percentage: progressPercentage,
          message: message,
        }}
        showProgress={showProgress}
      />

      {/* Monaco Editor 本体 */}
      <div className={styles.editorWrapper}>
        <Editor
          height="100%"
          language="sql"
          theme="vs-light"
          value={sql}
          onChange={(value) => setSql(value || '')}
          onMount={handleEditorDidMount}
          options={getEditorOptions()}
        />
      </div>

      {/* テンプレート保存モーダル */}
      <TemplateSaveModal
        isOpen={isSaveModalOpen}
        onClose={closeSaveModal}
        initialSql={sql}
        onSave={async (name: string, sqlContent: string) => {
          await saveTemplate(name, sqlContent);
          closeSaveModal();
        }}
        isLoading={state.isLoading}
      />
    </Stack>
  );
};

export default SQLEditor; 