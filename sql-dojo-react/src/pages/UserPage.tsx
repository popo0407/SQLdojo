import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faUser, faHistory } from '@fortawesome/free-solid-svg-icons';

const UserPage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <div className="mb-4">
            <h1 className="mb-2">
              <FontAwesomeIcon icon={faUser} className="me-2 text-primary" />
              ユーザーページ
            </h1>
            <p className="text-muted">
              個人テンプレートの管理やSQL実行履歴の確認ができます
            </p>
          </div>

          <Row>
            <Col md={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>
                    <FontAwesomeIcon icon={faList} className="me-2 text-primary" />
                    テンプレート管理
                  </Card.Title>
                  <Card.Text>
                    個人テンプレートの作成・編集・削除・順序変更ができます。
                    SQLクエリを再利用可能なテンプレートとして保存・管理しましょう。
                  </Card.Text>
                  <Link to="/manage-templates">
                    <Button variant="primary">
                      テンプレート管理画面へ
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mb-4">
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>
                    <FontAwesomeIcon icon={faHistory} className="me-2 text-secondary" />
                    SQL実行履歴
                  </Card.Title>
                  <Card.Text>
                    これまでに実行したSQLクエリの履歴を確認できます。
                    過去のクエリを参照して効率的にSQL作業を進めましょう。
                  </Card.Text>
                  <Link to="/sql-log">
                    <Button variant="outline-secondary">
                      SQL実行履歴へ
                    </Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default UserPage; 