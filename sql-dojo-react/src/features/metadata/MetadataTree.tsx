import React from 'react';
import type { Schema } from '../../types/metadata';
import TreeNode from './TreeNode';

interface MetadataTreeProps {
  schemas: Schema[];
}

const MetadataTree: React.FC<MetadataTreeProps> = ({ schemas }) => {
  return (
    <div>
      {schemas.map((schema) => (
        <TreeNode key={schema.name} item={schema} type="schema" />
      ))}
    </div>
  );
};

export default MetadataTree; 