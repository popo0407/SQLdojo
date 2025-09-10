import React from 'react';
import { useMetadata } from '../../hooks/useMetadata';
import MetadataTree from '../../features/metadata/MetadataTree';
import { useEditorStore } from '../../stores/useEditorStore';
import { useTabStore } from '../../stores/useTabStore';
import { ParameterContainer } from '../../features/parameters/ParameterContainer';
import styles from '../../styles/Layout.module.css';
import type { Schema } from '../../types/api';

const Sidebar: React.FC = () => {
  // アクティブなタブIDを取得
  const { activeTabId } = useTabStore();
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
  
  const applySelectionToEditor = useEditorStore((state) => state.applySelectionToEditor);

  const handleApplySelection = () => {
    applySelectionToEditor();
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
    <aside className={styles.sidebar}>
      <div className="p-2" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* パラメータ入力フォーム - アクティブタブ用 */}
        {activeTabId && <ParameterContainer tabId={activeTabId} />}
        
        <h5><i className="fas fa-sitemap me-2"></i>DB情報</h5>
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
      </div>
    </aside>
  );
};

export default Sidebar; 