import React, { useState, useEffect } from 'react';
import { useMetadata } from '../../hooks/useMetadata';
import MetadataTree from '../../features/metadata/MetadataTree';
import { useTabStore } from '../../stores/useTabStore';
import { useSidebarStore } from '../../stores/useSidebarStore';
import { ParameterContainer } from '../../features/parameters/ParameterContainer';
import MasterDataSidebar from '../master/MasterDataSidebar';
import { useSidebarWidth } from '../../hooks/useSidebarWidth';
import styles from '../../styles/Layout.module.css';
import type { Schema } from '../../types/api';

interface SidebarProps {
  width?: number;
  onWidthChange?: (width: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ width = 400, onWidthChange }) => {
  // アクティブなタブIDを取得
  const { activeTabId } = useTabStore();
  const { applySelectionToEditor } = useSidebarStore();
  const [activeTab, setActiveTab] = useState<'db' | 'master'>('db');
  const [masterTabState, setMasterTabState] = useState<any>(null);
  
  // MetadataProviderが存在しない場合のフォールバック
  let schemas: Schema[] = [];
  let loading = false;
  let error: string | null = null;
  
  try {
    const metadataState = useMetadata();
    schemas = metadataState.data;
    loading = metadataState.loading;
    error = metadataState.error;
  } catch (metadataError: unknown) {
    console.warn('MetadataProvider not found, using fallback state', metadataError);
    schemas = [];
    loading = false;
    error = null;
  }

  const handleApplySelection = () => {
    if (!activeTabId) {
      alert('アクティブなタブがありません。');
      return;
    }
    applySelectionToEditor();
  };

  const handleTabChange = (tab: 'db' | 'master') => {
    setActiveTab(tab);
    // タブ切り替え時に適切な幅を設定
    if (onWidthChange) {
      onWidthChange(tab === 'master' ? 1000 : 400);
    }
  };

  const handleMasterWidthChange = (newWidth: number) => {
    if (onWidthChange) {
      onWidthChange(newWidth);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center text-muted p-2">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
          <span className="ms-2">DB情報読み込み中...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-danger p-2">
          <small>DB情報の取得に失敗しました。<br />{error}</small>
        </div>
      );
    }
    
    if (schemas) {
      return <MetadataTree schemas={schemas} />;
    }
    
    return null;
  };

  return (
    <aside className={styles.sidebar} style={{ width: width }}>
      <div className="p-2" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* パラメータ入力フォーム - アクティブタブ用 */}
        {activeTabId && <ParameterContainer tabId={activeTabId} />}
        
        {/* タブナビゲーション */}
        <div className="mb-2">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'db' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTabChange('db')}
            >
              <i className="fas fa-sitemap me-1"></i>DB情報
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'master' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTabChange('master')}
            >
              <i className="fas fa-database me-1"></i>マスタ情報
            </button>
          </div>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'db' && (
          <>
            <div className={styles.sidebarAction}>
              <button 
                onClick={handleApplySelection} 
                className={styles.applyButton}
              >
                エディタに反映
              </button>
            </div>
            <div id="metadata-tree" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {renderContent()}
            </div>
          </>
        )}

        {activeTab === 'master' && (
          <MasterDataSidebar onWidthChange={handleMasterWidthChange} />
        )}
      </div>
    </aside>
  );
};

export default Sidebar; 