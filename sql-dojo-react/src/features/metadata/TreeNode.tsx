import React, { useState } from 'react';
import type { Schema, Table } from '../../types/metadata';
import { Accordion } from 'react-bootstrap';
import styles from './MetadataTree.module.css';

interface TreeNodeProps {
  item: Schema | Table;
  type: 'schema' | 'table';
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, type }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = 'tables' in item && item.tables.length > 0;

  const getIcon = () => {
    if (type === 'schema') return <i className="fas fa-database me-2 text-secondary"></i>;
    if (type === 'table') {
      return item.table_type === 'VIEW' 
        ? <i className="fas fa-eye me-2 text-secondary"></i>
        : <i className="fas fa-table me-2 text-secondary"></i>;
    }
    return null;
  };
  
  const children = 'tables' in item ? item.tables : ('columns' in item ? item.columns : []);

  return (
    <Accordion flush>
      <Accordion.Item eventKey={item.name} className={styles.accordionItem}>
        <Accordion.Header as="div" className={styles.accordionHeader}>
          {getIcon()}
          <span className="fw-bold">{item.name}</span>
          {item.comment && <small className="text-muted ms-2">({item.comment})</small>}
        </Accordion.Header>
        <Accordion.Body className={styles.accordionBody}>
          {children.map((child: any) =>
            'columns' in child ? ( // childがTable型か
              <TreeNode key={child.name} item={child} type="table" />
            ) : ( // childがColumn型
              <div key={child.name} className={`${styles.columnItem} ps-4`}>
                <span className="text-body-secondary">{child.name}</span>
                <span className="text-muted small ms-auto">{child.data_type}</span>
              </div>
            )
          )}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

export default TreeNode; 