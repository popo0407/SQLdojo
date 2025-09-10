import React, { useEffect } from 'react';
import { Alert, Card } from 'react-bootstrap';
import { useTabStore } from '../../stores/useTabStore';
import ResultsViewer from '../../features/results/ResultsViewer';
import { useResultsDataStore } from '../../stores/useResultsDataStore';
import { useResultsSessionStore } from '../../stores/useResultsSessionStore';
import { useResultsPaginationStore } from '../../stores/useResultsPaginationStore';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import type { TableRow } from '../../types/common';

interface TabResultsViewerProps {
  tabId: string;
}

/**
 * タブ対応結果表示コンポーネント
 * 既存の ResultsViewer を活用してタブごとの結果を表示
 * 無限スクロールやページネーション機能も含む
 */
const TabResultsViewer: React.FC<TabResultsViewerProps> = ({ tabId }) => {
  const { getTab } = useTabStore();
  const tab = getTab(tabId);
  
  // 既存の結果表示ストアを使用
  const { 
    setAllData, 
    setRawData, 
    setColumns, 
    setRowCount, 
    setExecTime, 
    clearResults
  } = useResultsDataStore();
  
  const { setSessionId } = useResultsSessionStore();
  
  // ページネーション関連（タブの結果データ初期化時のみ使用）
  const { setHasMoreData, resetPagination } = useResultsPaginationStore();

  // 無限スクロールフック（これによりcontainerRefとローディング状態を取得）
  const { containerRef, hasMoreData, isLoadingMore } = useInfiniteScroll();

  // タブの結果データを既存ストアに反映
  useEffect(() => {
    if (!tab) {
      clearResults();
      setSessionId(null);
      resetPagination();
      return;
    }

    const { results, sessionState } = tab;
    
    if (results.error) {
      clearResults();
      setSessionId(sessionState.sessionId);
      setHasMoreData(false);
      return;
    }

    if (results.data && results.columns) {
      // タブの結果データを既存の結果表示ストアに設定
      const tableData = Array.isArray(results.data) ? results.data as TableRow[] : [];
      
      // ローカルモード用にrawDataとallDataの両方を設定
      setRawData(tableData);  // フィルタ・ソートの元データ
      setAllData(tableData);  // 現在表示されているデータ
      setColumns(results.columns);
      setRowCount(results.totalCount || tableData.length);
      setExecTime(results.executionTime || 0);
      
      // タブのセッション情報を既存ストアに設定
      setSessionId(sessionState.sessionId);
      
      // ページネーション情報をリセット（タブ切り替え時）
      resetPagination();
      
      // 追加データがあるかどうかを設定（totalCountが実データより多い場合）
      const hasMore = (results.totalCount || 0) > tableData.length;
      setHasMoreData(hasMore);
    } else {
      clearResults();
      setSessionId(sessionState.sessionId);
      setHasMoreData(false);
    }
  }, [tab, setAllData, setRawData, setColumns, setRowCount, setExecTime, setSessionId, clearResults, resetPagination, setHasMoreData]);

  if (!tab) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#6c757d' }}>
        タブが見つかりません: {tabId}
      </div>
    );
  }

  const { results } = tab;

  // エラーがある場合の表示
  if (results.error) {
    return (
      <Card className="mt-3">
        <Card.Body>
          <Alert variant="danger">
            <strong>エラー:</strong> {results.error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // データがない場合の表示
  if (!results.data || !results.columns || results.data.length === 0) {
    return (
      <Card className="mt-3">
        <Card.Body>
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
            <i className="fas fa-table fa-3x mb-3"></i>
            <p>まだ結果がありません。SQLを実行してください。</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // 既存の ResultsViewer コンポーネントを使用（無限スクロール対応のコンテナで包む）
  return (
    <div 
      ref={containerRef} 
      data-testid="tab-results-viewer-root" 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflowY: 'auto', 
        flex: 1 
      }}
    >
      <ResultsViewer />
      {/* 無限スクロールのローディング表示 */}
      {hasMoreData && isLoadingMore && (
        <div style={{ 
          textAlign: 'center', 
          padding: '1rem', 
          color: '#6c757d' 
        }}>
          <i className="fas fa-spinner fa-spin"></i> 読み込み中...
        </div>
      )}
    </div>
  );
};

export default TabResultsViewer;