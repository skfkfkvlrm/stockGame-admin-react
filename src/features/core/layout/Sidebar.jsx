import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Newspaper, Wallet, Store, LogOut, ShieldCheck, Trophy, Ticket, Users } from 'lucide-react';
import useAuthStore from '../../auth/store/useAuthStore';
import useMarketStore from '../../admin/store/useMarketStore';
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const fetchMe = useAuthStore((state) => state.fetchMe);

    const marketOpen = useMarketStore((state) => state.marketOpen);
    const mode = useMarketStore((state) => state.mode);
    const openTime = useMarketStore((state) => state.openTime);
    const closeTime = useMarketStore((state) => state.closeTime);
    const statusCode = useMarketStore((state) => state.statusCode);
    const fetchMarketStatus = useMarketStore((state) => state.fetchMarketStatus);

    useEffect(() => {
        fetchMe();
        fetchMarketStatus();
    }, [location.pathname]);

    const getMarketStatusLabel = () => {
        if (statusCode === 'HOLIDAY') return '주말 정기 휴장';
        if (statusCode === 'CLOSED') return `장 마감 (${openTime} 개장)`;
        if (statusCode === 'MANUAL_PAUSE') return '수동 점검(휴장)';
        return `정규장 운영중 (${openTime}~${closeTime})`;
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    if (!user) return <aside className="right-sidebar glass-panel"><div className="loading-spinner"></div></aside>;

    const isAdmin = user && (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_MANAGER' || user.studentId === 'admin' || user.username === 'admin');

    return (
        <aside className="right-sidebar glass-panel">
            <div className="sidebar-header">
                <div className="brand-logo">📈 STKGAME</div>
            </div>

            <div className="user-profile">
                <div className="avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
                <div className="user-details">
                    <h2 className="user-name">{user.name}</h2>
                    <p className="user-class">
                        {isAdmin ? '학급 최고 관리자' : `${user.grade || ''}학년 ${user.className || ''}반 ${user.classNumber || ''}번`}
                    </p>
                </div>
            </div>

            <div className="point-card glass-panel">
                <p className="point-label">보유 포인트</p>
                <h3 className="point-amount">{user.totalPoint ? user.totalPoint.toLocaleString() : 0} <span className="currency">P</span></h3>
            </div>

            <div className={`market-status ${marketOpen ? 'open' : 'closed'}`}>
                <span className="status-dot"></span>
                <p>{getMarketStatusLabel()}</p>
            </div>

            <nav className="sidebar-menu">
                <button className={`menu-item ${isActive('/') || isActive('/admin') || location.pathname.startsWith('/stocks/') ? 'active' : ''}`} onClick={() => navigate('/')}>
                    <ShieldCheck className="icon" size={20} /> 관리자 총괄 관제
                </button>
            </nav>
            
            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} /> 로그아웃
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
