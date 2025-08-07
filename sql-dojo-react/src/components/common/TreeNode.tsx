import React, { useState } from 'react';
import { ListGroup } from 'react-bootstrap';
import type { Schema, Table, Column } from '../../types/api';
import { useEditorStore } from '../../stores/useEditorStore';
import { useSidebarStore } from '../../stores/useSidebarStore';

interface TreeNodeProps {
  item: Schema | Table | Column;
  level?: number;
  parentTableName?: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, level = 0, parentTableName }) => {
  const [expanded, setExpanded] = useState(false);
  const insertText = useEditorStore((state) => state.insertText);
  const selectedTable = useSidebarStore((state) => state.selectedTable);
  const selectedColumns = useSidebarStore((state) => state.selectedColumns);
  const toggleTableSelection = useSidebarStore((state) => state.toggleTableSelection);
  const toggleColumnSelection = useSidebarStore((state) => state.toggleColumnSelection);

  // スキーマ
  if ('tables' in item) {
    // スキーマが非表示の場合は、テーブルを直接表示
    if (item.schema_hidden) {
      return (
        <>
          {item.tables.map((table) => (
            <TreeNode key={table.name} item={table} level={level} />
          ))}
        </>
      );
    }

    return (
      <>
        <ListGroup.Item
          style={{ 
            paddingLeft: `${level * 20 + 10}px`, 
            fontSize: '0.95rem', 
            cursor: 'pointer',
            backgroundColor: '#fff3cd',
            borderColor: '#ffeaa7'
          }}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <i className={`fas ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`} />
          <i className="fas fa-database me-2" style={{ color: '#e67e22' }} />
          <span className="fw-bold" title={item.comment || ''} style={{ color: '#d68910' }}>{item.name}</span>
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
    const isTableSelected = selectedTable === item.name;
    
    return (
      <>
        <ListGroup.Item
          style={{ 
            paddingLeft: `${level * 20 + 10}px`, 
            fontSize: '0.93rem', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            backgroundColor: '#e3f2fd',
            borderColor: '#bbdefb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <i
              className={`fas ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
            />
            <i className={`fas ${item.table_type === 'VIEW' ? 'fa-eye' : 'fa-table'} me-2`} style={{ color: '#1976d2' }} />
            <span
              className="table-name"
              title={item.comment || ''}
              onMouseDown={(e) => {
                e.preventDefault();
                insertText(item.name);
              }}
              style={{ cursor: 'pointer', color: '#1565c0' }}
            >
              {item.name}
            </span>
            {item.comment && <small className="text-muted ms-2">{item.comment}</small>}
          </div>
          <input
            type="checkbox"
            checked={isTableSelected}
            onChange={(e) => {
              e.stopPropagation();
              toggleTableSelection(item.name);
            }}
            style={{ marginLeft: '8px' }}
          />
        </ListGroup.Item>
        {expanded && item.columns.map((column) => (
          <TreeNode key={column.name} item={column} level={level + 1} parentTableName={item.name} />
        ))}
      </>
    );
  }
  // カラム
  const isColumnSelected = selectedColumns.includes(item.name);
  
  return (
    <ListGroup.Item
      style={{ 
        paddingLeft: `${level * 20 + 10}px`, 
        fontSize: '0.91rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: '#fafafa',
        borderColor: '#e0e0e0'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
        <i className="fas fa-columns me-2 text-secondary" />
        <span 
          className="column-name" 
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
        <span className="column-type text-muted small ms-auto">{item.data_type}</span>
      </div>
      <input
        type="checkbox"
        checked={isColumnSelected}
        onChange={(e) => {
          e.stopPropagation();
          toggleColumnSelection(parentTableName!, item.name);
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{ marginLeft: '8px' }}
      />
    </ListGroup.Item>
  );
};

export default TreeNode; 