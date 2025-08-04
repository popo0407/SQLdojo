import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import TemplateManagementPage from './pages/TemplateManagementPage';
import SqlLogPage from './pages/SqlLogPage';
import { AuthProvider } from './contexts/AuthContext';
import { MetadataProvider } from './contexts/MetadataContext';
import PrivateRoute from './components/auth/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import { TemplateProvider } from './features/templates/stores/TemplateProvider';
import { PageErrorBoundary } from './components/common/ErrorBoundary';

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const AppContent = (
    <Routes>
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/user" element={<PrivateRoute><UserPage /></PrivateRoute>} />
      <Route path="/manage-templates" element={<PrivateRoute><TemplateManagementPage /></PrivateRoute>} />
      <Route path="/sql-log" element={<PrivateRoute><SqlLogPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute requireAdmin><AdminPage /></PrivateRoute>} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );

  return (
    <PageErrorBoundary>
      <AuthProvider>
        <MetadataProvider>
          <TemplateProvider>
            {isLoginPage ? (
              AppContent
            ) : (
              <MainLayout>
                {AppContent}
              </MainLayout>
            )}
          </TemplateProvider>
        </MetadataProvider>
      </AuthProvider>
    </PageErrorBoundary>
  );
}

export default App;
