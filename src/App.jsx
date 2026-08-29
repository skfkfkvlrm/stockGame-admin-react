import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './features/core/layout/MainLayout';
import Login from './features/auth/components/Login';
import AdminDashboard from './features/admin/components/AdminDashboard';
import AdminStockDetail from './features/stocks/components/AdminStockDetail';
import AdminStudentDetail from './features/admin/components/AdminStudentDetail';
import RequireAdmin from './features/auth/components/RequireAdmin';
import useAuthStore from './features/auth/store/useAuthStore';
import './App.css';

const RequireAuth = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuthStore();
    
    if (isLoading) {
        return <div className="app-container"><div className="loading-spinner"></div></div>;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

function App() {
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인은 레이아웃 외부에서 단독 렌더링 */}
        <Route path="/login" element={<Login />} />
        
        {/* 내부 페이지들은 MainLayout 내에서 렌더링 */}
        <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="stocks/:stockId" element={<RequireAdmin><AdminStockDetail /></RequireAdmin>} />
            <Route path="students/:studentId" element={<RequireAdmin><AdminStudentDetail /></RequireAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
