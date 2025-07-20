import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlay, 
  faDownload, 
  faMagic, 
  faTrash,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';
import { useLayoutStore } from '../../stores/useLayoutStore';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  onFormat: () => void;
  onClear: () => void;
  onDownloadCsv: () => void;
  onExecute: () => void;
  isPending: boolean;
  isDownloading: boolean;
  hasSql: boolean;
  hasSelection: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormat,
  onClear,
  onDownloadCsv,
  onExecute,
  isPending,
  isDownloading,
  hasSql,
  hasSelection
}) => {
  const { isEditorMaximized, toggleEditorMaximized } = useLayoutStore();

  return (
    <div className={styles.toolbar}>
      <div className={styles.leftSection}>
        <ButtonGroup size="sm">
          <Button
            variant="primary"
            onClick={onExecute}
            disabled={!hasSql || isPending}
            title={hasSelection ? "選択範囲のSQLを実行" : "SQLを実行"}
          >
            <FontAwesomeIcon icon={faPlay} className="me-1" />
            {isPending ? "実行中..." : "実行"}
          </Button>
          
          <Button
            variant="outline-secondary"
            onClick={onFormat}
            disabled={!hasSql}
            title="SQLをフォーマット"
          >
            <FontAwesomeIcon icon={faMagic} className="me-1" />
            フォーマット
          </Button>
          
          <Button
            variant="outline-secondary"
            onClick={onClear}
            disabled={!hasSql}
            title="SQLをクリア"
          >
            <FontAwesomeIcon icon={faTrash} className="me-1" />
            クリア
          </Button>
        </ButtonGroup>
      </div>
      
      <div className={styles.rightSection}>
        <ButtonGroup size="sm">
          <Button
            variant="outline-primary"
            onClick={onDownloadCsv}
            disabled={isDownloading}
            title="CSVダウンロード"
          >
            <FontAwesomeIcon icon={faDownload} className="me-1" />
            {isDownloading ? "ダウンロード中..." : "CSV"}
          </Button>
          
          <Button
            variant="outline-secondary"
            onClick={toggleEditorMaximized}
            title={isEditorMaximized ? "エディタを最小化" : "エディタを最大化"}
          >
            <FontAwesomeIcon 
              icon={isEditorMaximized ? faCompress : faExpand} 
              className="me-1" 
            />
            {isEditorMaximized ? "最小化" : "最大化"}
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}; 