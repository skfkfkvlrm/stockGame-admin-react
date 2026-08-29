import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { ArrowLeft, RefreshCw, Users, TrendingUp, Activity, Clock, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import api from '../../../api/axios';
import './AdminStockDetail.css';

const AdminStockDetail = () => {
    const { stockId } = useParams();
    const navigate = useNavigate();

    const [stockInfo, setStockInfo] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const [infoRes, historyRes, txRes] = await Promise.all([
                api.get(`/stock/${stockId}`).catch(() => ({ data: { success: false, data: null } })),
                api.get(`/stock/${stockId}/history`).catch(() => ({ data: { success: false, data: [] } })),
                api.get(`/admin/stocks/${stockId}/transactions`).catch(() => ({ data: { success: false, data: [] } }))
            ]);

            const info = infoRes.data?.data;
            if (!info) {
                setError('종목 정보를 찾을 수 없습니다.');
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }

            setStockInfo(info);
            setTransactions(Array.isArray(txRes.data?.data) ? txRes.data.data : []);

            const initialPrice = info.nowPrice ?? info.pubPrice ?? 0;
            const rawHistory = Array.isArray(historyRes.data?.data) ? historyRes.data.data : [];
            
            // 일별 거래 기록 OHLC 집계 (category x축용 문자열 라벨)
            const dayGroups = {};
            rawHistory.forEach(item => {
                const d = item.baseDate || item.date || item.createdDate;
                const dateObj = new Date(d || Date.now());
                const dateKey = d ? dateObj.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                const label = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
                const p = item.closePrice ?? item.price ?? initialPrice;
                const open = item.openPrice ?? p;
                const high = item.highPrice ?? Math.max(open, p);
                const low = item.lowPrice ?? Math.min(open, p);
                const close = item.closePrice ?? p;

                if (!dayGroups[dateKey]) {
                    dayGroups[dateKey] = { label, rawTime: dateObj.getTime(), open, high, low, close };
                } else {
                    dayGroups[dateKey].high = Math.max(dayGroups[dateKey].high, high);
                    dayGroups[dateKey].low = Math.min(dayGroups[dateKey].low, low);
                    dayGroups[dateKey].close = close;
                }
            });

            // 실제 거래일만 정렬하여 표시 (관리자 차트는 전체 기간 표시)
            const mappedHistory = Object.values(dayGroups)
                .sort((a, b) => a.rawTime - b.rawTime)
                .map(g => ({ x: g.label, y: [g.open, g.high, g.low, g.close] }));

            setChartData([{ data: mappedHistory }]);

        } catch (err) {
            console.error('Fetch admin stock detail error:', err);
            setError('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // 5초 주기 실시간 자동 동기화
        return () => clearInterval(interval);
    }, [stockId]);

    const chartOptions = {
        chart: { 
            type: 'candlestick', 
            background: 'transparent', 
            toolbar: { show: false }, 
            animations: { enabled: false } 
        },
        theme: { mode: 'light' },
        plotOptions: { candlestick: { colors: { upward: '#ef4444', downward: '#3b82f6' } } },
        xaxis: { 
            type: 'category',
            labels: { 
                style: { colors: '#64748b' },
                hideOverlappingLabels: true,
            } 
        },
        yaxis: { labels: { style: { colors: '#64748b' }, formatter: (v) => `${v.toLocaleString()}원` } },
        grid: { 
            borderColor: '#cbd5e1', 
            strokeDashArray: 3,
            opacity: 0.8,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}:${seconds}`;
    };

    if (isLoading) {
        return (
            <div className="admin-stock-detail-container">
                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    if (error || !stockInfo) {
        return (
            <div className="admin-stock-detail-container">
                <button className="admin-back-btn" onClick={() => navigate('/', { state: { tab: 'stocks' } })}>
                    <ArrowLeft size={16} /> 대시보드로 돌아가기
                </button>
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>
                    <h2>{error || '종목 정보를 불러올 수 없습니다.'}</h2>
                </div>
            </div>
        );
    }

    const currentPrice = stockInfo.nowPrice ?? stockInfo.pubPrice ?? 0;
    const prevPrice = stockInfo.prevPrice ?? currentPrice;
    const priceDiff = currentPrice - prevPrice;
    const changeRate = prevPrice > 0 ? ((priceDiff / prevPrice) * 100).toFixed(2) : 0;
    const isUp = priceDiff > 0;
    const isDown = priceDiff < 0;

    return (
        <div className="admin-stock-detail-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button className="admin-back-btn" onClick={() => navigate('/', { state: { tab: 'stocks' } })}>
                    <ArrowLeft size={16} /> 대시보드로 돌아가기
                </button>
                <button 
                    onClick={fetchData} 
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
                    <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} /> 실시간 새로고침
                </button>
            </div>

            {/* 1. Top Section: Profile & Statistics */}
            <div className="admin-stock-header-grid">
                {/* Left Card: Profile & Candlestick Chart */}
                <div className="admin-stock-profile-card">
                    <div className="admin-stock-title-row">
                        <div>
                            <h1>
                                {stockInfo.stockName || stockInfo.name}
                                <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }}>
                                    종목 #{stockId}
                                </span>
                            </h1>
                            <p className="admin-stock-desc">{stockInfo.content || '등록된 업종 및 기업 소개 정보가 없습니다.'}</p>
                        </div>
                        <div className="admin-stock-price-display">
                            <div className="admin-current-price">{currentPrice.toLocaleString()} P</div>
                            <div className={`admin-price-change ${isUp ? 'up' : isDown ? 'down' : 'flat'}`}>
                                {isUp ? '▲' : isDown ? '▼' : '-'} {Math.abs(priceDiff).toLocaleString()} P ({isUp ? '+' : ''}{changeRate}%)
                            </div>
                        </div>
                    </div>

                    <div className="admin-chart-wrapper">
                        {chartData.length > 0 && chartData[0].data.length > 0 ? (
                            <ReactApexChart 
                                options={chartOptions} 
                                series={chartData} 
                                type="candlestick" 
                                height={280} 
                            />
                        ) : (
                            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                누적된 거래 시세 차트 데이터가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Card: Key Management Statistics */}
                <div className="admin-stats-summary-card">
                    <div>
                        <div className="admin-stats-title">
                            <Activity size={18} color="#6366f1" /> 종목 핵심 관제 통계
                        </div>
                        <div className="admin-stats-list">
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">상장 상태</span>
                                <span className="admin-stat-val">
                                    {stockInfo.status === 'SUSPENDED' ? (
                                        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>🟡 거래 정지</span>
                                    ) : stockInfo.status === 'DELISTED' ? (
                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 상장 폐지</span>
                                    ) : (
                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢 정상 거래 중</span>
                                    )}
                                </span>
                            </div>
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">최초 발행가</span>
                                <span className="admin-stat-val">{(stockInfo.pubPrice ?? stockInfo.publicationPrice ?? 0).toLocaleString()} P</span>
                            </div>
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">현재 발행 잔량</span>
                                <span className="admin-stat-val highlight">{(stockInfo.pubAmount ?? stockInfo.publicationBalance ?? 0).toLocaleString()} 주</span>
                            </div>
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">누적 체결 거래량</span>
                                <span className="admin-stat-val">{(stockInfo.tradeVolume ?? 0).toLocaleString()} 주</span>
                            </div>
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">총 체결 건수</span>
                                <span className="admin-stat-val">{transactions.length.toLocaleString()} 건</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', fontSize: '0.8rem', color: '#64748b', marginTop: '16px', border: '1px solid #e2e8f0' }}>
                        💡 관리자 모드에서는 매수/매도 주문이 비활성화되며, 학생 간 실제 거래 체결 내역만 투명하게 모니터링됩니다.
                    </div>
                </div>
            </div>

            {/* 2. Bottom Section: Student Trade Transactions Log Grid */}
            <div className="admin-transactions-card">
                <div className="admin-transactions-header">
                    <h3>
                        <ArrowRightLeft size={20} color="#6366f1" /> 학생 실시간 체결 기록 (Trade History)
                        <span className="tx-badge-count">{transactions.length}건 체결됨</span>
                    </h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-tx-table">
                        <thead>
                            <tr>
                                <th>체결 ID</th>
                                <th>체결 일시</th>
                                <th>매수자 (Buyer)</th>
                                <th>매도자 (Seller)</th>
                                <th style={{ textAlign: 'right' }}>체결 단가</th>
                                <th style={{ textAlign: 'right' }}>체결 수량</th>
                                <th style={{ textAlign: 'right' }}>총 체결 금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <tr key={tx.transaction_id || tx.transactionId}>
                                        <td style={{ fontWeight: 'bold', color: '#64748b' }}>#{tx.transaction_id || tx.transactionId}</td>
                                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                                            <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                            {formatDate(tx.created_date || tx.createdDate)}
                                        </td>
                                        <td>
                                            <span className="admin-student-badge buyer">
                                                🔴 {tx.buyer_name || tx.buyerName || '학생'} ({tx.buyer_student_id || tx.buyerStudentId})
                                            </span>
                                        </td>
                                        <td>
                                            {tx.seller_student_id === 'SYSTEM_LP' ? (
                                                <span className="admin-student-badge lp">
                                                    🏦 초기발행(LP)
                                                </span>
                                            ) : (
                                                <span className="admin-student-badge seller">
                                                    🔵 {tx.seller_name || tx.sellerName || '학생'} ({tx.seller_student_id || tx.sellerStudentId})
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {(tx.price || 0).toLocaleString()} P
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#6366f1' }}>
                                            {(tx.amount || 0).toLocaleString()} 주
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                                            {((tx.total_price ?? (tx.amount * tx.price)) || 0).toLocaleString()} P
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
                                        아직 체결된 학생 간 거래 내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminStockDetail;
