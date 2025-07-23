import { useState, useEffect } from 'react';
import { useResultsDataStore } from '../stores/useResultsDataStore';
import { useResultsPaginationStore } from '../stores/useResultsPaginationStore';
import type { DisplayData } from '../types/results';

/**
 * 結果表示データの管理を提供するカスタムフック
 * 無限スクロールデータの初期化と表示用データの決定を行う
 */
export const useResultsDisplay = () => {
  const allData = useResultsDataStore(state => state.allData);
  const columns = useResultsDataStore(state => state.columns);
  const rowCount = useResultsDataStore(state => state.rowCount);
  const hasMoreData = useResultsPaginationStore(state => state.hasMoreData);
  const [infiniteData, setInfiniteData] = useState<DisplayData | null>(null);

  // 無限スクロールデータの初期化
  useEffect(() => {
    if (allData && columns) {
      setInfiniteData({
        data: allData,
        columns: columns,
        totalCount: rowCount || allData.length,
        hasMore: hasMoreData,
        isLoading: false
      });
    }
  }, [allData, columns, rowCount, hasMoreData]);

  // 表示用データの決定（無限スクロールデータがある場合はそちらを使用）
  const displayData = infiniteData || {
    data: allData || [],
    columns: columns || [],
    totalCount: rowCount || 0,
    hasMore: hasMoreData,
    isLoading: false
  };

  // フィルタ後の実際の総件数（APIレスポンスのtotal_countを使用）
  const actualTotalCount = rowCount || displayData.totalCount;

  return {
    displayData,
    actualTotalCount,
    hasData: !!(allData && columns && columns.length > 0)
  };
}; 