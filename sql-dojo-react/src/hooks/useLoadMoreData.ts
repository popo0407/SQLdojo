import { useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';

// ソート設定の型
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// フィルタ設定の型
type FilterConfig = {
  [columnName: string]: string[];
};

// 読み込みレスポンスの型
type LoadMoreResponse = {
  success: boolean;
  data: any[][];
  columns: string[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  execution_time: number;
  error_message?: string;
};

export const useLoadMoreData = () => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const loadMore = useCallback(async (
    sessionId: string,
    page: number,
    filters?: FilterConfig,
    sortConfig?: SortConfig | null
  ): Promise<LoadMoreResponse> => {
    console.log('🔄 useLoadMoreData.loadMore 呼び出し');
    console.log('  sessionId:', sessionId);
    console.log('  page:', page);
    console.log('  filters:', filters);
    console.log('  sortConfig:', sortConfig);
    console.log('  current isLoadingMore:', isLoadingMore);
    
    if (isLoadingMore) {
      console.log('❌ 既にローディング中のためスキップ');
      throw new Error('Already loading more data');
    }
    
    setIsLoadingMore(true);
    console.log('✅ isLoadingMore を true に設定');
    
    try {
      const response = await apiClient.loadMoreData(sessionId, page, filters, sortConfig);
      
      console.log('📥 APIレスポンス受信:', response);
      console.log('  has_next:', response.has_next);
      console.log('  data length:', response.data?.length);
      
      setHasMore(response.has_next);
      return response;
    } catch (error) {
      console.error('❌ loadMore エラー:', error);
      throw error;
    } finally {
      setIsLoadingMore(false);
      console.log('✅ isLoadingMore を false に設定');
    }
  }, [isLoadingMore]);

  return {
    loadMore,
    isLoadingMore,
    hasMore
  };
}; 