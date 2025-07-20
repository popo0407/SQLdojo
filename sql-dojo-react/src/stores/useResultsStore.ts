import { create } from 'zustand';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsFilterStore } from './useResultsFilterStore';
import { useResultsPaginationStore } from './useResultsPaginationStore';
import { useResultsExportStore } from './useResultsExportStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import { useResultsExecutionStore } from './useResultsExecutionStore';
import type { ResultsState } from '../types/results';

/**
 * Facadeパターンによる統合ストア
 * 既存のコンポーネントとの互換性を維持しながら、分割されたストアを統合
 */
export const useResultsStore = create<ResultsState>((set, get) => {
  // 各ストアの状態を取得する関数
  const getDataState = () => useResultsDataStore.getState();
  const getFilterState = () => useResultsFilterStore.getState();
  const getPaginationState = () => useResultsPaginationStore.getState();
  const getSessionState = () => useResultsSessionStore.getState();
  const getExportActions = () => useResultsExportStore.getState();
  const getExecutionActions = () => useResultsExecutionStore.getState();

  // 状態を同期する関数
  const syncState = () => {
    const dataState = getDataState();
    const filterState = getFilterState();
    const paginationState = getPaginationState();
    const sessionState = getSessionState();
    
    set({
      allData: dataState.allData,
      rawData: dataState.rawData,
      columns: dataState.columns,
      rowCount: dataState.rowCount,
      execTime: dataState.execTime,
      sortConfig: filterState.sortConfig,
      filters: filterState.filters,
      filterModal: filterState.filterModal,
      currentPage: paginationState.currentPage,
      hasMoreData: paginationState.hasMoreData,
      sessionId: sessionState.sessionId,
      configSettings: sessionState.configSettings,
    });
  };

  // 各ストアの状態変更を監視
  useResultsDataStore.subscribe(syncState);
  useResultsFilterStore.subscribe(syncState);
  useResultsPaginationStore.subscribe(syncState);
  useResultsSessionStore.subscribe(syncState);

  return {
    // 初期状態
    allData: [],
    rawData: [],
    columns: [],
    rowCount: 0,
    execTime: 0,
    sortConfig: null,
    filters: {},
    filterModal: { show: false, columnName: '', currentFilters: [] },
    currentPage: 1,
    hasMoreData: false,
    sessionId: null,
    configSettings: null,
    
    // データ管理アクション
    setAllData: (allData) => {
      useResultsDataStore.getState().setAllData(allData);
      set({ allData });
    },
    setRawData: (rawData) => {
      useResultsDataStore.getState().setRawData(rawData);
      set({ rawData });
    },
    setColumns: (columns) => {
      useResultsDataStore.getState().setColumns(columns);
      set({ columns });
    },
    setRowCount: (rowCount) => {
      useResultsDataStore.getState().setRowCount(rowCount);
      set({ rowCount });
    },
    setExecTime: (execTime) => {
      useResultsDataStore.getState().setExecTime(execTime);
      set({ execTime });
    },
    clearResults: () => {
      useResultsDataStore.getState().clearResults();
      set({
        allData: [],
        rawData: [],
        columns: [],
        rowCount: 0,
        execTime: 0,
      });
    },
    
    // フィルタ・ソートアクション
    setSortConfig: (sortConfig) => {
      useResultsFilterStore.getState().setSortConfig(sortConfig);
      set({ sortConfig });
    },
    setFilters: (filters) => {
      useResultsFilterStore.getState().setFilters(filters);
      set({ filters });
    },
    setFilterModal: (modal) => {
      useResultsFilterStore.getState().setFilterModal(modal);
      set({ filterModal: modal });
    },
    applySort: async (key: string) => {
      await useResultsFilterStore.getState().applySort(key);
      // 状態を同期
      const filterState = getFilterState();
      set({ sortConfig: filterState.sortConfig });
    },
    applyFilter: async (columnName: string, filterValues: string[]) => {
      await useResultsFilterStore.getState().applyFilter(columnName, filterValues);
      // 状態を同期
      const filterState = getFilterState();
      set({ filters: filterState.filters });
    },
    
    // ページネーションアクション
    setCurrentPage: (currentPage) => {
      useResultsPaginationStore.getState().setCurrentPage(currentPage);
      set({ currentPage });
    },
    setHasMoreData: (hasMoreData) => {
      useResultsPaginationStore.getState().setHasMoreData(hasMoreData);
      set({ hasMoreData });
    },
    loadMoreData: async () => {
      await useResultsPaginationStore.getState().loadMoreData();
      // 状態を同期
      const paginationState = getPaginationState();
      set({ 
        currentPage: paginationState.currentPage,
        hasMoreData: paginationState.hasMoreData 
      });
    },
    resetPagination: () => {
      useResultsPaginationStore.getState().resetPagination();
      set({
        currentPage: 1,
        hasMoreData: false,
      });
    },
    
    // エクスポートアクション
    downloadCsv: async () => {
      await getExportActions().downloadCsv();
    },
    downloadCsvLocal: () => {
      getExportActions().downloadCsvLocal();
    },
    
    // セッション管理アクション
    setSessionId: (sessionId) => {
      useResultsSessionStore.getState().setSessionId(sessionId);
      set({ sessionId });
    },
    setConfigSettings: (configSettings) => {
      useResultsSessionStore.getState().setConfigSettings(configSettings);
      set({ configSettings });
    },
    
    // SQL実行アクション
    executeSql: async (sql: string) => {
      await getExecutionActions().executeSql(sql);
      // 状態を同期
      const dataState = getDataState();
      const filterState = getFilterState();
      const paginationState = getPaginationState();
      const sessionState = getSessionState();
      
      set({
        allData: dataState.allData,
        rawData: dataState.rawData,
        columns: dataState.columns,
        rowCount: dataState.rowCount,
        execTime: dataState.execTime,
        sortConfig: filterState.sortConfig,
        filters: filterState.filters,
        currentPage: paginationState.currentPage,
        hasMoreData: paginationState.hasMoreData,
        sessionId: sessionState.sessionId,
      });
    },
  };
}); 