import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { SqlExecutionResult } from '../../types/api';
import ResultTable from './ResultTable';
import { Alert, Spinner, Stack } from 'react-bootstrap';
import styles from './Results.module.css';

// SortConfigの型定義をインポートまたは定義
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// FilterConfigの型定義を追加
type FilterConfig = {
  [columnName: string]: string[];
};

// 無限スクロール用の型定義
type TableRow = Record<string, string | number | boolean | null>;

type InfiniteScrollData = {
  data: TableRow[];
  columns: string[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
};

interface ResultsViewerProps {
  result: SqlExecutionResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  // 以下を追記
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  onFilter: (key: string) => void;
  // フィルタ情報を追加
  filters?: FilterConfig;
  // 無限スクロール用のプロパティを追加
  sessionId?: string;
  onLoadMore?: () => void;
  hasMoreData?: boolean;
  isLoadMoreLoading?: boolean;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ 
  result, 
  isLoading, 
  isError, 
  error, 
  sortConfig, 
  onSort, 
  onFilter,
  filters = {},
  sessionId,
  onLoadMore,
  hasMoreData = false,
  isLoadMoreLoading = false
}) => {
  // propsの受け渡しをログ出力
  console.log('🎯 ResultsViewer props:');
  console.log('  hasMoreData:', hasMoreData);
  console.log('  sessionId:', sessionId);
  console.log('  onLoadMore exists:', !!onLoadMore);
  console.log('  isLoadMoreLoading:', isLoadMoreLoading);
  console.log('  result exists:', !!result);
  console.log('  result data length:', result?.data?.length);
  console.log('  result row_count:', result?.row_count);

  // 無限スクロール用の状態管理
  const [infiniteData, setInfiniteData] = useState<InfiniteScrollData | null>(null);
  // メインコンテンツ全体のref
  const mainContentRef = useRef<HTMLDivElement>(null);

  // 無限スクロールデータの初期化
  useEffect(() => {
    if (result && result.success && result.data && result.columns) {
      setInfiniteData({
        data: result.data,
        columns: result.columns,
        totalCount: result.row_count || result.data.length,
        hasMore: hasMoreData,
        isLoading: false
      });
    }
  }, [result, hasMoreData]);

  // スクロール監視用のコールバック（2/3以上で発火）
  const handleScroll = useCallback(() => {
    if (!hasMoreData || isLoadMoreLoading || !onLoadMore || !mainContentRef.current) return;
    const container = mainContentRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    // 2/3以上スクロールしたら
    if (scrollTop + clientHeight >= scrollHeight * 2 / 3) {
      onLoadMore();
    }
  }, [hasMoreData, isLoadMoreLoading, onLoadMore]);

  // スクロールイベントリスナーの設定（メインコンテンツ全体）
  useEffect(() => {
    const container = mainContentRef.current;
    if (hasMoreData && onLoadMore && container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, hasMoreData, onLoadMore]);

  // コンテナの高さとスクロール設定を確認
  useEffect(() => {
    if (mainContentRef.current) {
      const container = mainContentRef.current;
      console.log('📏 コンテナ情報:');
      console.log('  offsetHeight:', container.offsetHeight);
      console.log('  clientHeight:', container.clientHeight);
      console.log('  scrollHeight:', container.scrollHeight);
      console.log('  overflow:', window.getComputedStyle(container).overflow);
      console.log('  overflowY:', window.getComputedStyle(container).overflowY);
    }
  }, [result]);

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">実行中...</span>
        </Spinner>
        <p className="mt-2">SQLを実行中...</p>
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">エラー: {error?.message}</Alert>;
  }
  
  // 表示制限時の処理
  if (result && !result.success && result.message && result.total_count) {
    return (
      <div className="text-center p-5">
        <Alert variant="warning">
          <h5>データが大きすぎます</h5>
          <p>{result.message}</p>
          <p>総件数: {result.total_count.toLocaleString()}件</p>
          <p>CSVダウンロードをご利用ください。</p>
        </Alert>
      </div>
    );
  }
  
  // 実行成功したが、バックエンドでエラーが返ってきた場合
  if (result && !result.success) {
    return <Alert variant="warning">実行エラー: {result.error_message}</Alert>;
  }

  if (!result || !result.data || !result.columns) {
    return <div className="text-center text-muted p-5">実行ボタンを押してSQLを実行してください。</div>;
  }

  // 表示用データの決定（無限スクロールデータがある場合はそちらを使用）
  const displayData = infiniteData || {
    data: result.data,
    columns: result.columns,
    totalCount: result.row_count || result.data.length,
    hasMore: hasMoreData,
    isLoading: false
  };

  // フィルタ後の実際の総件数（APIレスポンスのtotal_countを使用）
  const actualTotalCount = result.row_count || displayData.totalCount;

  // デバッグ用：データ量の確認
  console.log('📊 表示データ情報:');
  console.log('  displayData.data.length:', displayData.data.length);
  console.log('  displayData.columns.length:', displayData.columns.length);
  console.log('  actualTotalCount:', actualTotalCount);
  console.log('  hasMoreData:', hasMoreData);
  console.log('  sessionId:', sessionId);

  // 現在のソート情報を表示
  const sortInfo = sortConfig 
    ? `${sortConfig.key} (${sortConfig.direction === 'asc' ? '昇順' : '降順'})`
    : '並び替えなし';

  // フィルタ情報を表示
  const activeFilters = Object.values(filters).filter((values) => values.length > 0);
  const filterInfo = activeFilters.length > 0
    ? `${activeFilters.length}列でフィルタ適用`
    : 'フィルタなし';

  return (
    <div ref={mainContentRef} style={{ width: '100%', height: '100%', overflowY: 'auto', flex: 1 }}>
      <Stack gap={3} className={styles.resultsContainer}>
        <div className={styles.statsBar}>
          <span><i className="fas fa-list-ol me-1"></i> {actualTotalCount.toLocaleString()} 件</span>
          <span><i className="fas fa-clock me-1"></i> {result.execution_time?.toFixed(3) || 0} 秒</span>
          <span><i className="fas fa-sort me-1"></i> {sortInfo}</span>
          <span><i className="fas fa-filter me-1"></i> {filterInfo}</span>
          {sessionId && <span><i className="fas fa-database me-1"></i> セッション: {sessionId}</span>}
        </div>
        <ResultTable 
          columns={displayData.columns} 
          data={displayData.data} 
          sortConfig={sortConfig}
          onSort={onSort}
          onFilter={onFilter}
          filters={filters}
        />
        {hasMoreData && isLoadMoreLoading && (
          <div className="text-center p-3">
            <Spinner animation="border" size="sm">
              <span className="visually-hidden">読み込み中...</span>
            </Spinner>
          </div>
        )}
      </Stack>
    </div>
  );
};

export default ResultsViewer; 