import React, { useState } from 'react';
import { Navbar, Container, Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebarMasterDataStore } from '../../stores/useSidebarMasterDataStore';
import LogoutButton from '../auth/LogoutButton';
import AdminLoginModal from '../auth/AdminLoginModal';
import logoImage from '../../assets/hint.png';

const AppHeader: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const { 
    measureMaster, 
    setMaster, 
    freeMaster, 
    partsMaster, 
    troubleMaster,
    selectedStation
  } = useSidebarMasterDataStore();
  const [showAdminModal, setShowAdminModal] = useState(false);

  const handleAdminLogin = () => {
    setShowAdminModal(true);
  };

  // SQL生成AIボタンクリック時の処理
  const handleSqlGenerateAI = async () => {
    // ホームページ（メインワークスペース）でない場合は、リンクのみ開く
    if (location.pathname !== '/') {
      window.open(
        'https://d3r0xupf0a2onu.cloudfront.net/use-case-builder/execute/05466c70-2ebc-49fd-9197-ad00905aaf02',
        '_blank'
      );
      return;
    }
    
    // ステーション選択チェック: 選択されたステーション情報があるかを確認
    const hasSelectedStation = selectedStation !== null;
    const hasMasterData = measureMaster.length > 0 || 
                         setMaster.length > 0 || 
                         freeMaster.length > 0 || 
                         partsMaster.length > 0 || 
                         troubleMaster.length > 0;
    
    if (!hasSelectedStation && !hasMasterData) {
      // ステーション情報またはマスター情報がない場合は、ポップアップもコピーもせずにリンクのみ開く
      window.open(
        'https://d3r0xupf0a2onu.cloudfront.net/use-case-builder/execute/05466c70-2ebc-49fd-9197-ad00905aaf02',
        '_blank'
      );
      return;
    }

    try {
      // 選択されたステーション情報のみを含める
      const selectedStationInfo = selectedStation ? [selectedStation] : [];
      
      // 選択されたステーション情報と全マスター情報をJSONとして準備
      const masterDataForAI = {
        selectedStation: selectedStationInfo,
        masterData: {
          measure: measureMaster,
          set: setMaster,
          free: freeMaster,
          parts: partsMaster,
          trouble: troubleMaster
        }
      };

      // JSONを整形してクリップボードにコピー
      const jsonString = JSON.stringify(masterDataForAI, null, 2);
      await navigator.clipboard.writeText(jsonString);
      
      // コピー完了をユーザーに通知
      alert('マスター情報をクリップボードにコピーしました');
      
      // SQL生成AIページを開く
      window.open(
        'https://d3r0xupf0a2onu.cloudfront.net/use-case-builder/execute/05466c70-2ebc-49fd-9197-ad00905aaf02',
        '_blank'
      );
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error);
      alert('クリップボードへのコピーに失敗しました');
      // エラーが発生してもリンクは開く
      window.open(
        'https://d3r0xupf0a2onu.cloudfront.net/use-case-builder/execute/05466c70-2ebc-49fd-9197-ad00905aaf02',
        '_blank'
      );
    }
  };

  // 共通のボタンスタイル
  const buttonBaseStyle = {
    backgroundColor: '#f8f9fa',
    color: '#495057',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  };

  // アクティブなボタンのスタイル
  const activeButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#6c757d',
    color: '#ffffff',
    border: '1px solid #5a6268',
    fontWeight: '600'
  };

  // ページ判定関数
  const isActivePage = (path: string) => {
    return location.pathname === path;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const isActive = e.currentTarget.getAttribute('data-active') === 'true';
    if (!isActive) {
      e.currentTarget.style.backgroundColor = '#e9ecef';
      e.currentTarget.style.borderColor = '#adb5bd';
    }
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const isActive = e.currentTarget.getAttribute('data-active') === 'true';
    if (!isActive) {
      e.currentTarget.style.backgroundColor = '#f8f9fa';
      e.currentTarget.style.borderColor = '#dee2e6';
    } else {
      e.currentTarget.style.backgroundColor = '#6c757d';
      e.currentTarget.style.borderColor = '#5a6268';
    }
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
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
              <button 
                onClick={handleSqlGenerateAI}
                className="btn me-2 text-decoration-none"
                style={buttonBaseStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                SQL生成AI
              </button>
              <a 
                href="https://d3r0xupf0a2onu.cloudfront.net/use-case-builder/execute/846e7088-3c50-440c-9e8a-78dfaf0e8cc7"
                target="_blank"
                rel="noopener noreferrer"
                className="btn me-2 text-decoration-none"
                style={buttonBaseStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                SQL解説AI
              </a>
              <Link 
                to="/" 
                className="btn me-2 text-decoration-none"
                style={isActivePage('/') ? activeButtonStyle : buttonBaseStyle}
                data-active={isActivePage('/')}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                SQLエディタ
              </Link>
              <Link 
                to="/manage-templates" 
                className="btn me-2 text-decoration-none"
                style={isActivePage('/manage-templates') ? activeButtonStyle : buttonBaseStyle}
                data-active={isActivePage('/manage-templates')}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                テンプレート管理
              </Link>
              <Link 
                to="/sql-log" 
                className="btn me-2 text-decoration-none"
                style={isActivePage('/sql-log') ? activeButtonStyle : buttonBaseStyle}
                data-active={isActivePage('/sql-log')}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                SQL実行履歴
              </Link>
              {!isAdmin && (
                <button 
                  onClick={handleAdminLogin} 
                  className="btn me-2"
                  style={buttonBaseStyle}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  管理者ログイン
                </button>
              )}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="btn me-2 text-decoration-none"
                  style={isActivePage('/admin') ? activeButtonStyle : buttonBaseStyle}
                  data-active={isActivePage('/admin')}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  管理者ページ
                </Link>
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