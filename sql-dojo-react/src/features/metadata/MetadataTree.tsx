import React from 'react';
import { ListGroup } from 'react-bootstrap';
import TreeNode from './TreeNode';
import type { Schema } from '../../types/metadata';

interface MetadataTreeProps {
  schemas: Schema[];
}

const MetadataTree: React.FC<MetadataTreeProps> = ({ schemas }) => {
  if (!schemas || schemas.length === 0) {
    return null; // 何も描画しない
  }
  return (
    <ListGroup>
      {schemas.map((schema) => (
        <TreeNode key={schema.name} item={schema} />
      ))}
    </ListGroup>
  );
};

export default MetadataTree; 