import React from 'react';
import Editor from '@monaco-editor/react';
import { Button, ButtonGroup, Stack, Spinner } from 'react-bootstrap';
import styles from './SQLEditor.module.css';
import { useSqlPageStore } from '../../stores/useSqlPageStore';
import { editor } from 'monaco-editor';

const SQLEditor: React.FC = () => {
  const { sql, setSql } = useSqlPageStore();
  // zustandストアにexecuteSql, downloadCsv, isDownloading等のアクションがある前提で呼び出す
  const executeSql = useSqlPageStore((state) => state.executeSql);
  const downloadCsv = useSqlPageStore((state) => state.downloadCsv);
  const isDownloading = useSqlPageStore((state) => state.isDownloading);
  const setEditor = useSqlPageStore((state) => state.setEditor);

  const handleClear = () => {
    setSql('');
  };

  const handleFormat = () => {
    alert('SQL整形機能は次のフェーズで実装します。');
  };

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* ツールバー */}
      <div className={styles.toolbar}>
        <ButtonGroup>
          <Button variant="outline-secondary" size="sm" onClick={handleFormat}>
            <i className="fas fa-magic me-1"></i>整形
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleClear}>
            <i className="fas fa-eraser me-1"></i>クリア
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={downloadCsv}
            disabled={isDownloading || !sql.trim()}
          >
            {isDownloading ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                ダウンロード中...
              </>
            ) : (
              <>
                <i className="fas fa-download me-1"></i>CSV
              </>
            )}
          </Button>
        </ButtonGroup>
        {/*
          TODO: テンプレート/パーツ機能は後のフェーズで実装
        */}
        <Button variant="success" size="sm" onClick={executeSql}>
          <i className="fas fa-play me-1"></i>実行 (Ctrl+Enter)
        </Button>
      </div>
      {/* Monaco Editor 本体 */}
      <div className={styles.editorWrapper}>
        <Editor
          height="100%"
          language="sql"
          theme="vs-light" // vs-dark or vs-light
          value={sql}
          onChange={(value) => setSql(value || '')}
          onMount={(editorInstance: editor.IStandaloneCodeEditor) => setEditor(editorInstance)}
          options={{
            fontSize: 14,
            fontFamily: 'Fira Code, JetBrains Mono, Courier New, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </div>
    </Stack>
  );
};

export default SQLEditor; 