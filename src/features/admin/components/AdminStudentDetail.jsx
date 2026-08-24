import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, User, DollarSign, TrendingUp, TrendingDown, PieChart, Clock, Ticket, RefreshCw, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import api from '../../../api/axios';
import './AdminStudentDetail.css';

const AdminStudentDetail = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const [studentData, setStudentData] = useState(null);
    const [pointsHistory, setPointsHistory] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'points' | 'coupons'

    // Point adjustment modal state
    const [pointModalOpen, setPointModalOpen] = useState(false);
    const [pointType, setPointType] = useState('add');
    const [pointAmount, setPointAmount] = useState('');
    const [pointReason, setPointReason] = useState('');
    const [isSubmittingPoint, setIsSubmittingPoint] = useState(false);

    const fetchAllStudentDetails = async () => {
        setIsRefreshing(true);
        try {
            const [assetRes, pointsRes, couponsRes, allStudentsRes] = await Promise.all([
                api.get(`/asset/admin/students/${studentId}/detail`).catch(() => ({ data: { success: false, data: null } })),
                api.get(`/admin/students/${studentId}/points`).catch(() => ({ data: { success: false, data: [] } })),
                api.get(`/admin/students/${studentId}/coupons`).catch(() => ({ data: { success: false, data: [] } })),
                api.get('/admin/students').catch(() => ({ data: { success: false, data: [] } }))
            ]);

            const asset = assetRes.data?.data;
            const allStudents = allStudentsRes.data?.data || [];
            const profile = allStudents.find(s => s.studentId === studentId) || { studentId, name: studentId };

            if (!asset && !profile) {
                setError('학생 정보를 찾을 수 없습니다.');
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }

            setStudentData({
                ...profile,
                ...(asset || {}),
                totalAsset: asset?.totalAsset ?? profile.totalPoint ?? 0,
                totalPoint: asset?.totalPoint ?? profile.totalPoint ?? 0,
                myStocks: asset?.myStocks || [],
                totalProfit: asset?.totalProfit || 0
            });

            setPointsHistory(Array.isArray(pointsRes.data?.data) ? pointsRes.data.data : []);
            setCoupons(Array.isArray(couponsRes.data?.data) ? couponsRes.data.data : []);

        } catch (err) {
            console.error('Fetch student detail error:', err);
            setError('학생 데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllStudentDetails();
    }, [studentId]);

    const handleAdjustPoint = async (e) => {
        e.preventDefault();
        if (!pointAmount || isNaN(pointAmount) || Number(pointAmount) <= 0) {
            alert('올바른 포인트 금액을 입력해 주세요.');
            return;
        }

        const finalAmount = pointType === 'add' ? Number(pointAmount) : -Number(pointAmount);
        setIsSubmittingPoint(true);

        try {
            await api.post(`/admin/students/${studentId}/point`, {
                amount: finalAmount,
                reason: pointReason || (pointType === 'add' ? '교사 수동 지급' : '교사 수동 차감')
            });
            alert(`${studentData?.name || studentId} 학생에게 포인트 ${pointType === 'add' ? '지급' : '차감'}이 완료되었습니다.`);
            setPointModalOpen(false);
            setPointAmount('');
            setPointReason('');
            fetchAllStudentDetails();
        } catch (err) {
            alert(err.response?.data?.message || '포인트 반영에 실패했습니다.');
        } finally {
            setIsSubmittingPoint(false);
        }
    };

    if (isLoading) {
        return (
            <div className="admin-student-detail-container">
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
                    <RefreshCw className="spin" size={32} style={{ margin: '0 auto 12px' }} />
                    <p>학생 종합 포트폴리오를 불러오는 중입니다...</p>
                </div>
            </div>
        );
    }

    if (error || !studentData) {
        return (
            <div className="admin-student-detail-container">
                <button className="admin-student-back-btn" onClick={() => navigate('/', { state: { tab: 'students' } })}>
                    <ArrowLeft size={16} /> 학생 관리로 돌아가기
                </button>
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>
                    <h2>{error || '학생 정보를 불러올 수 없습니다.'}</h2>
                </div>
            </div>
        );
    }

    // Pie/Donut Chart Data for Portfolio Allocation
    const myStocks = studentData.myStocks || [];
    const stockValSum = myStocks.reduce((acc, cur) => acc + (cur.purchasePrice || (cur.amount * cur.currentPrice) || 0), 0);
    const cashPoint = studentData.totalPoint || 0;

    const chartLabels = ['현금 포인트', ...myStocks.map(s => s.stockName || '주식')];
    const chartSeries = [cashPoint, ...myStocks.map(s => (s.purchasePrice || (s.amount * s.currentPrice) || 0))];

    const chartOptions = {
        chart: { type: 'donut', background: 'transparent' },
        labels: chartLabels,
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'],
        legend: { position: 'bottom', labels: { colors: '#64748b' } },
        tooltip: {
            y: { formatter: (val) => `${Number(val).toLocaleString()} P` }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: '총 순자산',
                            formatter: () => `${(studentData.totalAsset || 0).toLocaleString()} P`
                        }
                    }
                }
            }
        }
    };

    return (
        <div className="admin-student-detail-container">
            {/* Navigation & Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button className="admin-student-back-btn" onClick={() => navigate('/', { state: { tab: 'students' } })}>
                    <ArrowLeft size={16} /> 학생 목록으로 돌아가기
                </button>
                <button 
                    onClick={fetchAllStudentDetails} 
                    disabled={isRefreshing}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#475569',
                        cursor: 'pointer'
                    }}
                >
                    <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} /> 새로고침
                </button>
            </div>

            {/* 1. Header Profile Card */}
            <div className="admin-student-header-card">
                <div className="student-profile-info">
                    <div className="student-avatar-large">
                        {studentData.name ? studentData.name.charAt(0) : 'S'}
                    </div>
                    <div className="student-name-box">
                        <h1>{studentData.name} ({studentData.studentId})</h1>
                        <div className="student-meta-badges">
                            <span className="student-badge">
                                {studentData.grade ? `${studentData.grade}학년` : ''} {studentData.className || ''} {studentData.classNumber ? `${studentData.classNumber}번` : ''}
                            </span>
                            <span className="student-badge rank">
                                학급 랭킹: {studentData.rank ? `${studentData.rank}위` : '참여 중'}
                            </span>
                            <span className="student-badge">
                                사용 가능한 쿠폰: {coupons.filter(c => c.state === '사용전' || c.state === 'UNUSED' || c.state === '미사용' || c.status === 'UNUSED' || c.isUsed === false).length}개 (총 {coupons.length}개)
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        onClick={() => setPointModalOpen(true)}
                        style={{
                            padding: '10px 18px',
                            background: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)'
                        }}
                    >
                        <DollarSign size={16} /> 포인트 수동 지급 / 차감
                    </button>
                </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="student-metrics-grid">
                <div className="student-metric-card">
                    <span className="student-metric-label">총 순자산 (Total Assets)</span>
                    <div className="student-metric-val">
                        {(studentData.totalAsset || 0).toLocaleString()} <span className="unit">P</span>
                    </div>
                </div>
                <div className="student-metric-card">
                    <span className="student-metric-label">보유 현금 포인트 (Cash)</span>
                    <div className="student-metric-val" style={{ color: '#10b981' }}>
                        {(studentData.totalPoint || 0).toLocaleString()} <span className="unit">P</span>
                    </div>
                </div>
                <div className="student-metric-card">
                    <span className="student-metric-label">주식 평가액 (Stocks Value)</span>
                    <div className="student-metric-val" style={{ color: '#3b82f6' }}>
                        {stockValSum.toLocaleString()} <span className="unit">P</span>
                    </div>
                </div>
                <div className="student-metric-card">
                    <span className="student-metric-label">투자 평가 손익 (Profit)</span>
                    <div className="student-metric-val" style={{ color: (studentData.totalProfit || 0) >= 0 ? '#ef4444' : '#3b82f6' }}>
                        {(studentData.totalProfit || 0) > 0 ? '+' : ''}{(studentData.totalProfit || 0).toLocaleString()} <span className="unit">P</span>
                    </div>
                </div>
            </div>

            {/* 3. Portfolio Allocation & Current Holdings */}
            <div className="student-portfolio-section">
                {/* Donut Chart */}
                <div className="section-panel">
                    <h3 className="section-title">
                        <PieChart size={20} color="#6366f1" /> 자산 포트폴리오 배분
                    </h3>
                    {chartSeries.every(v => v === 0) ? (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                            보유 자산 데이터가 없습니다.
                        </div>
                    ) : (
                        <ReactApexChart options={chartOptions} series={chartSeries} type="donut" height={280} />
                    )}
                </div>

                {/* Holdings Table */}
                <div className="section-panel">
                    <h3 className="section-title">
                        <TrendingUp size={20} color="#3b82f6" /> 보유 주식 종목 현황 ({myStocks.length})
                    </h3>
                    {myStocks.length === 0 ? (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                            현재 보유 중인 주식 종목이 없습니다.
                        </div>
                    ) : (
                        <table className="detail-table">
                            <thead>
                                <tr>
                                    <th>종목명</th>
                                    <th>보유 수량</th>
                                    <th>현재가</th>
                                    <th>총 평가액</th>
                                    <th>손익</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myStocks.map((stk, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: '700' }}>{stk.stockName}</td>
                                        <td>{stk.amount} 주</td>
                                        <td>{(stk.currentPrice || 0).toLocaleString()} P</td>
                                        <td style={{ fontWeight: '700' }}>
                                            {((stk.amount || 0) * (stk.currentPrice || 0)).toLocaleString()} P
                                        </td>
                                        <td style={{ fontWeight: '700', color: (stk.profit || 0) >= 0 ? '#ef4444' : '#3b82f6' }}>
                                            {(stk.profit || 0) > 0 ? '+' : ''}{(stk.profit || 0).toLocaleString()} P
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 4. Activity History Tabs */}
            <div className="activity-tabs-container">
                <div className="activity-tab-header">
                    <button 
                        className={`activity-tab-btn ${activeTab === 'points' ? 'active' : ''}`}
                        onClick={() => setActiveTab('points')}
                    >
                        <Clock size={16} /> 포인트 변동 이력 ({pointsHistory.length})
                    </button>
                    <button 
                        className={`activity-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coupons')}
                    >
                        <Ticket size={16} /> 보유/구매 쿠폰함 ({coupons.length})
                    </button>
                </div>

                <div className="activity-tab-body">
                    {activeTab === 'points' && (
                        pointsHistory.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                                포인트 변동 기록이 없습니다.
                            </div>
                        ) : (
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>일시</th>
                                        <th>구분</th>
                                        <th>상세 내역 (사유 / 종목명)</th>
                                        <th style={{ textAlign: 'right' }}>변동 금액</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pointsHistory.map((ph, idx) => {
                                        const changeVal = ph.pointChange ?? ph.changedAmount ?? ph.amount ?? 0;
                                        const isPlus = changeVal >= 0;
                                        const contentText = ph.historyContent || ph.reason || ph.content || '포인트 변동';
                                        const typeText = ph.historyType || (isPlus ? '지급' : '차감');
                                        const dateRaw = ph.historyDate || ph.createdDate;
                                        const dateFormatted = dateRaw ? new Date(dateRaw).toLocaleString('ko-KR') : '-';

                                        return (
                                            <tr key={idx}>
                                                <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                                    {dateFormatted}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        background: isPlus ? '#ecfdf5' : '#fef2f2',
                                                        color: isPlus ? '#059669' : '#dc2626'
                                                    }}>
                                                        {typeText}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: '600', color: '#1e293b' }}>
                                                    {contentText}
                                                </td>
                                                <td style={{ fontWeight: '800', textAlign: 'right', color: isPlus ? '#10b981' : '#ef4444' }}>
                                                    {isPlus ? '+' : ''}{changeVal.toLocaleString()} P
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )
                    )}

                    {activeTab === 'coupons' && (
                        coupons.length === 0 ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                                구매한 쿠폰 내역이 없습니다.
                            </div>
                        ) : (
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>쿠폰 상품명</th>
                                        <th>구매 일시</th>
                                        <th>사용 여부</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map((cp, idx) => {
                                        const rawState = cp.state || cp.status || '';
                                        const isUsed = cp.isUsed === true || rawState === '사용' || rawState === 'USED';
                                        return (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: '700', color: '#1e293b' }}>{cp.name || cp.couponName || '쿠폰'}</td>
                                                <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                                    {cp.createdDate ? new Date(cp.createdDate).toLocaleString('ko-KR') : '-'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700',
                                                        background: isUsed ? '#f1f5f9' : '#dcfce7',
                                                        color: isUsed ? '#94a3b8' : '#15803d'
                                                    }}>
                                                        {isUsed ? '사용 완료' : '사용 가능'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            </div>

            {/* Point Adjustment Modal */}
            {pointModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content glass-panel" style={{ maxWidth: '420px', padding: '24px', background: '#ffffff', borderRadius: '16px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '12px' }}>
                            💰 {studentData.name} 학생 포인트 관리
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                            현재 보유 포인트: <strong>{(studentData.totalPoint || 0).toLocaleString()} P</strong>
                        </p>

                        <form onSubmit={handleAdjustPoint}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setPointType('add')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: pointType === 'add' ? '2px solid #10b981' : '1px solid #cbd5e1',
                                        background: pointType === 'add' ? 'rgba(16, 185, 129, 0.1)' : '#ffffff',
                                        color: pointType === 'add' ? '#10b981' : '#64748b',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + 포인트 지급
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPointType('sub')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: pointType === 'sub' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                        background: pointType === 'sub' ? 'rgba(239, 68, 68, 0.1)' : '#ffffff',
                                        color: pointType === 'sub' ? '#ef4444' : '#64748b',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    - 포인트 차감
                                </button>
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    금액 (P)
                                </label>
                                <input
                                    type="number"
                                    placeholder="예: 5000"
                                    value={pointAmount}
                                    onChange={(e) => setPointAmount(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    지급/차감 사유
                                </label>
                                <input
                                    type="text"
                                    placeholder="예: 발표 우수 보상, 규칙 위반 벌점 등"
                                    value={pointReason}
                                    onChange={(e) => setPointReason(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setPointModalOpen(false)}
                                    style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPoint}
                                    style={{ padding: '10px 18px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    {isSubmittingPoint ? '반영 중...' : '확인'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStudentDetail;
