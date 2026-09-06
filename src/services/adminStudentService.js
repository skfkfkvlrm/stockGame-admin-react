import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const adminStudentService = {
    /**
     * 학생 전체 목록 및 자산/랭킹 조회
     */
    async getStudents() {
        if (isSupabaseMode) {
            const [profilesRes, holdingsRes, stocksRes] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'ROLE_STUDENT')
                    .order('total_point', { ascending: false }),
                supabase
                    .from('user_holdings')
                    .select('user_id, stock_id, amount, locked_amount, average_price')
                    .or('amount.gt.0,locked_amount.gt.0'),
                supabase
                    .from('stocks')
                    .select('id, current_price')
            ]);

            const profiles = profilesRes.data || [];
            const holdings = holdingsRes.data || [];
            const stocks = stocksRes.data || [];

            const stockPriceMap = new Map();
            stocks.forEach((s) => stockPriceMap.set(s.id, s.current_price || 0));

            // 사용자별 주식 평가액 계산
            const userStockEvalMap = new Map();
            holdings.forEach((h) => {
                const price = stockPriceMap.get(h.stock_id) || 0;
                const totalQty = (h.amount || 0) + (h.locked_amount || 0);
                const evalValue = totalQty * price;
                userStockEvalMap.set(h.user_id, (userStockEvalMap.get(h.user_id) || 0) + evalValue);
            });

            return profiles.map((p, index) => {
                const stockVal = userStockEvalMap.get(p.id) || 0;
                const cash = p.total_point || 0;
                const totalAsset = cash + stockVal;
                const totalProfit = totalAsset - 100000; // 기초자산 100,000 기준
                const profitRate = ((totalProfit / 100000) * 100).toFixed(2);

                return {
                    id: p.id,
                    userId: p.id,
                    studentId: p.student_id,
                    name: p.name,
                    grade: p.grade,
                    className: p.class_name,
                    classNumber: p.class_number,
                    rank: index + 1,
                    totalPoint: cash,
                    stockEvaluation: stockVal,
                    totalAsset: totalAsset,
                    totalProfit: totalProfit,
                    profitRate: profitRate,
                    role: p.role,
                    status: p.status
                };
            });
        }

        const res = await api.get('/admin/students');
        return res.data?.data || [];
    },

    /**
     * 신규 학생 계정 생성 (기초 포인트 100,000P 지급)
     */
    async createStudent({ studentId, password, name, grade, className, classNumber }) {
        if (isSupabaseMode) {
            const cleanId = studentId.trim();
            const email = `${cleanId}@stockgame.local`;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        student_id: cleanId,
                        studentId: cleanId,
                        name: name.trim(),
                        grade: Number(grade) || 1,
                        class_name: `${className}반`,
                        className: `${className}반`,
                        class_number: Number(classNumber) || 1,
                        classNumber: Number(classNumber) || 1,
                        role: 'ROLE_STUDENT'
                    }
                }
            });

            if (error) throw new Error(error.message || '학생 계정 생성 실패');
            return { success: true, data };
        }

        const res = await api.post('/members/join', {
            studentId,
            password,
            name,
            grade: Number(grade),
            className: String(className),
            classNumber: Number(classNumber)
        });
        return res.data;
    },

    /**
     * 학생 계정 삭제 및 자산/주문 완전 정리
     */
    async deleteStudent(userId, studentIdStr) {
        if (isSupabaseMode) {
            // userId가 UUID가 아닌 경우 profiles에서 조회
            let targetUserId = userId;
            if (!userId || typeof userId !== 'string' || userId.length < 30) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('student_id', studentIdStr || userId)
                    .single();
                if (data?.id) targetUserId = data.id;
            }

            const { data, error } = await supabase.rpc('admin_delete_student', {
                p_user_id: targetUserId
            });

            if (error) throw new Error(error.message || '학생 삭제 실패');
            return { success: true, data };
        }

        const res = await api.delete(`/admin/students/${studentIdStr || userId}`);
        return res.data;
    },

    /**
     * 학생 포인트 강제 조정 (지급 / 차감)
     */
    async adjustPoint(userId, amount, reason = '', studentIdStr = '') {
        if (isSupabaseMode) {
            let targetUserId = userId;
            if (!userId || typeof userId !== 'string' || userId.length < 30) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('student_id', studentIdStr || userId)
                    .single();
                if (data?.id) targetUserId = data.id;
            }

            const { data, error } = await supabase.rpc('admin_adjust_student_point', {
                p_user_id: targetUserId,
                p_amount: Number(amount),
                p_reason: reason || '관리자 포인트 강제 조정'
            });

            if (error) throw new Error(error.message || '포인트 조정 실패');
            return { success: true, data };
        }

        const isAdd = Number(amount) >= 0;
        const res = await api.post(`/admin/students/${studentIdStr || userId}/point`, {
            type: isAdd ? 'add' : 'subtract',
            amount: Math.abs(Number(amount)),
            reason: reason || ''
        });
        return res.data;
    },

    /**
     * 학생 포인트 변동 이력 조회
     */
    async getStudentPoints(userId, studentIdStr = '') {
        if (isSupabaseMode) {
            let targetUserId = userId;
            if (!userId || typeof userId !== 'string' || userId.length < 30) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('student_id', studentIdStr || userId)
                    .single();
                if (data?.id) targetUserId = data.id;
            }

            const { data, error } = await supabase
                .from('point_transactions')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) return [];

            return (data || []).map((pt) => ({
                id: pt.id,
                point: pt.amount,
                currentPoint: pt.balance_after,
                description: pt.description,
                reasonType: pt.reason_type,
                createdDate: pt.created_at,
                date: pt.created_at
            }));
        }

        const res = await api.get(`/admin/students/${studentIdStr || userId}/points`).catch(() => ({ data: { data: [] } }));
        return Array.isArray(res.data?.data) ? res.data.data : [];
    },

    /**
     * 학생 보유 쿠폰 목록 조회
     */
    async getStudentCoupons(userId, studentIdStr = '') {
        if (isSupabaseMode) {
            let targetUserId = userId;
            if (!userId || typeof userId !== 'string' || userId.length < 30) {
                const { data } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('student_id', studentIdStr || userId)
                    .single();
                if (data?.id) targetUserId = data.id;
            }

            const { data, error } = await supabase
                .from('user_coupons')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false });

            if (error) return [];

            return (data || []).map((c) => ({
                id: c.id,
                couponId: c.coupon_id,
                name: c.name,
                couponName: c.name,
                purchasePrice: c.purchase_price,
                status: c.status,
                createdDate: c.created_at,
                usedDate: c.used_at
            }));
        }

        const res = await api.get(`/admin/students/${studentIdStr || userId}/coupons`).catch(() => ({ data: { data: [] } }));
        return Array.isArray(res.data?.data) ? res.data.data : [];
    },

    /**
     * 학생 상세 종합 정보 (프로필 + 보유주식 + 자산 + 포트폴리오)
     */
    async getStudentDetail(userIdOrStudentId) {
        if (isSupabaseMode) {
            let query = supabase.from('profiles').select('*');
            if (typeof userIdOrStudentId === 'string' && userIdOrStudentId.length >= 30) {
                query = query.eq('id', userIdOrStudentId);
            } else {
                query = query.eq('student_id', userIdOrStudentId);
            }
            const { data: profile } = await query.single();
            if (!profile) return null;

            const [holdingsRes, stocksRes] = await Promise.all([
                supabase
                    .from('user_holdings')
                    .select('stock_id, amount, locked_amount, average_price')
                    .eq('user_id', profile.id)
                    .or('amount.gt.0,locked_amount.gt.0'),
                supabase
                    .from('stocks')
                    .select('id, name, current_price')
            ]);

            const stockMap = new Map();
            (stocksRes.data || []).forEach((s) => stockMap.set(s.id, s));

            let totalStockVal = 0;
            const myStocks = (holdingsRes.data || []).map((h) => {
                const stock = stockMap.get(h.stock_id) || { name: `종목 #${h.stock_id}`, current_price: 0 };
                const totalQty = (h.amount || 0) + (h.locked_amount || 0);
                const currentVal = totalQty * (stock.current_price || 0);
                const buyVal = totalQty * (h.average_price || 0);
                const profit = currentVal - buyVal;
                const profitRate = buyVal > 0 ? ((profit / buyVal) * 100).toFixed(2) : 0;
                totalStockVal += currentVal;

                return {
                    stockId: h.stock_id,
                    stockName: stock.name,
                    amount: totalQty,
                    availableAmount: h.amount,
                    lockedAmount: h.locked_amount,
                    totalAmount: totalQty,
                    averageBuyPrice: h.average_price,
                    averagePrice: h.average_price,
                    purchasePrice: buyVal,
                    currentPrice: stock.current_price,
                    evaluationAmount: currentVal,
                    profit: profit,
                    profitRate: profitRate
                };
            });

            const cash = profile.total_point || 0;
            const totalAsset = cash + totalStockVal;
            const totalProfit = totalAsset - 100000;

            return {
                id: profile.id,
                userId: profile.id,
                studentId: profile.student_id,
                name: profile.name,
                grade: profile.grade,
                className: profile.class_name,
                classNumber: profile.class_number,
                totalPoint: cash,
                stockEvaluation: totalStockVal,
                totalAsset: totalAsset,
                totalProfit: totalProfit,
                myStocks: myStocks
            };
        }

        const res = await api.get(`/asset/admin/students/${userIdOrStudentId}/detail`).catch(() => ({ data: { data: null } }));
        return res.data?.data || null;
    }
};

export default adminStudentService;
