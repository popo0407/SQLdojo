/**
 * SQL実行履歴メインコンポーネント
 * SqlLogページで使用するSQL履歴機能の統合コンポーネント
 */

import React from 'react';
import { Card } from 'react-bootstrap';
import { useSqlHistory } from './hooks/useSqlHistory';
import { SqlHistoryTable } from './components/SqlHistoryTable';
import { LoadingStatus } from './components/LoadingStatus';
import { HistoryRefreshButton } from './components/HistoryRefreshButton';

/**
 * SQL実行履歴コンポーネント
 * SqlLogページでの表示に最適化
 */
export const SqlHistory: React.FC = () => {
  const { data, loading, error, refreshData, hasCache } = useSqlHistory();
  
  return (
    <Card>
      <Card.Body>
        {/* ヘッダー部分 */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="mb-1">実行履歴</h5>
            <p className="text-muted mb-0">過去半年のSQL実行履歴を表示します。</p>
          </div>
          <HistoryRefreshButton 
            onRefresh={refreshData} 
            loading={loading}
          />
        </div>
        
        {/* ステータス表示 */}
        <LoadingStatus 
          loading={loading}
          error={error}
          hasCache={hasCache}
          totalCount={data?.total_count}
        />
        
        {/* 履歴テーブル */}
        <SqlHistoryTable 
          data={data?.logs || []}
          loading={loading}
        />
      </Card.Body>
    </Card>
  );
};
