import React from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import styles from '../common/ResultTable.module.css';

interface ResultsStatsProps {
  totalCount: number;
  execTime?: number;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  filters: Record<string, string[]>;
  sessionId?: string;
  onDownloadCsv?: () => void;
  isDownloading?: boolean;
}

/**
 * 結果の統計情報表示用コンポーネント
 */
export const ResultsStats: React.FC<ResultsStatsProps> = ({
  totalCount,
  execTime,
  sortConfig,
  filters,
  sessionId,
  onDownloadCsv,
  isDownloading = false
}) => {
  // 現在のソート情報を表示
  const sortInfo = sortConfig 
    ? `${sortConfig.key} (${sortConfig.direction === 'asc' ? '昇順' : '降順'})`
    : '並び替えなし';

  // フィルタ情報を表示
  const activeFilters = Object.values(filters).filter((values) => values.length > 0);
  const filterInfo = activeFilters.length > 0
    ? `${activeFilters.length}列でフィルタ適用`
    : 'フィルタなし';

  return (
    <div className={styles.statsBar}>
      <div className="statsInfo" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span><i className="fas fa-list-ol me-1"></i> {totalCount.toLocaleString()} 件</span>
        <span><i className="fas fa-clock me-1"></i> {execTime?.toFixed(3) || 0} 秒</span>
        <span><i className="fas fa-sort me-1"></i> {sortInfo}</span>
        <span><i className="fas fa-filter me-1"></i> {filterInfo}</span>
        {sessionId && <span><i className="fas fa-database me-1"></i> セッション: {sessionId}</span>}
      </div>
      {onDownloadCsv && (
        <div className="statsActions" style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={onDownloadCsv}
            disabled={isDownloading}
            title="CSVダウンロード"
          >
            <FontAwesomeIcon icon={faDownload} className="me-1" />
            {isDownloading ? "ダウンロード中..." : "CSV"}
          </Button>
        </div>
      )}
    </div>
  );
}; 