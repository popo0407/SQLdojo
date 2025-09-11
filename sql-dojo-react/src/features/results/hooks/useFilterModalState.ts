import { useState, useEffect, useMemo } from 'react';
import { getUniqueValues } from '../../../api/metadataService';
import { useUIStore } from '../../../stores/useUIStore';
import { useResultsSessionStore } from '../../../stores/useResultsSessionStore';
import { useResultsFilterStore } from '../../../stores/useResultsFilterStore';
import { useResultsDataStore } from '../../../stores/useResultsDataStore';
import type { FilterModalState, FilterModalActions } from '../types/filterModal';

export const useFilterModalState = (): FilterModalState & FilterModalActions => {
  const { filterModal } = useUIStore();
  const sessionId = useResultsSessionStore(state => state.sessionId);
  const filters = useResultsFilterStore(state => state.filters);
  const rawData = useResultsDataStore(state => state.rawData);
  
  // フィルタのシリアライズ化を別変数として抽出
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);
  
  const [selectedValues, setSelectedValues] = useState<string[]>(filterModal.currentFilters || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // ユニーク値をAPI経由で取得
  useEffect(() => {
    if (!filterModal.show) return;
    
    setIsLoading(true);
    setError(null);
    setUniqueValues([]);
    setIsTruncated(false);
    
    if (sessionId) {
      // セッションIDがある場合はAPI経由で取得
      getUniqueValues({
        session_id: sessionId,
        column_name: filterModal.columnName,
        filters
      })
        .then(res => {
          setUniqueValues(res.values || []);
          setIsTruncated(!!res.truncated);
        })
        .catch((e: Error) => {
          setError(e.message || 'ユニーク値の取得に失敗しました');
        })
        .finally(() => setIsLoading(false));
    } else {
      // セッションIDがない場合はエラー
      setError('セッションIDが存在しません');
      setIsLoading(false);
    }
  }, [filterModal.show, sessionId, filterModal.columnName, filterModal.currentFilters, filters, filtersString, rawData]);

  // モーダルが開くたびに現在のフィルタを設定
  useEffect(() => {
    if (filterModal.show) {
      setSelectedValues(filterModal.currentFilters || []);
    }
  }, [filterModal.show, filterModal.currentFilters]);

  return {
    selectedValues,
    searchTerm,
    uniqueValues,
    isLoading,
    error,
    isTruncated,
    setSelectedValues,
    setSearchTerm,
    setUniqueValues,
    setIsLoading,
    setError,
    setIsTruncated,
  };
}; 