import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TabManager } from '../tabs/TabManager';
import { TabbedSQLEditor } from '../tabs/TabbedSQLEditor';
import Sidebar from './Sidebar';
import styles from '../../styles/ResizableLayout.module.css';

export const ResizableLayout: React.FC = () => {
  const [sidebarWidth, setSidebarWidth] = useState(400);

  const handleSidebarWidthChange = (width: number) => {
    setSidebarWidth(width);
  };

  // 画面幅に対するサイドバーのパーセンテージを計算
  const getSidebarPercentage = () => {
    const screenWidth = window.innerWidth;
    return Math.min((sidebarWidth / screenWidth) * 100, 60); // 最大60%
  };

  return (
    <div className={styles.layoutContainer}>
      {/* 水平レイアウト: サイドバー + メインエリア */}
      <PanelGroup direction="horizontal" className={styles.horizontalGroup}>
        {/* サイドバー */}
        <Panel 
          defaultSize={getSidebarPercentage()} 
          minSize={15} 
          maxSize={60}
          className={styles.sidebarPanel}
        >
          <Sidebar width={sidebarWidth} onWidthChange={handleSidebarWidthChange} />
        </Panel>
        
        {/* サイドバーとメインエリアのリサイザー */}
        <PanelResizeHandle className={styles.verticalResizeHandle} />
        
        {/* メインエリア（タブ機能統合） */}
        <Panel className={styles.mainPanel}>
          <TabManager>
            {(activeTabId) => 
              activeTabId ? (
                <TabbedSQLEditor tabId={activeTabId} />
              ) : (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: '#6c757d'
                }}>
                  タブを選択してください
                </div>
              )
            }
          </TabManager>
        </Panel>
      </PanelGroup>
    </div>
  );
};