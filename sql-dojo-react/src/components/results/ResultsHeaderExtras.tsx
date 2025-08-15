import React, { useCallback } from 'react';
import { Button } from 'react-bootstrap';
import ExportControls from './ExportControls';
import { useResultsFilterStore } from '../../stores/useResultsFilterStore';
import { useResultsSessionStore } from '../../stores/useResultsSessionStore';
import { readSqlCache } from '../../api/sqlService';
import { useResultsDataStore } from '../../stores/useResultsDataStore';
import type { TableRow } from '../../types/common';

/**
 * 結果出力コンテナ右側の拡張領域
 * - フィルタ/ソート全解除ボタン
 * - 出力操作 (CSV/Excel/TSV)
 * - 出力が現在のフィルタ・ソートを反映する旨の注記
 */
export const ResultsHeaderExtras: React.FC = () => {
  const { sortConfig, filters, setSortConfig, setFilters } = useResultsFilterStore();
  const sessionStore = useResultsSessionStore();
  const dataStore = useResultsDataStore();

  const hasActiveFilters = Object.values(filters).some(v => v && v.length > 0);
  const hasSort = !!sortConfig;
  const disabled = !hasActiveFilters && !hasSort;

  const handleClearAll = useCallback(async () => {
    if (disabled) return;
    setSortConfig(null);
    setFilters({});

    // セッションがあればサーバから再読込（ソート/フィルタ無しの先頭ページ）
    if (sessionStore.sessionId) {
      const pageSize = sessionStore.configSettings?.default_page_size || 100;
      const res = await readSqlCache({
        session_id: sessionStore.sessionId,
        page: 1,
        page_size: pageSize
      });
      if (res.success && res.data && res.columns) {
        const newData = (res.data as unknown as unknown[][]).map((rowArr: unknown[]) =>
          Object.fromEntries((res.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
        ) as TableRow[];
        dataStore.setAllData(newData);
        dataStore.setColumns(res.columns);
        dataStore.setRowCount(res.total_count || newData.length);
        dataStore.setExecTime(res.execution_time || 0);
      }
    } else {
      // ローカル: rawData 全量を表示に戻す
      const raw = dataStore.rawData;
      dataStore.setAllData(raw);
    }
  }, [disabled, setSortConfig, setFilters, sessionStore.sessionId, sessionStore.configSettings, dataStore]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Button
          size="sm"
          variant={disabled ? 'outline-secondary' : 'outline-danger'}
          onClick={handleClearAll}
          disabled={disabled}
          title="すべてのフィルタとソート条件を解除"
          data-testid="clear-all-filters-sort"
        >フィルター・ソート全解除</Button>
        <ExportControls compact />
      </div>
      <small style={{ color: '#6c757d', lineHeight: 1.2 }}>
        ※ CSV / Excel / クリップボード 出力は現在のフィルタ・ソート適用後のデータです
      </small>
    </div>
  );
};

export default ResultsHeaderExtras;
