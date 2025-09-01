import { create } from 'zustand';
import { executeSqlOnCache, readSqlCache, getSessionStatus } from '../api/sqlService';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsFilterStore } from './useResultsFilterStore';
import { useResultsPaginationStore } from './useResultsPaginationStore';
import type { ResultsExecutionActions, ResultsExecutionState } from '../types/results';
import { useResultsSessionStore } from './useResultsSessionStore';
import { useUIStore } from './useUIStore';
import { useProgressStore } from './useProgressStore';
import type { TableRow } from '../types/common';

export const createResultsExecutionStore = () => create<ResultsExecutionState & ResultsExecutionActions>((set, get) => ({
  // 進捗ポーリング用のタイマーID
  progressPollingInterval: null,

  // 進捗ポーリング開始
  startProgressPolling: (sessionId: string) => {
    const progressStore = useProgressStore.getState();
    
    const pollProgress = async () => {
      try {
        const statusResponse = await getSessionStatus(sessionId);
        
        progressStore.updateProgress({
          currentCount: statusResponse.processed_count,
          progressPercentage: statusResponse.progress_percentage,
          message: statusResponse.message || 'データを取得中...'
        });

        // ストリーミングが完了した場合はポーリング停止
        if (statusResponse.status === 'completed' || statusResponse.status === 'error' || statusResponse.status === 'cancelled') {
          const currentStore = get();
          if (currentStore.progressPollingInterval) {
            clearInterval(currentStore.progressPollingInterval);
            set({ progressPollingInterval: null });
          }
          // 完了表示を1秒間保持してから非表示
          setTimeout(() => {
            progressStore.hideProgress();
          }, 1000);
        }
      } catch {
        // エラーが発生した場合もポーリングを停止
        const currentStore = get();
        if (currentStore.progressPollingInterval) {
          clearInterval(currentStore.progressPollingInterval);
          set({ progressPollingInterval: null });
        }
        progressStore.hideProgress();
      }
    };

    // 初回実行
    pollProgress();
    
    // 100ms間隔でポーリング開始（より頻繁に更新）
    const intervalId = setInterval(pollProgress, 100);
    set({ progressPollingInterval: intervalId });
  },

  // 進捗ポーリング停止
  stopProgressPolling: () => {
    const currentStore = get();
    if (currentStore.progressPollingInterval) {
      clearInterval(currentStore.progressPollingInterval);
      set({ progressPollingInterval: null });
    }
  },

  // SQL実行アクション
  executeSql: async (sql: string) => {
    const dataStore = useResultsDataStore.getState();
    const filterStore = useResultsFilterStore.getState();
    const paginationStore = useResultsPaginationStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const uiStore = useUIStore.getState();
    const progressStore = useProgressStore.getState();
    
    try {
      uiStore.startLoading();
      progressStore.resetProgress();
      
      // 既存のポーリングを停止
      get().stopProgressPolling();
      
      const res = await executeSqlOnCache({ sql });
      
      if (!res.success) {
        // エラーメッセージを適切に処理
        const errorMessage = res.error_message || res.message || 'SQL実行に失敗しました';
        uiStore.setError(errorMessage);
        uiStore.stopLoading();
        progressStore.hideProgress();
        return;
      }

      // 進捗データが含まれている場合は進捗表示を開始
      if (res.total_count && res.total_count > 0) {
        progressStore.showProgress({
          totalCount: res.total_count,
          currentCount: res.current_count || 0,
          progressPercentage: res.progress_percentage || 0,
          message: 'データを取得中...'
        });
        
        // セッションIDがある場合は進捗ポーリングを開始（少し遅らせて開始）
        if (res.session_id) {
          const sessionId = res.session_id; // 型安全性のため変数に保存
          // 200ms遅らせてストリーミング処理が本格的に開始されてから開始
          setTimeout(() => {
            get().startProgressPolling(sessionId);
          }, 200);
        }
      }
      
      if (!res.session_id) {
        uiStore.setError('session_idが返されませんでした');
        uiStore.stopLoading();
        progressStore.hideProgress();
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
        uiStore.setError(readRes.message || 'データ取得に失敗しました');
        uiStore.stopLoading();
        progressStore.hideProgress();
        get().stopProgressPolling();
        return;
      }
      
                      const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
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
      
      // 完了時は進捗を1秒後に非表示・ポーリング停止
      setTimeout(() => {
        progressStore.hideProgress();
        get().stopProgressPolling();
      }, 1000);
      
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'SQL実行に失敗しました';
      uiStore.setError(error);
      uiStore.stopLoading();
      progressStore.hideProgress();
      get().stopProgressPolling();
    }
  },
}));

export const useResultsExecutionStore = createResultsExecutionStore(); 