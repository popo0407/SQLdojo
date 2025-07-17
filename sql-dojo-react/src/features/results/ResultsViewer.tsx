import React, { useState, useEffect, useCallback, useRef } from 'react';
import ResultTable from './ResultTable';
import { Alert, Spinner, Stack } from 'react-bootstrap';
import styles from './Results.module.css';
import { useSqlPageStore } from '../../stores/useSqlPageStore';

// 無限スクロール用の型定義
type TableRow = Record<string, string | number | boolean | null>;

type InfiniteScrollData = {
  data: TableRow[];
  columns: string[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
};

const ResultsViewer: React.FC = () => {
  const {
    allData, columns, rowCount, execTime, sortConfig, filters, sessionId, hasMoreData, isLoadingMore,
    isPending, isError, error, applySort, setFilterModal
  } = useSqlPageStore();
  // onSort, onFilter, onLoadMore もストアのアクションを直接呼ぶ形に（仮でコメントアウト）
  // const { onSort, onFilter, onLoadMore } = useSqlPageStore();
  // 無限スクロール用の状態管理
  const [infiniteData, setInfiniteData] = useState<InfiniteScrollData | null>(null);
  // メインコンテンツ全体のref
  const mainContentRef = useRef<HTMLDivElement>(null);

  // 無限スクロールデータの初期化
  useEffect(() => {
    if (allData && columns) {
      setInfiniteData({
        data: allData,
        columns: columns,
        totalCount: rowCount || allData.length,
        hasMore: hasMoreData,
        isLoading: false
      });
    }
  }, [allData, columns, rowCount, hasMoreData]);

  // スクロール監視用のコールバック（2/3以上で発火）
  const handleScroll = useCallback(() => {
    // if (!hasMoreData || isLoadMoreLoading || !onLoadMore || !mainContentRef.current) return; // onLoadMoreはストアから
    if (!hasMoreData || isLoadingMore || !mainContentRef.current) return;
    const container = mainContentRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    // 2/3以上スクロールしたら
    if (scrollTop + clientHeight >= scrollHeight * 2 / 3) {
      // onLoadMore(); // onLoadMoreはストアから
    }
  }, [hasMoreData, isLoadingMore]);

  // スクロールイベントリスナーの設定（メインコンテンツ全体）
  useEffect(() => {
    const container = mainContentRef.current;
    // if (hasMoreData && onLoadMore && container) { // onLoadMoreはストアから
    if (hasMoreData && container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, hasMoreData]);

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
  }, [allData]); // allDataが変更されたらコンテナ情報も再確認

  if (isPending) {
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

  // 不要なAPIエラー分岐を削除し、データ配列の有無のみで分岐
  if (!allData || !columns || columns.length === 0) {
    return <div className="text-center text-muted p-5">実行ボタンを押してSQLを実行してください。</div>;
  }

  // 表示用データの決定（無限スクロールデータがある場合はそちらを使用）
  const displayData = infiniteData || {
    data: allData,
    columns: columns,
    totalCount: rowCount || allData.length,
    hasMore: hasMoreData,
    isLoading: false
  };

  // フィルタ後の実際の総件数（APIレスポンスのtotal_countを使用）
  const actualTotalCount = rowCount || displayData.totalCount;

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
          <span><i className="fas fa-clock me-1"></i> {execTime?.toFixed(3) || 0} 秒</span>
          <span><i className="fas fa-sort me-1"></i> {sortInfo}</span>
          <span><i className="fas fa-filter me-1"></i> {filterInfo}</span>
          {sessionId && <span><i className="fas fa-database me-1"></i> セッション: {sessionId}</span>}
        </div>
        <ResultTable 
          columns={displayData.columns} 
          data={displayData.data} 
          sortConfig={sortConfig}
          onSort={applySort}
          onFilter={(col) => setFilterModal({ show: true, columnName: col, currentFilters: filters[col] || [] })}
          filters={filters}
        />
        {hasMoreData && isLoadingMore && ( // isLoadMoreLoadingはストアから
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