import React from 'react';
import Editor from '@monaco-editor/react';
import { Stack } from 'react-bootstrap';
import styles from './SQLEditor.module.css';
import { useUIStore } from '../../stores/useUIStore';
import { useSqlPageStore } from '../../stores/useSqlPageStore';
import { useMonacoEditor } from '../../hooks/useMonacoEditor';
import { useEditorOperations } from '../../hooks/useEditorOperations';
import { useEditorStore } from '../../stores/useEditorStore';
import { useLayoutControl } from '../../hooks/useLayoutControl';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { getEditorOptions } from '../../config/editorConfig';
import { MainPageTemplate } from '../templates/components/MainPageTemplate';

const SQLEditor: React.FC = () => {
  // UIストアから状態を取得
  const { isDownloading } = useUIStore();
  
  // SQLページストアからアクションと状態を取得
  const { executeSql, downloadCsv, isPending } = useSqlPageStore();
  
  // エディタストアから選択状態を取得
  const hasSelection = useEditorStore((state) => state.hasSelection());
  
  // カスタムフックを使用
  const { handleEditorDidMount } = useMonacoEditor();
  const { sql, setSql, handleClear, handleFormat } = useEditorOperations();
  
  // レイアウト制御フックを使用
  useLayoutControl();

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* テンプレート機能 */}
      <MainPageTemplate 
        onInsertTemplate={(templateSql: string) => setSql(templateSql)}
        onGetEditorContent={() => sql}
        onGetSelectedContent={() => {
          // 選択されたテキストを取得する場合の処理
          // 現在は全体のSQLを返す
          return sql;
        }}
        hasSelection={hasSelection}
      />
      
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