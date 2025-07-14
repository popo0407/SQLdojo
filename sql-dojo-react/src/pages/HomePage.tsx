import React, { useState, useMemo } from 'react'; // useMemo をインポート
import SQLEditor from '../features/editor/SQLEditor';
import ResultsViewer from '../features/results/ResultsViewer';
import FilterModal from '../features/results/FilterModal';
import { useExecuteSql } from '../hooks/useExecuteSql';
import type { SqlExecutionResult } from '../types/api'; // 型をインポート

// ソート設定の型を定義
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

// フィルタ設定の型を定義
type FilterConfig = {
  [columnName: string]: string[];
};

const HomePage: React.FC = () => {
  const [sql, setSql] = useState<string>('SELECT * FROM ');
  const { mutate, data: result, isPending, isError, error } = useExecuteSql();

  // ソートとフィルタの状態を追加
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig>({});
  
  // フィルタモーダルの状態
  const [filterModal, setFilterModal] = useState<{
    show: boolean;
    columnName: string;
  }>({ show: false, columnName: '' });

  const handleExecute = () => {
    // 実行時にソートとフィルタをリセット
    setSortConfig(null);
    setFilters({});
    mutate(sql);
  };

  const handleFormat = () => {
    console.log('Formatting SQL');
    alert('SQL整形機能は次のフェーズで実装します。');
  };

  // ソートハンドラ
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // フィルタハンドラ
  const handleFilter = (key: string) => {
    setFilterModal({ show: true, columnName: key });
  };

  // フィルタを適用する関数
  const applyFilters = (data: any[]) => {
    if (Object.keys(filters).length === 0) return data;

    return data.filter(row => {
      return Object.entries(filters).every(([column, values]) => {
        if (values.length === 0) return true;
        const cellValue = String(row[column] ?? '').toLowerCase();
        return values.some(value => cellValue.includes(value.toLowerCase()));
      });
    });
  };

  // フィルタを適用するハンドラ
  const handleApplyFilters = (columnName: string, filterValues: string[]) => {
    if (filterValues.length === 0) {
      // フィルタが空の場合はその列のフィルタを削除
      const newFilters = { ...filters };
      delete newFilters[columnName];
      setFilters(newFilters);
    } else {
      // フィルタを設定
      setFilters(prev => ({
        ...prev,
        [columnName]: filterValues
      }));
    }
  };

  // ソートとフィルタを適用したデータを計算
  const processedData = useMemo(() => {
    if (!result?.data) return [];

    let filteredData = applyFilters([...result.data]);

    if (sortConfig !== null) {
      // 新しい配列を作成してからソート（元の配列を変更しない）
      filteredData = [...filteredData].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  }, [result, sortConfig, filters]);
  
  // processedDataを適用した新しいresultオブジェクトを作成
  const processedResult: SqlExecutionResult | undefined = result?.success 
    ? { ...result, data: processedData } 
    : result;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 上段：エディタ */}
      <div style={{ height: '40vh', minHeight: '200px' }}>
        <SQLEditor 
          sql={sql} 
          onSqlChange={(value) => setSql(value || '')}
          onExecute={handleExecute}
          onFormat={handleFormat}
        />
      </div>
      
      <div style={{ flexGrow: 1, marginTop: '1rem', display: 'flex' }}>
        <ResultsViewer
          result={processedResult}
          isLoading={isPending}
          isError={isError}
          error={error}
          sortConfig={sortConfig}
          onSort={handleSort}
          onFilter={handleFilter}
          filters={filters}
        />
      </div>

      {/* フィルタモーダル */}
      {result?.data && (
        <FilterModal
          show={filterModal.show}
          onHide={() => setFilterModal({ show: false, columnName: '' })}
          columnName={filterModal.columnName}
          data={result.data}
          filteredData={processedData}
          currentFilters={filters[filterModal.columnName] || []}
          onApplyFilters={(filterValues) => handleApplyFilters(filterModal.columnName, filterValues)}
        />
      )}
    </div>
  );
};

export default HomePage; 