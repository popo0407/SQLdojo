import { useCallback, useEffect, useRef } from 'react';
import { useResultsPaginationStore } from '../stores/useResultsPaginationStore';
import { useUIStore } from '../stores/useUIStore';

/**
 * 無限スクロール機能を提供するカスタムフック
 * スクロール位置を監視し、2/3以上スクロールした際に追加データを読み込む
 */
export const useInfiniteScroll = () => {
  const hasMoreData = useResultsPaginationStore(state => state.hasMoreData);
  const loadMoreData = useResultsPaginationStore(state => state.loadMoreData);
  const { isLoadingMore } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // スクロール監視用のコールバック（2/3以上で発火）
  const handleScroll = useCallback(() => {
    if (!hasMoreData || isLoadingMore || !containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight * 2 / 3) {
      loadMoreData();
    }
  }, [hasMoreData, isLoadingMore, loadMoreData]);

  // スクロールイベントリスナーの設定
  useEffect(() => {
    const container = containerRef.current;
    if (hasMoreData && container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, hasMoreData]);

  return {
    containerRef,
    hasMoreData,
    isLoadingMore
  };
}; 