import React, { useState, useEffect } from 'react';
import { useMetadata } from '../../hooks/useMetadata';
import MetadataTree from '../../features/metadata/MetadataTree';
import { useTabStore } from '../../stores/useTabStore';
import { useSidebarStore } from '../../stores/useSidebarStore';
import { ParameterContainer } from '../../features/parameters/ParameterContainer';
import MasterDataSidebar from '../master/MasterDataSidebar';
import styles from '../../styles/Layout.module.css';
import type { Schema } from '../../types/api';

interface SidebarProps {
  width?: number;
  onWidthChange?: (width: number) => void;
  activeTab?: 'db' | 'master';
  onTabChange?: (tab: 'db' | 'master') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  width = 400, 
  onWidthChange,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange
}) => {
  // アクティブなタブIDを取得
  const { activeTabId } = useTabStore();
  const { applySelectionToEditor } = useSidebarStore();
  // 外部から activeTab が渡された場合はそれを使用、そうでなければ内部状態を使用
  const [internalActiveTab, setInternalActiveTab] = useState<'db' | 'master'>('db');
  const activeTab = externalActiveTab ?? internalActiveTab;
  
  // activeTabの変化をログに出力
  useEffect(() => {
    console.log('Sidebar - activeTab changed to:', activeTab);
  }, [activeTab]);
  
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
    console.log('Sidebar - handleTabChange called with tab:', tab);
    console.log('Sidebar - current activeTab before change:', activeTab);
    
    if (externalOnTabChange) {
      // 外部から onTabChange が渡されている場合はそれを使用
      externalOnTabChange(tab);
    } else {
      // 内部状態を使用
      setInternalActiveTab(tab);
      if (onWidthChange) {
        const newWidth = tab === 'master' ? 1000 : 400;
        onWidthChange(newWidth);
      }
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
          <MasterDataSidebar />
        )}
      </div>
    </aside>
  );
};

export default Sidebar; 