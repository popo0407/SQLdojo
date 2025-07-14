import React from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext'; // 将来的に使用

const AppHeader: React.FC = () => {
  // const { user, logout } = useAuth(); // 将来的にAuthContextから取得

  // 仮のデータ
  const user = { user_name: 'テストユーザー', user_id: 'testuser' };
  const logout = () => console.log('logout');

  return (
    <Navbar bg="light" expand="lg" className="border-bottom">
      <Container fluid>
        <Navbar.Brand as={Link} to="/">
          <img
            src="/src/assets/hint.png" // Viteではこのように直接インポート or publicフォルダに配置します
            width="64"
            height="32"
            className="d-inline-block align-top"
            alt="SQL Dojo Logo"
          />
          <span className="ms-2 fw-bold">SQL道場 Webアプリ</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Item className="me-3">
              <Navbar.Text>
                {user.user_name} ({user.user_id})
              </Navbar.Text>
            </Nav.Item>
            <Nav.Link as={Link} to="/user">ユーザーページ</Nav.Link>
            <Nav.Link as={Link} to="/admin">管理者ページ</Nav.Link>
            <Button variant="outline-secondary" size="sm" onClick={logout}>ログアウト</Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppHeader; 