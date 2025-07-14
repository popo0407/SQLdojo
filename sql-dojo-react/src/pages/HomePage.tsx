import React, { useState, useMemo } from 'react'; // useMemo をインポート
import SQLEditor from '../features/editor/SQLEditor';
import ResultsViewer from '../features/results/ResultsViewer';
import { useExecuteSql } from '../hooks/useExecuteSql';
import type { SqlExecutionResult } from '../types/api'; // 型をインポート

// ソート設定の型を定義
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

const HomePage: React.FC = () => {
  const [sql, setSql] = useState<string>('SELECT * FROM ');
  const { mutate, data: result, isPending, isError, error } = useExecuteSql();

  // ソートとフィルタの状態を追加
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<Record<string, string[]>>({});

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
  
  // フィルタハンドラ（次のステップで実装）
  const handleFilter = (key: string) => {
    alert(`「${key}」のフィルタ機能は次のステップで実装します。`);
  };

  // ソートとフィルタを適用したデータを計算
  const processedData = useMemo(() => {
    if (!result?.data) return [];

    let filteredData = [...result.data];

    // TODO: フィルタリングロジックをここに追加

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
        />
      </div>
    </div>
  );
};

export default HomePage; 