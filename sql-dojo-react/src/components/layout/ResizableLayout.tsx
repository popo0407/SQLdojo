import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLayoutStore } from '../../stores/useLayoutStore';
import SQLEditor from '../../features/editor/SQLEditor';
import ResultsViewer from '../../features/results/ResultsViewer';
import Sidebar from './Sidebar';
import styles from '../../styles/ResizableLayout.module.css';

export const ResizableLayout: React.FC = () => {
  const { 
    isEditorMaximized, 
    editorHeight, 
    resultsHeight,
    setEditorHeight, 
    setResultsHeight 
  } = useLayoutStore();

  // パネルサイズ変更時のハンドラー
  const handleEditorPanelResize = (sizes: number[]) => {
    if (sizes.length >= 2) {
      setEditorHeight(sizes[0]);
      setResultsHeight(sizes[1]);
    }
  };

  return (
    <div className={styles.layoutContainer}>
      {/* 水平レイアウト: サイドバー + メインエリア */}
      <PanelGroup direction="horizontal" className={styles.horizontalGroup}>
        {/* サイドバー */}
        <Panel 
          defaultSize={25} 
          minSize={15} 
          maxSize={40}
          className={styles.sidebarPanel}
        >
          <Sidebar />
        </Panel>
        
        {/* サイドバーとメインエリアのリサイザー */}
        <PanelResizeHandle className={styles.verticalResizeHandle} />
        
        {/* メインエリア */}
        <Panel className={styles.mainPanel}>
          {/* 垂直レイアウト: エディタ + 結果エリア */}
          <PanelGroup 
            direction="vertical" 
            className={styles.verticalGroup}
            onLayout={handleEditorPanelResize}
          >
            {/* エディタパネル */}
            <Panel 
              defaultSize={editorHeight} 
              minSize={5}
              maxSize={95} // 最大サイズを95%に変更
              className={`${styles.editorPanel} ${isEditorMaximized ? styles.editorMaximized : ''}`}
            >
              <SQLEditor />
            </Panel>
            
            {/* エディタと結果エリアのリサイザー */}
            <PanelResizeHandle 
              className={`${styles.horizontalResizeHandle} ${isEditorMaximized ? styles.hidden : ''}`} 
            />
            
            {/* 結果エリアパネル */}
            <Panel 
              className={`${styles.resultsPanel} ${isEditorMaximized ? styles.hidden : ''}`}
              defaultSize={resultsHeight}
              minSize={isEditorMaximized ? 0 : 5} // 最小サイズを5%に変更
              maxSize={95} // 最大サイズを95%に変更（エディタパネルと統一）
            >
              <ResultsViewer />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}; 