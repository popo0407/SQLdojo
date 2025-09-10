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

  // ユニーク値をAPI経由またはローカルデータから取得
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
        .catch((e: Error) => setError(e.message || 'ユニーク値の取得に失敗しました'))
        .finally(() => setIsLoading(false));
    } else {
      // セッションIDがない場合はローカルデータから取得
      try {
        if (rawData && rawData.length > 0 && filterModal.columnName) {
          const uniqueSet = new Set<string>();
          
          // フィルタを適用したデータからユニーク値を抽出
          let filteredData = [...rawData];
          Object.entries(filters).forEach(([col, vals]) => {
            if (col !== filterModal.columnName && vals && vals.length > 0) {
              filteredData = filteredData.filter(row => vals.includes(String(row[col] || '')));
            }
          });
          
          // ユニーク値を収集
          filteredData.forEach(row => {
            const value = String(row[filterModal.columnName] || '');
            uniqueSet.add(value);
          });
          
          const uniqueArray = Array.from(uniqueSet).sort();
          setUniqueValues(uniqueArray);
          setIsTruncated(uniqueArray.length > 1000); // 1000件を超える場合は切り捨て表示
        } else {
          setUniqueValues([]);
        }
      } catch (error) {
        setError('ユニーク値の抽出に失敗しました');
        console.error('Local unique values extraction error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [filterModal.show, sessionId, filterModal.columnName, filters, filtersString, rawData]);

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