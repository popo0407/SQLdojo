import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TabManager } from '../tabs/TabManager';
import { TabbedSQLEditor } from '../tabs/TabbedSQLEditor';
import Sidebar from './Sidebar';
import styles from '../../styles/ResizableLayout.module.css';

export const ResizableLayout: React.FC = () => {
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