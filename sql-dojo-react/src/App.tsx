import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import TemplateManagementPage from './pages/TemplateManagementPage';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import MainLayout from './components/layout/MainLayout';
import { TemplateProvider } from './features/templates/stores/TemplateProvider';

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const AppContent = (
    <Routes>
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/user" element={<PrivateRoute><UserPage /></PrivateRoute>} />
      <Route path="/manage-templates" element={<PrivateRoute><TemplateManagementPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute requireAdmin><AdminPage /></PrivateRoute>} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );

  return (
    <AuthProvider>
      <TemplateProvider>
        {isLoginPage ? (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        ) : (
          <MainLayout>
            {AppContent}
          </MainLayout>
        )}
      </TemplateProvider>
    </AuthProvider>
  );
}

export default App;
