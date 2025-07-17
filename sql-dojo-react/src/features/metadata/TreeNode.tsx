import React, { useState } from 'react';
import { ListGroup } from 'react-bootstrap';
import type { Schema, Table, Column } from '../../types/metadata';
import { useSqlPageStore } from '../../stores/useSqlPageStore';

interface TreeNodeProps {
  item: Schema | Table | Column;
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, level = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const insertText = useSqlPageStore((state) => state.insertText);

  // スキーマ
  if ('tables' in item) {
    return (
      <>
        <ListGroup.Item
          style={{ paddingLeft: `${level * 20 + 10}px`, fontSize: '0.95rem', cursor: 'pointer' }}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <i className={`fas ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`} />
          <i className="fas fa-database me-2 text-secondary" />
          <span className="fw-bold" title={item.comment || ''}>{item.name}</span>
          {item.comment && <small className="text-muted ms-2">{item.comment}</small>}
        </ListGroup.Item>
        {expanded && item.tables.map((table) => (
          <TreeNode key={table.name} item={table} level={level + 1} />
        ))}
      </>
    );
  }
  // テーブル
  if ('columns' in item) {
    return (
      <>
        <ListGroup.Item
          style={{ paddingLeft: `${level * 20 + 10}px`, fontSize: '0.93rem', cursor: 'pointer' }}
        >
          <i
            className={`fas ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          />
          <i className={`fas ${item.table_type === 'VIEW' ? 'fa-eye' : 'fa-table'} me-2 text-secondary`} />
          <span
            className="table-name"
            title={item.comment || ''}
            onMouseDown={(e) => {
              e.preventDefault();
              insertText(item.name);
            }}
            style={{ cursor: 'pointer' }}
          >
            {item.name}
          </span>
          {item.comment && <small className="text-muted ms-2">{item.comment}</small>}
        </ListGroup.Item>
        {expanded && item.columns.map((column) => (
          <TreeNode key={column.name} item={column} level={level + 1} />
        ))}
      </>
    );
  }
  // カラム
  return (
    <ListGroup.Item
      style={{ paddingLeft: `${level * 20 + 10}px`, fontSize: '0.91rem', display: 'flex', alignItems: 'center' }}
      onMouseDown={(e) => {
        e.preventDefault();
        insertText(item.name);
      }}
    >
      <i className="fas fa-columns me-2 text-secondary" />
      <span className="column-name" title={item.comment || ''}>{item.name}</span>
      {item.comment && <small className="text-muted ms-2">{item.comment}</small>}
      <span className="column-type text-muted small ms-auto">{item.data_type}</span>
    </ListGroup.Item>
  );
};

export default TreeNode; 