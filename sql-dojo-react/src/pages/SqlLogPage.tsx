import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faCode, faClockRotateLeft } from '@fortawesome/free-solid-svg-icons';

const SqlLogPage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <div className="mb-4">
            <h1 className="mb-2">
              <FontAwesomeIcon icon={faHistory} className="me-2 text-primary" />
              SQL実行履歴
            </h1>
            <p className="text-muted">
              これまでに実行したSQLクエリの履歴を確認・再利用できます
            </p>
          </div>

          <Card>
            <Card.Body className="text-center py-5">
              <FontAwesomeIcon icon={faClockRotateLeft} size="4x" className="text-muted mb-4" />
              <h4 className="mb-3">SQL実行履歴</h4>
              <p className="text-muted mb-4">
                この機能は現在開発中です。<br />
                実装予定機能：
              </p>
              <div className="text-start" style={{ maxWidth: '400px', margin: '0 auto' }}>
                <ul className="text-muted">
                  <li>実行したSQLクエリの履歴表示</li>
                  <li>実行時間・結果件数の記録</li>
                  <li>履歴からクエリの再実行</li>
                  <li>お気に入りクエリの保存</li>
                  <li>実行統計の表示</li>
                </ul>
              </div>
              <div className="mt-4">
                <FontAwesomeIcon icon={faCode} className="me-2" />
                <small className="text-muted">Phase 4で実装予定</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SqlLogPage;
