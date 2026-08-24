import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const RequireAdmin = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuthStore();
    const token = localStorage.getItem('jwt_token');

    if (isLoading || (token && !user)) {
        return <div className="app-container"><div className="loading-spinner"></div></div>;
    }

    // 학생 계정이거나(role이 ADMIN 또는 MANAGER가 아님) 미인증 상태인 경우 로그인 페이지로 리다이렉트
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'ROLE_ADMIN' || user.role === 'ROLE_MANAGER');

    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default RequireAdmin;
