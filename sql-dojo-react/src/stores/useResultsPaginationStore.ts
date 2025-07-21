import { create } from 'zustand';
import { readSqlCache } from '../api/sqlService';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsFilterStore } from './useResultsFilterStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import { useUIStore } from './useUIStore';
import type { 
  ResultsPaginationState, 
  ResultsPaginationActions,
  TableRow 
} from '../types/results';

interface PaginationStoreState extends ResultsPaginationState, ResultsPaginationActions {}

export const useResultsPaginationStore = create<PaginationStoreState>((set, get) => ({
  // 初期状態
  currentPage: 1,
  hasMoreData: false,
  
  // セッター
  setCurrentPage: (currentPage) => set({ currentPage }),
  setHasMoreData: (hasMoreData) => set({ hasMoreData }),
  
  // データ読み込みアクション
  loadMoreData: async () => {
    const state = get();
    const dataStore = useResultsDataStore.getState();
    const filterStore = useResultsFilterStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const uiStore = useUIStore.getState();
    
    if (!sessionStore.sessionId || uiStore.isLoadingMore || !state.hasMoreData) return;
    uiStore.setIsLoadingMore(true);
    
    try {
      const nextPage = state.currentPage + 1;
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const readRes = await readSqlCache({
        session_id: sessionStore.sessionId,
        page: nextPage,
        page_size: pageSize,
        filters: filterStore.filters,
        sort_by: filterStore.sortConfig?.key,
        sort_order: (filterStore.sortConfig?.direction?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
      });
      
      if (readRes.success && readRes.data && readRes.columns) {
        const newData = (readRes.data as unknown as unknown[][]).map((rowArr: unknown[], _idx: number) => 
          Object.fromEntries((readRes.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        
        dataStore.setAllData([...dataStore.allData, ...newData]);
        dataStore.setRawData([...dataStore.rawData, ...newData]);
        set({
          currentPage: nextPage,
          hasMoreData: (dataStore.allData.length + newData.length) < (readRes.total_count || 0),
        });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('データ読み込みに失敗しました');
      uiStore.setError(error);
      uiStore.setIsError(true);
    } finally {
      uiStore.setIsLoadingMore(false);
    }
  },
  
  // 便利なアクション
  resetPagination: () => {
    set({
      currentPage: 1,
      hasMoreData: false,
    });
  },
})); 