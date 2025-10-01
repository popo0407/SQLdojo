import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTabStore } from '../../stores/useTabStore';
import TabSQLEditor from './TabSQLEditor';
import TabResultsViewer from './TabResultsViewer';
import styles from './TabbedSQLEditor.module.css';

interface TabbedSQLEditorProps {
  tabId: string;
}

/**
 * タブ化されたSQLエディタ＋結果表示コンポーネント
 * 各タブで独立したエディタと結果表示を提供
 */
export const TabbedSQLEditor: React.FC<TabbedSQLEditorProps> = ({ tabId }) => {
  const { getTab, updateTabLayoutState } = useTabStore();
  
  const tab = getTab(tabId);
  
  if (!tab) {
    return (
      <div className={styles.errorContainer}>
        <p>タブが見つかりません: {tabId}</p>
      </div>
    );
  }

  // パネルサイズ変更時のハンドラー
  const handlePanelResize = (sizes: number[]) => {
    if (sizes.length >= 2) {
      updateTabLayoutState(tabId, {
        editorHeight: sizes[0],
        resultsHeight: sizes[1],
      });
    }
  };

  return (
    <div className={styles.tabbedEditorContainer}>
      {/* 垂直レイアウト: エディタ + 結果エリア */}
      <PanelGroup 
        direction="vertical" 
        className={styles.verticalGroup}
        onLayout={handlePanelResize}
      >
        {/* エディタパネル */}
        <Panel 
          defaultSize={tab.layoutState.editorHeight} 
          minSize={5}
          maxSize={95}
          className={`${styles.tabEditorPanel} ${tab.layoutState.isEditorMaximized ? styles.editorMaximized : ''}`}
        >
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TabSQLEditor tabId={tabId} />
          </div>
        </Panel>
        
        {/* エディタと結果エリアのリサイザー */}
        <PanelResizeHandle 
          className={`${styles.horizontalResizeHandle} ${tab.layoutState.isEditorMaximized ? styles.hidden : ''}`} 
        />
        
        {/* 結果エリアパネル */}
        <Panel 
          className={`${styles.resultsPanel} ${tab.layoutState.isEditorMaximized ? styles.hidden : ''}`}
          defaultSize={tab.layoutState.resultsHeight}
          minSize={tab.layoutState.isEditorMaximized ? 0 : 5}
          maxSize={95}
        >
          <TabResultsViewer tabId={tabId} />
        </Panel>
      </PanelGroup>
    </div>
  );
};
