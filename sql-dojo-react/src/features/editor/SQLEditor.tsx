import React from 'react';
import Editor from '@monaco-editor/react';
import { Stack } from 'react-bootstrap';
import styles from './SQLEditor.module.css';
import { useUIStore } from '../../stores/useUIStore';
import { useSqlPageStore } from '../../stores/useSqlPageStore';
import { useMonacoEditor } from '../../hooks/useMonacoEditor';
import { useEditorOperations } from '../../hooks/useEditorOperations';
import { useEditorStore } from '../../stores/useEditorStore';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { getEditorOptions } from '../../config/editorConfig';

const SQLEditor: React.FC = () => {
  // UIストアから状態を取得
  const { isDownloading, isPending } = useUIStore();
  
  // SQLページストアからアクションを取得
  const { executeSql, downloadCsv } = useSqlPageStore();
  
  // エディタストアから選択状態を取得
  const hasSelection = useEditorStore((state) => state.hasSelection());
  
  // カスタムフックを使用
  const { handleEditorDidMount } = useMonacoEditor();
  const { sql, setSql, handleClear, handleFormat } = useEditorOperations();

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* ツールバー */}
      <EditorToolbar
        onFormat={handleFormat}
        onClear={handleClear}
        onDownloadCsv={downloadCsv}
        onExecute={executeSql}
        isPending={isPending}
        isDownloading={isDownloading}
        hasSql={!!sql.trim()}
        hasSelection={hasSelection}
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
    </Stack>
  );
};

export default SQLEditor; 