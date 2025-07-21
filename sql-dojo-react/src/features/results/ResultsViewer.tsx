import React from 'react';
import ResultTable from '../../components/common/ResultTable';
import { Stack } from 'react-bootstrap';
import styles from '../../components/common/ResultTable.module.css';
import { useResultsStore } from '../../stores/useResultsStore';
import { useUIStore } from '../../stores/useUIStore';
import FilterModal from './FilterModal';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useResultsDisplay } from '../../hooks/useResultsDisplay';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { EmptyState } from '../../components/common/EmptyState';
import { ResultsStats } from '../../components/results/ResultsStats';

const ResultsViewer: React.FC = () => {
  // 結果ストアから状態とアクションを取得
  const {
    execTime, sortConfig, filters, sessionId, applySort
  } = useResultsStore();
  
  // UIストアから状態を取得
  const { isPending, isError, error, isLoadingMore, filterModal, setFilterModal } = useUIStore();
  
  // カスタムフックを使用
  const { containerRef, hasMoreData } = useInfiniteScroll();
  const { displayData, actualTotalCount, hasData } = useResultsDisplay();

  // フィルターアイコンクリック時のハンドラ
  const handleFilterClick = (col: string) => {
    setFilterModal({ show: true, columnName: col });
  };

  // ローディング状態
  if (isPending) {
    return <LoadingSpinner message="SQLを実行中..." />;
  }

  // エラー状態
  if (isError) {
    return <ErrorAlert error={error} />;
  }

  // データなし状態
  if (!hasData) {
    return <EmptyState />;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflowY: 'auto', flex: 1 }}>
      <Stack gap={3} className={styles.resultsContainer}>
        <ResultsStats
          totalCount={actualTotalCount}
          execTime={execTime}
          sortConfig={sortConfig}
          filters={filters}
          sessionId={sessionId || undefined}
        />
        <ResultTable 
          columns={displayData.columns} 
          data={displayData.data} 
          sortConfig={sortConfig}
          onSort={applySort}
          onFilter={handleFilterClick}
          filters={filters}
        />
        {/* フィルターモーダルの表示 */}
        {filterModal.show && (
          <FilterModal />
        )}
        {hasMoreData && isLoadingMore && (
          <LoadingSpinner message="読み込み中..." size="sm" />
        )}
      </Stack>
    </div>
  );
};

export default ResultsViewer; 