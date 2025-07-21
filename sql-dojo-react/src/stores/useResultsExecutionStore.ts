import { create } from 'zustand';
import { executeSqlOnCache, readSqlCache } from '../api/sqlService';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsFilterStore } from './useResultsFilterStore';
import { useResultsPaginationStore } from './useResultsPaginationStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import { useUIStore } from './useUIStore';
import type { TableRow } from '../types/common';

export const useResultsExecutionStore = create<ResultsExecutionActions>(() => ({
  // SQL実行アクション
  executeSql: async (sql: string) => {
    const dataStore = useResultsDataStore.getState();
    const filterStore = useResultsFilterStore.getState();
    const paginationStore = useResultsPaginationStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const uiStore = useUIStore.getState();
    
    try {
      uiStore.startLoading();
      
      const res = await executeSqlOnCache({ sql });
      
      if (!res.success) {
        // エラーメッセージを適切に処理
        const errorMessage = res.error_message || res.message || 'SQL実行に失敗しました';
        uiStore.setError(new Error(errorMessage));
        uiStore.setIsError(true);
        uiStore.stopLoading();
        return;
      }
      
      if (!res.session_id) {
        uiStore.setError(new Error('session_idが返されませんでした'));
        uiStore.setIsError(true);
        uiStore.stopLoading();
        return;
      }
      
      sessionStore.setSessionId(res.session_id);
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const readRes = await readSqlCache({
        session_id: res.session_id,
        page: 1,
        page_size: pageSize
      });
      
      if (!readRes.success || !readRes.data || !readRes.columns) {
        uiStore.setError(new Error(readRes.message || 'データ取得に失敗しました'));
        uiStore.setIsError(true);
        uiStore.stopLoading();
        return;
      }
      
                      const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
      
      dataStore.setAllData(newData);
      dataStore.setRawData(newData);
      dataStore.setColumns(readRes.columns);
      dataStore.setRowCount(readRes.total_count || newData.length);
      dataStore.setExecTime(readRes.execution_time || 0);
      
      paginationStore.setCurrentPage(1);
      paginationStore.setHasMoreData(newData.length < (readRes.total_count || newData.length));
      
      filterStore.setSortConfig(null);
      filterStore.setFilters({});
      
      uiStore.clearError();
      uiStore.stopLoading();
      
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('SQL実行に失敗しました');
      uiStore.setError(error);
      uiStore.setIsError(true);
      uiStore.stopLoading();
    }
  },
})); 