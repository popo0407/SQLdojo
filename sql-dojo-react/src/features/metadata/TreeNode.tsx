import React from 'react';
import { ListGroup } from 'react-bootstrap';

interface TreeNodeProps {
  item: any;
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, level = 0 }) => {
  const getIcon = () => {
    if ('tables' in item) {
      return 'fas fa-database';
    }
    if ('columns' in item) {
      return 'fas fa-table';
    }
    return 'fas fa-columns';
  };

  const getDisplayName = () => {
    if ('tables' in item) {
      return item.name;
    }
    if ('columns' in item) {
      return item.name;
    }
    return item.name;
  };

  return (
    <ListGroup.Item 
      style={{ 
        paddingLeft: `${level * 20 + 10}px`,
        fontSize: '0.9rem'
      }}
    >
      <i className={`${getIcon()} me-2`}></i>
      {getDisplayName()}
    </ListGroup.Item>
  );
};

export default TreeNode; 