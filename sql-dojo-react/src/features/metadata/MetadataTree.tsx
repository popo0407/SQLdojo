import React from 'react';
import { ListGroup } from 'react-bootstrap';
import TreeNode from '../../components/common/TreeNode';
import type { Schema } from '../../types/api';

interface MetadataTreeProps {
  schemas: Schema[];
}

const MetadataTree: React.FC<MetadataTreeProps> = ({ schemas }) => {
  if (!schemas || schemas.length === 0) {
    return (
      <div className="text-center text-muted p-3">
        <i className="fas fa-database mb-2" style={{ fontSize: '2rem' }}></i>
        <div>
          <small>DB情報がありません</small>
          <br />
          <small className="text-muted">管理者にメタデータの更新を依頼してください</small>
        </div>
      </div>
    );
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