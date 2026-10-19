import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const isLoading = useAuthStore((state) => state.isLoading);
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!studentId || !password) {
            setErrorMessage('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        const result = await login(studentId, password);
        if (result.success) {
            const role = result.data?.role;
            const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER' || role === 'ROLE_TEACHER';
            if (!isAdmin) {
                localStorage.removeItem('jwt_token');
                setErrorMessage('관리자(교사) 전용 포털입니다. 학생 계정은 학생용 포털을 이용해 주세요.');
                return;
            }
            navigate('/', { replace: true });
        } else {
            setErrorMessage(result.message || '아이디 또는 비밀번호가 틀립니다.');
        }
    };

    const handleDemoAdminLogin = async () => {
        setIsDemoLoading(true);
        setErrorMessage('');
        try {
            const result = await login('admin', '1234');
            if (result.success) {
                const role = result.data?.role;
                const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER' || role === 'ROLE_TEACHER';
                if (!isAdmin) {
                    localStorage.removeItem('jwt_token');
                    setErrorMessage('관리자(교사) 전용 포털입니다. 관리자 권한이 확인되지 않았습니다.');
                    return;
                }
                navigate('/', { replace: true });
            } else {
                setErrorMessage(result.message || '관리자 데모 로그인에 실패했습니다.');
            }
        } catch (error) {
            setErrorMessage(error.message || '관리자 데모 로그인 중 오류가 발생했습니다.');
        } finally {
            setIsDemoLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container glass-panel">
                <div className="login-header">
                    <div className="brand-logo-large">📈 STKGAME ADMIN</div>
                    <p>학급 모의투자 운영 및 시장 관제 콘솔</p>
                </div>

                {/* Recruiter 1-Click Admin Demo Login Card */}
                <div className="demo-login-card">
                    <div className="demo-badge-row">
                        <span className="demo-badge"><Sparkles size={13} /> Recruiter Quick Access</span>
                        <span className="demo-badge-sub">포트폴리오 심사용</span>
                    </div>
                    <h3 className="demo-title">🛡️ 교사용 관리자 포털 1클릭 즉시 체험</h3>
                    <p className="demo-desc">
                        개설 종목 관리, 시장 개장/휴장 제어, 학급 포인트 지급/회수 등<br />
                        선생님 권한의 전체 기능을 즉시 둘러보실 수 있습니다.
                    </p>
                    <button
                        type="button"
                        className="demo-login-btn"
                        onClick={handleDemoAdminLogin}
                        disabled={isDemoLoading || isLoading}
                    >
                        <ShieldCheck size={18} />
                        <span>{isDemoLoading ? '관리자 권한 인증 중...' : '🚀 1클릭 관리자 데모 로그인 (즉시 체험)'}</span>
                    </button>
                    <div className="demo-account-hint">
                        체험 계정: <code>admin</code> / 비밀번호: <code>1234</code>
                    </div>
                </div>

                <div className="login-divider">
                    <span>또는 아이디 직접 입력</span>
                </div>

                {errorMessage && <div className="error-msg">{errorMessage}</div>}

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label>아이디</label>
                        <div className="input-icon-wrapper">
                            <User className="input-icon" size={18} />
                            <input
                                type="text"
                                placeholder="아이디를 입력하세요"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>비밀번호</label>
                        <div className="input-icon-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                type="password"
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading || isDemoLoading}>
                        <LogIn size={20} /> {isLoading ? '로그인 중...' : '관리자 로그인'}
                    </button>
                </form>

                {/* Student Portal Cross-link */}
                <div className="student-portal-link-box">
                    <p className="portal-hint">학생 화면(주식 주문, 차트, 랭킹)을 확인하시겠습니까?</p>
                    <a
                        href="https://stock.skfkfkvlrm.kr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="student-link-btn"
                    >
                        <ExternalLink size={16} />
                        <span>🎓 학생용 모의투자 포털로 이동 (stock.skfkfkvlrm.kr) ↗</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;
