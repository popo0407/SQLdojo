import React from 'react';
import SQLEditor from '../features/editor/SQLEditor';
import ResultsViewer from '../features/results/ResultsViewer';
import FilterModal from '../features/results/FilterModal';
import { useSqlPageStore } from '../stores/useSqlPageStore';

const HomePage: React.FC = () => {
  const { allData, showLimitDialog, limitDialogData, setShowLimitDialog, setLimitDialogData } = useSqlPageStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 上段：エディタ */}
      <div style={{ height: '40vh', minHeight: '200px' }}>
        <SQLEditor />
      </div>
      <div style={{ flexGrow: 1, marginTop: '1rem', display: 'flex', overflow: 'hidden' }}>
        <ResultsViewer />
      </div>
      {/* フィルタモーダル */}
      {allData && allData.length > 0 && (
        <FilterModal />
      )}
      {/* 表示制限ダイアログ */}
      {showLimitDialog && limitDialogData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h4>データが大きすぎます</h4>
            <p>{limitDialogData.message}</p>
            <p>総件数: {limitDialogData.totalCount.toLocaleString()}件</p>
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={() => {/* CSVダウンロードはストアのdownloadCsvを直接呼ぶ */}}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  marginRight: '0.5rem'
                }}
              >
                CSVダウンロード
              </button>
              <button 
                onClick={() => {
                  setShowLimitDialog(false);
                  setLimitDialogData(null);
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px'
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;