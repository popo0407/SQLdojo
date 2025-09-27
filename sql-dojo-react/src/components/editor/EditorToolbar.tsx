import React from 'react';
import { Button, ButtonGroup, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlay, 
  faMagic, 
  faTrash,
  faExpand,
  faCompress,
  faFileCode,
  faSave,
  faDownload,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';
import { useLayoutStore } from '../../stores/useLayoutStore';
import { useTabStore } from '../../stores/useTabStore';
import { SqlProgressIndicator } from '../common/SqlProgressIndicator';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  onFormat: () => void;
  onClear: () => void;
  onExecute: () => void;
  onSelectTemplate: (templateSql: string) => void;
  onSaveTemplate: () => void;
  onDownloadCsv?: () => void; // CSV直接ダウンロード用（オプション）
  onGenerateDummyData?: () => void; // ダミーデータ生成用（オプション）
  isPending: boolean;
  hasSql: boolean;
  hasSelection: boolean;
  templates?: Array<{ id: string; name: string; sql: string; type: string }>;
  isTemplatesLoading?: boolean;
  tabId?: string; // タブ固有のレイアウト状態管理用
  hasChart?: boolean; // グラフが表示されているかどうか
  // 進捗表示用のprops
  progressData?: {
    total_count?: number;
    current_count?: number;
    progress_percentage?: number;
    message?: string;
  };
  showProgress?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormat,
  onClear,
  onExecute,
  onSelectTemplate,
  onSaveTemplate,
  onDownloadCsv,
  onGenerateDummyData,
  isPending,
  hasSql,
  hasSelection,
  templates = [],
  isTemplatesLoading = false,
  progressData,
  showProgress = false,
  tabId,
  hasChart = false
}) => {
  // タブIDが提供されている場合はタブ固有の状態、そうでなければグローバル状態
  const globalLayoutStore = useLayoutStore();
  const { getTab, updateTabLayoutState } = useTabStore();
  
  const tab = tabId ? getTab(tabId) : null;
  const isEditorMaximized = tab ? tab.layoutState.isEditorMaximized : globalLayoutStore.isEditorMaximized;
  
  const toggleEditorMaximized = () => {
    if (tab && tabId) {
      // タブ固有のレイアウト状態を更新
      updateTabLayoutState(tabId, { isEditorMaximized: !tab.layoutState.isEditorMaximized });
    } else {
      // グローバルレイアウト状態を更新
      globalLayoutStore.toggleEditorMaximized();
    }
  };

  const handleDownloadCsv = () => {
    if (hasSql) {
      if (onDownloadCsv) {
        // タブエディタの場合は統合管理経由
        onDownloadCsv();
      } else {
        // 元エディタの場合は廃止予定（レガシー対応）
        console.warn('Legacy editor download not supported');
      }
    }
  };

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.leftSection}>
          <ButtonGroup size="sm">
            <Button
              variant="outline-secondary"
              onClick={onClear}
              disabled={!hasSql}
              title="SQLをクリア"
            >
              <FontAwesomeIcon icon={faTrash} className="me-1" />
              クリア
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
            
            <Dropdown>
              <Dropdown.Toggle
                variant="outline-info"
                size="sm"
                disabled={isTemplatesLoading}
                title="テンプレート選択"
              >
                <FontAwesomeIcon icon={faFileCode} className="me-1" />
                {isTemplatesLoading ? "読み込み中..." : `テンプレート選択 (${templates.length})`}
              </Dropdown.Toggle>
              
              <Dropdown.Menu>
                {isTemplatesLoading ? (
                  <Dropdown.ItemText>読み込み中...</Dropdown.ItemText>
                ) : templates.length === 0 ? (
                  <Dropdown.ItemText>テンプレートがありません</Dropdown.ItemText>
                ) : (
                  templates.map((template) => (
                    <Dropdown.Item
                      key={template.id}
                      onClick={() => onSelectTemplate(template.sql)}
                      title={template.sql}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-medium">{template.name}</span>
                        <small className="text-muted ms-2">
                          {template.type === 'admin' ? '管理者' : 'ユーザー'}
                        </small>
                      </div>
                      <small className="text-muted d-block text-truncate" style={{ maxWidth: '250px' }}>
                        {template.sql}
                      </small>
                    </Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>
            
            <Button
              variant={hasChart ? "primary" : "outline-success"}
              onClick={onSaveTemplate}
              disabled={!hasSql}
              title="テンプレート保存"
            >
              <FontAwesomeIcon icon={faSave} className="me-1" />
              テンプレート保存
            </Button>
            
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
              variant="outline-dark"
              onClick={handleDownloadCsv}
              disabled={!hasSql || isPending}
              title="結果をCSVで直接ダウンロード"
            >
              <FontAwesomeIcon icon={faDownload} className="me-1" />
              CSVダウンロード
            </Button>

            <Button
              variant="outline-info"
              onClick={onGenerateDummyData}
              title="グラフテスト用のダミーデータを生成"
            >
              <FontAwesomeIcon icon={faDatabase} className="me-1" />
              ダミーデータ生成
            </Button>
          </ButtonGroup>
        </div>
        
        <div className={styles.rightSection}>
          <ButtonGroup size="sm">
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

      {/* 進捗表示オーバーレイ */}
      <SqlProgressIndicator
        total_count={progressData?.total_count}
        current_count={progressData?.current_count}
        progress_percentage={progressData?.progress_percentage}
        message={progressData?.message}
        isVisible={showProgress}
      />
    </>
  );
};