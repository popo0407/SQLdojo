import React from 'react';
import ResultTable from '../../components/common/ResultTable';
import { Stack } from 'react-bootstrap';
import styles from '../../components/common/ResultTable.module.css';
import { useResultsDataStore } from '../../stores/useResultsDataStore';
import { useResultsFilterStore } from '../../stores/useResultsFilterStore';
import { useResultsSessionStore } from '../../stores/useResultsSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import FilterModal from './FilterModal';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useResultsDisplay } from '../../hooks/useResultsDisplay';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { EmptyState } from '../../components/common/EmptyState';
import { ResultsStats } from '../../components/results/ResultsStats';
import ExportControls from '../../components/results/ExportControls';

const ResultsViewer: React.FC = () => {
  // 各ストアから状態とアクションを取得
  const execTime = useResultsDataStore(state => state.execTime);
  const { sortConfig, filters, applySort } = useResultsFilterStore();
  const sessionId = useResultsSessionStore(state => state.sessionId);

  // UIストアから状態を取得
  const { isPending, isLoadingMore, filterModal, setFilterModal, error, isDownloading } = useUIStore();

  // SQLページストアからCSVダウンロード機能を取得
  // CSVダウンロードは ExportControls 内に統合済み

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
  if (error) {
    return <ErrorAlert error={new Error(error)} />;
  }

  // データなし状態
  if (!hasData) {
    return <EmptyState />;
  }

  return (
    <div ref={containerRef} data-testid="results-viewer-root" style={{ width: '100%', height: '100%', overflowY: 'auto', flex: 1 }}>
      <Stack gap={3} className={styles.resultsContainer}>
        <ResultsStats
          totalCount={actualTotalCount}
          execTime={execTime}
          sortConfig={sortConfig}
          filters={filters}
          sessionId={sessionId || undefined}
          isDownloading={isDownloading}
          rightExtras={<ExportControls compact />}
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