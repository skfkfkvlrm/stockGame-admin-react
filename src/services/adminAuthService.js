import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const adminAuthService = {
    /**
     * 관리자 / 교사 로그인
     */
    async login(studentId, password) {
        if (isSupabaseMode) {
            const cleanId = studentId.trim();
            let email = `${cleanId}@skfkfkvlrm.kr`;

            let { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            // 하위 호환성 지원: 기존 admin@stockgame.local 계정 시도
            if (error && error.message === 'Invalid login credentials') {
                const legacyEmail = `${cleanId}@stockgame.local`;
                const legacyRes = await supabase.auth.signInWithPassword({
                    email: legacyEmail,
                    password
                });
                if (!legacyRes.error) {
                    data = legacyRes.data;
                    error = null;
                }
            }

            if (error) {
                const msg = error.message === 'Invalid login credentials'
                    ? '아이디 또는 비밀번호가 일치하지 않습니다.'
                    : (error.message || '로그인에 실패했습니다.');
                throw new Error(msg);
            }

            // 프로필 조회 및 관리자 권한 확인
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            const role = profile?.role;
            const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER' || role === 'ROLE_TEACHER';

            if (!isAdmin) {
                await supabase.auth.signOut();
                localStorage.removeItem('jwt_token');
                throw new Error('관리자(교사) 전용 포털입니다. 학생 계정은 접근할 수 없습니다.');
            }

            const token = data.session?.access_token;
            if (token) {
                localStorage.setItem('jwt_token', token);
            }

            return {
                id: data.user.id,
                studentId: profile?.student_id || cleanId,
                name: profile?.name || '관리자선생님',
                role: profile?.role || 'ROLE_ADMIN',
                token: token
            };
        }

        const response = await api.post('/members/login', { studentId, password });
        if (response.data && response.data.success) {
            const token = response.data.data?.token || response.data.message;
            if (token) {
                localStorage.setItem('jwt_token', token);
            }
            return response.data.data;
        }
        throw new Error(response.data?.message || '로그인 실패');
    },

    /**
     * 세션 및 현재 로그인 관리자 정보 조회
     */
    async getCurrentUser() {
        if (isSupabaseMode) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                return null;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            const role = profile?.role;
            const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'ROLE_ADMIN' || role === 'ROLE_MANAGER' || role === 'ROLE_TEACHER';

            if (!isAdmin) {
                await supabase.auth.signOut();
                localStorage.removeItem('jwt_token');
                return null;
            }

            return {
                id: session.user.id,
                studentId: profile?.student_id || '',
                name: profile?.name || '관리자',
                role: profile?.role || 'ROLE_ADMIN',
                token: session.access_token
            };
        }

        const token = localStorage.getItem('jwt_token');
        if (!token) return null;

        const response = await api.get('/members/me');
        if (response.data && response.data.success) {
            return response.data.data;
        }
        return null;
    },

    /**
     * 로그아웃
     */
    async logout() {
        if (isSupabaseMode) {
            await supabase.auth.signOut();
            localStorage.removeItem('jwt_token');
            return;
        }

        try {
            await api.post('/members/logout');
        } catch (e) {
            console.warn('Logout request warning:', e);
        } finally {
            localStorage.removeItem('jwt_token');
        }
    }
};

export default adminAuthService;
