import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { AdminTemplateManagementPage } from '../features/templates/components/management/admin/AdminTemplateManagementPage';
import MetadataManagement from '../features/admin/components/metadata/MetadataManagement';
import { BusinessUserManagement } from '../features/admin/components/user/BusinessUserManagement';
import { MetadataProvider } from '../contexts/MetadataContext';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('templates');

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">
            <i className="fas fa-cog me-2" />
            管理者コンソール
          </h2>
          
          {/* タブナビゲーション */}
          <Nav variant="tabs" className="mb-4">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'templates'} 
                onClick={() => setActiveTab('templates')}
              >
                <i className="fas fa-file-alt me-2" />
                テンプレート管理
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'metadata'} 
                onClick={() => setActiveTab('metadata')}
              >
                <i className="fas fa-database me-2" />
                メタデータ管理
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')}
              >
                <i className="fas fa-users me-2" />
                ユーザー管理
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* タブコンテンツ */}
          {activeTab === 'templates' && (
            <AdminTemplateManagementPage />
          )}
          
          {activeTab === 'metadata' && (
            <MetadataProvider>
              <MetadataManagement />
            </MetadataProvider>
          )}

          {activeTab === 'users' && (
            <BusinessUserManagement />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPage; 