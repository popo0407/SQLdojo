import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory } from '@fortawesome/free-solid-svg-icons';
import { SqlHistory } from '../features/sql-history';

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

          <SqlHistory />
        </Col>
      </Row>
    </Container>
  );
};

export default SqlLogPage;
