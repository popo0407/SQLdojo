import { useState, useEffect } from 'react';
import { getUniqueValues } from '../../../api/metadataService';
import { useUIStore } from '../../../stores/useUIStore';
import { useResultsStore } from '../../../stores/useResultsStore';
import type { FilterModalState, FilterModalActions } from '../types/filterModal';

export const useFilterModalState = (): FilterModalState & FilterModalActions => {
  const { filterModal } = useUIStore();
  const { sessionId, filters } = useResultsStore();
  
  const [selectedValues, setSelectedValues] = useState<string[]>(filterModal.currentFilters || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // ユニーク値をAPI経由で取得
  useEffect(() => {
    if (!filterModal.show) return;
    if (!sessionId) {
      setUniqueValues([]);
      setIsLoading(false);
      setError('セッションIDがありません。');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setUniqueValues([]);
    setIsTruncated(false);
    
    getUniqueValues({
      session_id: sessionId,
      column_name: filterModal.columnName,
      filters
    })
      .then(res => {
        setUniqueValues(res.values || []);
        setIsTruncated(!!res.truncated);
      })
      .catch((e: Error) => setError(e.message || 'ユニーク値の取得に失敗しました'))
      .finally(() => setIsLoading(false));
  }, [filterModal.show, sessionId, filterModal.columnName, JSON.stringify(filters)]);

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