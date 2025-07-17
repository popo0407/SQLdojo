import React, { useCallback } from 'react';
import SQLEditor from '../features/editor/SQLEditor';
import ResultsViewer from '../features/results/ResultsViewer';
import FilterModal from '../features/results/FilterModal';
import { useExecuteSql } from '../hooks/useExecuteSql';
import { useDownloadCsv } from '../hooks/useDownloadCsv';
import { useConfigSettings } from '../hooks/useConfigSettings';
import type { SqlExecutionResult, CacheReadResponse } from '../types/api';
import { useSqlPageStore } from '../stores/useSqlPageStore';
import type { TableRow } from '../stores/useSqlPageStore';

const HomePage: React.FC = () => {
  // Zustandストアから状態とsetterを取得
  const {
    sql, setSql,
    sortConfig, setSortConfig,
    filters, setFilters,
    filterModal, setFilterModal,
    sessionId, setSessionId,
    currentPage, setCurrentPage,
    hasMoreData, setHasMoreData,
    allData, setAllData,
    columns, setColumns,
    rowCount, setRowCount,
    execTime, setExecTime,
    showLimitDialog, setShowLimitDialog,
    limitDialogData, setLimitDialogData,
    isLoadingMore, setIsLoadingMore
  } = useSqlPageStore();

  // execResultの未使用を解消
  const { mutate, isPending, isError, error } = useExecuteSql();

  // 設定を取得
  const { data: configSettings } = useConfigSettings();

  // CSVダウンロード用のフック
  const { downloadCsv, isDownloading } = useDownloadCsv();

  // 共通の初期化関数
  const resetPagingState = (newData: TableRow[], columns: string[], totalCount: number, execTime: number) => {
    setAllData(newData);
    setColumns(columns);
    setRowCount(totalCount);
    setExecTime(execTime);
    setCurrentPage(1);
    setHasMoreData(newData.length < totalCount);
  };

  // SQL実行時
  const handleExecute = useCallback(() => {
    setSortConfig(null);
    setFilters({});
    setCurrentPage(1);
    setAllData([]);
    setColumns([]);
    setRowCount(0);
    setExecTime(0);
    setHasMoreData(false);
    setSessionId(null);
    setShowLimitDialog(false);
    setLimitDialogData(null);
    mutate(sql, {
      onSuccess: async (res) => {
        if (!res.success && res.message && res.total_count) {
          setSessionId(res.session_id || null);
          setShowLimitDialog(true);
          setLimitDialogData({
            totalCount: res.total_count,
            message: res.message
          });
          return;
        }
        if (res.success && res.session_id) {
          setSessionId(res.session_id);
          const pageSize = configSettings?.default_page_size || 100;
          const readRes: CacheReadResponse = await fetch('/api/v1/sql/cache/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: res.session_id, page: 1, page_size: pageSize })
          }).then(r => r.json());
          if (readRes.success && readRes.data && readRes.columns) {
            const newData = readRes.data.map(rowArr => Object.fromEntries(readRes.columns!.map((col, i) => [col, rowArr[i]])));
            resetPagingState(newData, readRes.columns, readRes.total_count || newData.length, readRes.execution_time || 0);
          } else {
            resetPagingState([], [], 0, 0);
          }
        }
      }
    });
  }, [sql, mutate, configSettings, setSortConfig, setFilters, setCurrentPage, setAllData, setColumns, setRowCount, setExecTime, setHasMoreData, setSessionId, setShowLimitDialog, setLimitDialogData]);

  // 表示制限時のCSVダウンロードハンドラ
  const handleLimitDialogDownload = useCallback(() => {
    if (sessionId) {
      downloadCsv(sessionId);
      setShowLimitDialog(false);
      setLimitDialogData(null);
    }
  }, [sessionId, downloadCsv, setShowLimitDialog, setLimitDialogData]);

  // CSVダウンロードハンドラ（session_idベース）
  const handleDownloadCsv = useCallback(() => {
    if (!sessionId) {
      alert('SQLを実行してからCSVダウンロードしてください。');
      return;
    }
    if (configSettings?.max_records_for_csv_download && rowCount > configSettings.max_records_for_csv_download) {
      alert(`CSVダウンロード制限を超過しています（${rowCount.toLocaleString()}件）。クエリを制限してから再実行してください。`);
      return;
    }
    downloadCsv(sessionId);
  }, [sessionId, downloadCsv, configSettings, rowCount]);

  // ソートハンドラ（API経由）
  const handleSort = useCallback(async (key: string) => {
    if (!sessionId) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    try {
      const pageSize = configSettings?.default_page_size || 100;
      const readRes: CacheReadResponse = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          page: 1, 
          page_size: pageSize,
          sort_by: key,
          sort_order: direction.toUpperCase(),
          filters,
        })
      }).then(r => r.json());
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map(rowArr => Object.fromEntries(readRes.columns!.map((col, i) => [col, rowArr[i]])));
        resetPagingState(newData, readRes.columns, readRes.total_count || newData.length, readRes.execution_time || 0);
      } else {
        resetPagingState([], [], 0, 0);
      }
    } catch (err) {
      console.error('ソートエラー:', err);
    }
  }, [sessionId, sortConfig, configSettings, filters, setSortConfig, setAllData, setColumns, setRowCount, setExecTime, setCurrentPage, setHasMoreData]);

  // フィルタハンドラ
  const handleFilter = (key: string) => {
    setFilterModal({ show: true, columnName: key });
  };

  // フィルタを適用するハンドラ（API経由）
  const handleApplyFilters = useCallback(async (columnName: string, filterValues: string[]) => {
    if (!sessionId) return;
    const newFilters = { ...filters };
    if (filterValues.length === 0) {
      delete newFilters[columnName];
    } else {
      newFilters[columnName] = filterValues;
    }
    setFilters(newFilters);
    try {
      const pageSize = configSettings?.default_page_size || 100;
      const readRes: CacheReadResponse = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          page: 1, 
          page_size: pageSize,
          filters: newFilters,
          sort_by: sortConfig?.key,
          sort_order: sortConfig?.direction?.toUpperCase() || 'ASC'
        })
      }).then(r => r.json());
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = readRes.data.map(rowArr => Object.fromEntries(readRes.columns!.map((col, i) => [col, rowArr[i]])));
        resetPagingState(newData, readRes.columns, readRes.total_count || newData.length, readRes.execution_time || 0);
      } else {
        resetPagingState([], [], 0, 0);
      }
    } catch (err) {
      console.error('フィルタエラー:', err);
    }
  }, [sessionId, filters, sortConfig, configSettings, setFilters, setAllData, setColumns, setRowCount, setExecTime, setCurrentPage, setHasMoreData]);

  // 無限スクロール用のデータ読み込みハンドラ
  const handleLoadMore = useCallback(async () => {
    if (!sessionId || isLoadingMore || !(allData.length < rowCount)) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const pageSize = configSettings?.default_page_size || 100;
      const readRes: CacheReadResponse = await fetch('/api/v1/sql/cache/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId, 
          page: nextPage, 
          page_size: pageSize,
          filters,
          sort_by: sortConfig?.key,
          sort_order: sortConfig?.direction?.toUpperCase() || 'ASC'
        })
      }).then(r => r.json());
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = (readRes.data || []).map(rowArr => 
          Object.fromEntries((readRes.columns || []).map((col, i) => [col, rowArr[i]]))
        );
        setAllData(allData.concat(newData));
        setCurrentPage(nextPage);
        setHasMoreData(allData.length + newData.length < (readRes.total_count || 0));
        setRowCount(readRes.total_count || 0);
        setExecTime(readRes.execution_time || 0);
      }
    } catch (err) {
      console.error('❌ データ読み込みエラー:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [sessionId, isLoadingMore, allData, rowCount, currentPage, filters, sortConfig, configSettings, setAllData, setCurrentPage, setHasMoreData, setRowCount, setExecTime, setIsLoadingMore]);

  const processedResult: SqlExecutionResult | undefined = (columns.length > 0)
    ? {
        success: true,
        data: allData,
        columns,
        row_count: rowCount,
        execution_time: execTime,
        sql: sql,
        session_id: sessionId || undefined
      }
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 上段：エディタ */}
      <div style={{ height: '40vh', minHeight: '200px' }}>
        <SQLEditor 
          sql={sql} 
          onSqlChange={(value) => setSql(value || '')}
          onExecute={handleExecute}
          onFormat={() => alert('SQL整形機能は次のフェーズで実装します。')}
          onDownloadCsv={handleDownloadCsv}
          isDownloading={isDownloading}
        />
      </div>
      <div style={{ flexGrow: 1, marginTop: '1rem', display: 'flex', overflow: 'hidden' }}>
        <ResultsViewer
          result={processedResult}
          isLoading={isPending}
          isError={isError}
          error={error}
          sortConfig={sortConfig}
          onSort={handleSort}
          onFilter={handleFilter}
          filters={filters}
          sessionId={sessionId || undefined}
          onLoadMore={handleLoadMore}
          hasMoreData={hasMoreData}
          isLoadMoreLoading={isLoadingMore}
        />
      </div>
      {/* フィルタモーダル */}
      {allData && allData.length > 0 && (
        <FilterModal
          show={filterModal.show}
          onHide={() => setFilterModal({ show: false, columnName: '' })}
          columnName={filterModal.columnName}
          sessionId={sessionId || ''}
          filters={filters}
          currentFilters={filters[filterModal.columnName] || []}
          onApplyFilters={(filterValues) => handleApplyFilters(filterModal.columnName, filterValues)}
        />
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
                onClick={handleLimitDialogDownload}
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