import React from 'react';
import Editor from '@monaco-editor/react';
import { Button, ButtonGroup, Stack } from 'react-bootstrap';
import styles from './SQLEditor.module.css';

// このコンポーネントが受け取るPropsの型を定義
interface SQLEditorProps {
  sql: string;
  onSqlChange: (value: string | undefined) => void;
  onExecute: () => void;
  onFormat: () => void;
}

const SQLEditor: React.FC<SQLEditorProps> = ({ sql, onSqlChange, onExecute, onFormat }) => {
  
  const handleClear = () => {
    onSqlChange('');
  };

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* ツールバー */}
      <div className={styles.toolbar}>
        <ButtonGroup>
          <Button variant="outline-secondary" size="sm" onClick={onFormat}>
            <i className="fas fa-magic me-1"></i>整形
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleClear}>
            <i className="fas fa-eraser me-1"></i>クリア
          </Button>
        </ButtonGroup>
        {/*
          TODO: テンプレート/パーツ機能は後のフェーズで実装
        */}
        <Button variant="success" size="sm" onClick={onExecute}>
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
          onChange={onSqlChange}
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