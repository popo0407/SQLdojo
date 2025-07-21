import React from 'react';
import { Table } from 'react-bootstrap';
import styles from './ResultTable.module.css';
import type { SortConfig, FilterConfig, CellValue } from '../../types/common';

interface ResultTableProps {
  columns: string | string[];
  data: { [key: string]: CellValue }[];
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  onFilter: (key: string) => void;
  filters?: FilterConfig;
}

const ResultTable: React.FC<ResultTableProps> = ({ 
  columns, 
  data, 
  sortConfig, 
  onSort, 
  onFilter,
  filters = {}
}) => {
  const safeColumns: string[] = Array.isArray(columns)
    ? columns.flat().filter((c) => typeof c === 'string')
    : typeof columns === 'string'
      ? columns.split(',')
      : [];

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <i className="fas fa-sort text-muted"></i>;
    }
    if (sortConfig.direction === 'asc') {
      return <i className="fas fa-sort-up"></i>;
    }
    return <i className="fas fa-sort-down"></i>;
  };

  const getFilterIconClass = (columnName: string) => {
    const hasActiveFilter = filters[columnName] && filters[columnName].length > 0;
    return `${styles.filterIcon} ${hasActiveFilter ? styles.active : ''}`;
  };

  return (
    <div className={styles.tableContainer}>
      <Table striped bordered hover responsive size="sm">
        <thead>
          <tr>
            {safeColumns.map((col) => (
                <th key={col} className={styles.tableHeader}>
                  <div className={styles.headerContent}>
                    <span onClick={() => onSort(col)} style={{ display: 'flex', alignItems: 'center' }}>
                      {col}
                      <span className={styles.sortIcon}>{getSortIcon(col)}</span>
                    </span>
                    <span
                      className={getFilterIconClass(col)}
                      title={`${col}でフィルタ`}
                      onClick={e => { e.stopPropagation(); onFilter(col); }}
                      style={{ marginLeft: 4 }}
                    >
                      <i className="fas fa-filter"></i>
                    </span>
                  </div>
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {safeColumns.map((col) => (
                <td key={`${rowIndex}-${col}`}>{String(row[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ResultTable; 