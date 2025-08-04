import React, { useEffect } from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { useMetadata } from '../../../../hooks/useMetadata';
import MetadataTree from '../../../metadata/MetadataTree';
import MetadataRefreshButton from './MetadataRefreshButton';

/**
 * 管理者用メタデータ管理画面
 */
const MetadataManagement: React.FC = () => {
  const { data, loading, error, lastUpdated, fetchMetadata } = useMetadata();

  // 初期データ読み込み
  useEffect(() => {
    if (data.length === 0 && !loading) {
      fetchMetadata().catch(error => {
        console.error('初期メタデータ読み込みエラー:', error);
      });
    }
  }, [data.length, loading, fetchMetadata]);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '未取得';
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getTotalCount = () => {
    if (!data.length) return { schemas: 0, tables: 0, columns: 0 };
    
    let tables = 0;
    let columns = 0;
    
    data.forEach(schema => {
      tables += schema.tables?.length || 0;
      schema.tables?.forEach(table => {
        columns += table.columns?.length || 0;
      });
    });
    
    return {
      schemas: data.length,
      tables,
      columns,
    };
  };

  const counts = getTotalCount();

  return (
    <div className="metadata-management">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-database me-2" />
            メタデータ管理
          </h5>
          <MetadataRefreshButton size="sm" />
        </Card.Header>
        
        <Card.Body>
          {/* 統計情報 */}
          <Row className="mb-3">
            <Col md={3}>
              <div className="text-center">
                <Badge bg="primary" className="fs-6 px-3 py-2">
                  スキーマ: {counts.schemas}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <Badge bg="info" className="fs-6 px-3 py-2">
                  テーブル: {counts.tables}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <Badge bg="success" className="fs-6 px-3 py-2">
                  カラム: {counts.columns}
                </Badge>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <small className="text-muted">
                  最終更新: {formatLastUpdated(lastUpdated)}
                </small>
              </div>
            </Col>
          </Row>

          {/* エラー表示 */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2" />
              {error}
              <br />
              <small>右上の更新ボタンから再試行してください。</small>
            </div>
          )}

          {/* メタデータツリー */}
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">読み込み中...</span>
              </div>
              <div className="mt-2">メタデータを読み込んでいます...</div>
            </div>
          ) : data.length > 0 ? (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <MetadataTree schemas={data} />
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <i className="fas fa-database fa-3x mb-3" />
              <div>メタデータが見つかりません</div>
              <small>右上の更新ボタンからメタデータを取得してください。</small>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default MetadataManagement;
