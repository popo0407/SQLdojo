import React from 'react';
import { Table } from 'react-bootstrap';
import styles from './Results.module.css';
import type { SortConfig, FilterConfig, CellValue } from '../../types/common';

interface ResultTableProps {
  // `columns`が文字列または文字列配列の両方を受け付けられるように修正
  columns: string | string[];
  // `data`の`any`を、より厳密な`CellValue`に修正
  data: { [key: string]: CellValue }[];
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
  onFilter: (key: string) => void;
  // フィルタ情報を追加
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
  // columnsを安全にstring[]に変換
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
                  <div onClick={() => onSort(col)} className={styles.headerContent}>
                    {col}
                    <span className={styles.sortIcon}>{getSortIcon(col)}</span>
                  </div>
                  <div onClick={() => onFilter(col)} className={getFilterIconClass(col)} title={`${col}でフィルタ`}>
                    <i className="fas fa-filter"></i>
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

{/* <div className={styles.tableContainer}>
<Table striped bordered hover responsive size="sm">
  <thead>
    <tr>
      {safeColumns.map((col) => (
        <th key={col} className={styles.tableHeader}>
          <div onClick={() => onSort(col)} className={styles.headerContent}>
            {col}
            <span className={styles.sortIcon}>{getSortIcon(col)}</span>
          </div>
          <div onClick={() => onFilter(col)} className={styles.filterIcon} title={`${col}でフィルタ`}>
             <i className="fas fa-filter"></i>
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
</div> */}