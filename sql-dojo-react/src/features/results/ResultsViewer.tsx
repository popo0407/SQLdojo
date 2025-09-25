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
import { useProgressStore } from '../../stores/useProgressStore';
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
import { readSqlCache } from '../../api/sqlService';

import { createDefaultChartConfig, type SimpleChartConfig } from '../../utils/chartUtils';

const ResultsViewer: React.FC = () => {
  // 各ストアから状態とアクションを取得
  const execTime = useResultsDataStore(state => state.execTime);
  const { sortConfig, filters, applySort } = useResultsFilterStore();
  const sessionId = useResultsSessionStore(state => state.sessionId);

  // チャート用のデータ状態管理
  const [chartData, setChartData] = React.useState<Record<string, unknown>[]>([]);

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
  const handleApplyChartConfig = async (config: SimpleChartConfig) => {
    setChartConfig(config);
    
    // 新しい設定でチャートデータを準備
    await prepareChartData(config);
  };

  // 表示中データの取得
  const getDisplayedData = React.useCallback(() => {
    // 現在のページサイズに基づいて表示されているデータのみを返す
    const pageSize = sessionId ? 
      (useResultsSessionStore.getState().configSettings?.default_page_size || 100) : 
      100;
    return displayData.data.slice(0, pageSize);
  }, [displayData.data, sessionId]);

  // 全フィルター済みデータの取得
  const fetchAllFilteredData = React.useCallback(async () => {
    if (!sessionId) {
      // セッションIDがない場合は現在のdisplayDataを返す
      return displayData.data;
    }

    try {
      // 全件取得のために非常に大きなpage_sizeを指定
      const readRes = await readSqlCache({
        session_id: sessionId,
        page: 1,
        page_size: 1000000, // 100万件まで対応
        filters: filters,
        sort_by: sortConfig?.key,
        sort_order: (sortConfig?.direction?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
      });

      if (readRes.success && readRes.data && readRes.columns) {
        const allData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        );
        return allData;
      }
    } catch (error) {
      console.error('全データ取得に失敗:', error);
    }
    
    // 失敗時は現在のデータを返す
    return displayData.data;
  }, [sessionId, displayData.data, filters, sortConfig]);

  // チャート用データの決定
  const getChartData = React.useCallback(async (config: SimpleChartConfig) => {
    if (!config) return displayData.data;
    
    if (config.dataScope === 'all') {
      // 全データを取得（フィルター・ソート適用済みの全件）
      return await fetchAllFilteredData();
    } else {
      // 表示データを使用（現在画面に表示されている範囲のみ）
      return getDisplayedData();
    }
  }, [displayData.data, fetchAllFilteredData, getDisplayedData]);

  // チャートデータの準備
  const prepareChartData = React.useCallback(async (config: SimpleChartConfig) => {
    const progressStore = useProgressStore.getState();
    progressStore.showProgress({
      message: 'チャートデータを準備中...'
    });
    try {
      const data = await getChartData(config);
      setChartData(data);
      
      // 成功時は1秒後に進捗表示を隠す
      setTimeout(() => {
        progressStore.hideProgress();
      }, 1000);
    } catch (error) {
      console.error('チャートデータ準備に失敗:', error);
      setChartData(displayData.data); // フォールバック
      progressStore.hideProgress();
    }
  }, [getChartData, displayData.data]);

  // currentConfigが変更されたときもチャートデータを更新
  React.useEffect(() => {
    if (currentConfig) {
      prepareChartData(currentConfig);
    }
  }, [currentConfig, prepareChartData]);

  // チャート用カラムの決定
  const getChartColumns = () => {
    if (!currentConfig) return displayData.columns;
    
    // すべてのケースで同じカラムを使用
    return displayData.columns;
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
      <Stack gap={3} className={styles.resultsContainer} style={viewMode === 'chart' ? { padding: '4px' } : {}}>
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
              data={chartData}
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
            columns={getChartColumns()}
            initialConfig={modalState.config}
          />
        )}
      </Stack>
    </div>
  );
};

export default ResultsViewer; 