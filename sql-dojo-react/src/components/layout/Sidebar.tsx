import React from 'react';
import { useMetadata } from '../../hooks/useMetadata';
import MetadataTree from '../../features/metadata/MetadataTree';
import { useEditorStore } from '../../stores/useEditorStore';
import styles from '../../styles/Layout.module.css';

const Sidebar: React.FC = () => {
  const { data: schemas, isLoading, isError, error } = useMetadata();
  const applySelectionToEditor = useEditorStore((state) => state.applySelectionToEditor);

  const handleApplySelection = () => {
    applySelectionToEditor();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center text-muted p-2">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">読み込み中...</span>
          </div>
          <span className="ms-2">DB情報読み込み中...</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="alert alert-danger p-2">
          <small>DB情報の取得に失敗しました。<br />{error.message}</small>
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
      <div className="p-2">
        <h5><i className="fas fa-sitemap me-2"></i>DB情報</h5>
        <div className={styles.sidebarAction}>
          <button 
            onClick={handleApplySelection} 
            className={styles.applyButton}
          >
            エディタに反映
          </button>
        </div>
        <div id="metadata-tree">
          {renderContent()}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 