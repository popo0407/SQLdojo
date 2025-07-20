import React from 'react';
import { Button, ButtonGroup, Spinner } from 'react-bootstrap';
import styles from '../../features/editor/SQLEditor.module.css';

interface EditorToolbarProps {
  onFormat: () => void;
  onClear: () => void;
  onDownloadCsv: () => void;
  onExecute: () => void;
  isPending: boolean;
  isDownloading: boolean;
  hasSql: boolean;
  hasSelection?: boolean;
}

/**
 * エディタのツールバーコンポーネント
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormat,
  onClear,
  onDownloadCsv,
  onExecute,
  isPending,
  isDownloading,
  hasSql,
  hasSelection = false
}) => {
  return (
    <div className={styles.toolbar}>
      <ButtonGroup>
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={onFormat}
          disabled={isPending || !hasSql}
        >
          {isPending ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              整形中...
            </>
          ) : (
            <>
              <i className="fas fa-magic me-1"></i>整形
            </>
          )}
        </Button>
        <Button variant="outline-secondary" size="sm" onClick={onClear}>
          <i className="fas fa-eraser me-1"></i>クリア
        </Button>
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={onDownloadCsv}
          disabled={isDownloading || !hasSql}
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
      <Button variant="success" size="sm" onClick={onExecute}>
        <i className="fas fa-play me-1"></i>
        {hasSelection ? '選択範囲実行' : '実行'} (Ctrl+Enter)
      </Button>
    </div>
  );
}; 