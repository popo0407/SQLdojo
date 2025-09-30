import React from 'react';
import MasterDataTabs from '../components/master/MasterDataTabs';

const MasterDataPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>マスターデータ管理</h1>
        <p>Snowflakeからのマスターデータ取得・管理・SQL生成</p>
      </div>
      
      <div className="page-content">
        <MasterDataTabs />
      </div>
    </div>
  );
};

export default MasterDataPage;