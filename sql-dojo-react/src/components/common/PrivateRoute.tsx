import React from 'react';
import { Navigate } from 'react-router-dom';
// import { useAuth } from '../../contexts/AuthContext'; // 将来的に作成

// AuthContextがまだないので、仮の認証ロジックを入れます
const useAuth = () => {
    // ここでは仮に常に認証済みとします。後でAuthContextと連携させます。
    return { isAuthenticated: true };
};

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute; 