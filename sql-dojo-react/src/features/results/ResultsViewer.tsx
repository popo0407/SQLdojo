import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTable, faChartLine } from '@fortawesome/free-solid-svg-icons';
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
import ResultsHeaderExtras from '../../components/results/ResultsHeaderExtras';
import ChartViewer from './ChartViewer';
import ChartConfigModal from './ChartConfigModal';
import { useChartStore } from '../../stores/useChartStore';

import { createDefaultChartConfig, type ChartConfig } from '../../utils/chartUtils';

const ResultsViewer: React.FC = () => {
  // 各ストアから状態とアクションを取得
  const execTime = useResultsDataStore(state => state.execTime);
  const { sortConfig, filters, applySort } = useResultsFilterStore();
  const sessionId = useResultsSessionStore(state => state.sessionId);

  // UIストアから状態を取得
  const { isPending, isLoadingMore, filterModal, setFilterModal, error, isDownloading } = useUIStore();

  // SQLページストアからCSVダウンロード機能を取得
  // CSVダウンロードは ExportControls 内に統合済み
  
  // チャートストアから状態とアクションを取得
  const { 
    currentConfig, 
    viewMode, 
    modalState, 
    setViewMode, 
    setChartConfig, 
    showChartModal, 
    hideChartModal 
  } = useChartStore();

  // カスタムフックを使用
  const { containerRef, hasMoreData } = useInfiniteScroll();
  const { displayData, actualTotalCount, hasData } = useResultsDisplay();

  // フィルターアイコンクリック時のハンドラ
  const handleFilterClick = (col: string) => {
    // 現在のフィルター値を取得
    const currentColumnFilters = filters[col] || [];
    
    // currentFiltersを含めてモーダル状態を設定
    setFilterModal({ 
      show: true, 
      columnName: col, 
      currentFilters: currentColumnFilters 
    });
  };

  // グラフ作成ボタンクリック時のハンドラ
  const handleCreateChart = () => {
    // 既存の設定があれば使用し、なければデフォルト設定を作成
    const configToUse = currentConfig || createDefaultChartConfig();
    showChartModal(configToUse);
  };

  // グラフ設定適用時のハンドラ
  const handleApplyChartConfig = (config: ChartConfig) => {
    setChartConfig(config);
  };

  // 表示切替ボタンのハンドラ
  const handleToggleView = () => {
    setViewMode(viewMode === 'table' ? 'chart' : 'table');
  };

  // 表示切替ボタンのレンダリング
  const renderViewToggleButton = () => {
    if (!currentConfig) return null;
    
    return (
      <Button
        variant={viewMode === 'table' ? 'outline-primary' : 'outline-secondary'}
        size="sm"
        onClick={handleToggleView}
        title={viewMode === 'table' ? 'グラフ表示' : 'テーブル表示'}
      >
        <FontAwesomeIcon icon={viewMode === 'table' ? faChartLine : faTable} className="me-1" />
        {viewMode === 'table' ? 'グラフ' : 'テーブル'}
      </Button>
    );
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
          onCreateChart={handleCreateChart}
          rightExtras={
            <>
              {renderViewToggleButton()}
              <ResultsHeaderExtras />
            </>
          }
        />
{/* 表示内容の切り替え */}
        {viewMode === 'table' ? (
          <ResultTable 
            columns={displayData.columns} 
            data={displayData.data} 
            sortConfig={sortConfig}
            onSort={applySort}
            onFilter={handleFilterClick}
            filters={filters}
          />
        ) : (
          currentConfig && (
            <ChartViewer
              data={displayData.data}
              config={currentConfig}
            />
          )
        )}
        {/* フィルターモーダルの表示 */}
        {filterModal.show && (
          <FilterModal />
        )}
        {hasMoreData && isLoadingMore && (
          <LoadingSpinner message="読み込み中..." size="sm" />
        )}
        {/* チャート設定モーダルの表示 */}
        {modalState.show && (
          <ChartConfigModal
            show={modalState.show}
            onHide={hideChartModal}
            onApply={handleApplyChartConfig}
            data={displayData.data}
            columns={displayData.columns}
            initialConfig={modalState.config}
          />
        )}
      </Stack>
    </div>
  );
};

export default ResultsViewer; 