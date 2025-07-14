import React from 'react';
import type { SqlExecutionResult } from '../../types/api';
import ResultTable from './ResultTable';
import { Alert, Spinner, Stack } from 'react-bootstrap';
import styles from './Results.module.css';

// SortConfigの型定義をインポートまたは定義
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

interface ResultsViewerProps {
  result: SqlExecutionResult | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  // 以下を追記
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  onFilter: (key: string) => void;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ result, isLoading, isError, error, sortConfig, onSort, onFilter }) => {
  if (isLoading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">実行中...</span>
        </Spinner>
        <p className="mt-2">SQLを実行中...</p>
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">エラー: {error?.message}</Alert>;
  }
  
  // 実行成功したが、バックエンドでエラーが返ってきた場合
  if (result && !result.success) {
    return <Alert variant="warning">実行エラー: {result.error_message}</Alert>;
  }

  if (!result || !result.data || !result.columns) {
    return <div className="text-center text-muted p-5">実行ボタンを押してSQLを実行してください。</div>;
  }

  // 現在のソート情報を表示
  const sortInfo = sortConfig 
    ? `${sortConfig.key} (${sortConfig.direction === 'asc' ? '昇順' : '降順'})`
    : '並び替えなし';

  return (
    <Stack gap={3} className={styles.resultsContainer}>
      <div className={styles.statsBar}>
        <span><i className="fas fa-list-ol me-1"></i> {result.row_count?.toLocaleString() || 0} 件</span>
        <span><i className="fas fa-clock me-1"></i> {result.execution_time?.toFixed(3) || 0} 秒</span>
        <span><i className="fas fa-sort me-1"></i> {sortInfo}</span>
      </div>
      <ResultTable 
        columns={result.columns} 
        data={result.data} 
        sortConfig={sortConfig}
        onSort={onSort}
        onFilter={onFilter}
      />
    </Stack>
  );
};

export default ResultsViewer; 