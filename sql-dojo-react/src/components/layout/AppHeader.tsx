import React, { useState } from 'react';
import { Navbar, Container, Nav } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LogoutButton from '../auth/LogoutButton';
import AdminLoginModal from '../auth/AdminLoginModal';
import logoImage from '../../assets/hint.png';

const AppHeader: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleAdminLogin = () => {
    setShowAdminModal(true);
  };

  return (
    <>
      <Navbar bg="light" expand="lg" className="border-bottom">
        <Container fluid>
          <Navbar.Brand as={Link} to="/">
            <img
              src={logoImage}
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
                  {user?.user_name} ({user?.user_id})
                </Navbar.Text>
              </Nav.Item>
              <Nav.Link as={Link} to="/">SQLエディタ</Nav.Link>
              <Nav.Link as={Link} to="/manage-templates">テンプレート管理</Nav.Link>
              <Nav.Link as={Link} to="/sql-log">SQL実行履歴</Nav.Link>
              {!isAdmin && (
                <Nav.Link as="button" onClick={handleAdminLogin} style={{ border: 'none', background: 'none' }}>
                  管理者ログイン
                </Nav.Link>
              )}
              {isAdmin && (
                <Nav.Link as={Link} to="/admin">管理者ページ</Nav.Link>
              )}
              <LogoutButton />
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <AdminLoginModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
      />
    </>
  );
};

export default AppHeader; 