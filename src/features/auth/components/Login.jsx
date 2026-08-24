import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const isLoading = useAuthStore((state) => state.isLoading);
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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
            const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER';
            if (!isAdmin) {
                localStorage.removeItem('jwt_token');
                setErrorMessage('관리자(교사) 전용 포털입니다. 학생 계정은 학생용 포털(5173)을 이용해 주세요.');
                return;
            }
            navigate('/', { replace: true });
        } else {
            setErrorMessage(result.message || '아이디 또는 비밀번호가 틀립니다.');
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container glass-panel">
                <div className="login-header">
                    <div className="brand-logo-large">STOCKGAME</div>
                    <p>실전 감각을 기르는 최고의 방법</p>
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

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        <LogIn size={20} /> {isLoading ? '로그인 중...' : '관리자 로그인'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
