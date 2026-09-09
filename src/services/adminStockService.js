import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const adminStockService = {
    /**
     * 전체 주식 종목 목록 조회 (상장 및 폐지 종목 전수)
     */
    async getStocks() {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('stocks')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;

            return (data || []).map((s) => ({
                id: s.id,
                stockId: s.id,
                name: s.name,
                stockName: s.name,
                content: s.content,
                nowPrice: s.current_price,
                currentPrice: s.current_price,
                price: s.current_price,
                pubPrice: s.publication_price,
                publicationPrice: s.publication_price,
                pubBalance: s.publication_balance,
                publicationBalance: s.publication_balance,
                prevPrice: s.prev_price,
                status: s.status,
                marketStatus: s.market_status
            }));
        }

        const res = await api.get('/stock');
        return res.data?.data || [];
    },

    /**
     * 단일 주식 종목 상세 정보 조회
     */
    async getStockDetail(stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('stocks')
                .select('*')
                .eq('id', Number(stockId))
                .single();

            if (error || !data) return null;

            return {
                id: data.id,
                stockId: data.id,
                name: data.name,
                stockName: data.name,
                content: data.content,
                nowPrice: data.current_price,
                currentPrice: data.current_price,
                price: data.current_price,
                pubPrice: data.publication_price,
                publicationPrice: data.publication_price,
                pubBalance: data.publication_balance,
                publicationBalance: data.publication_balance,
                prevPrice: data.prev_price,
                highLimitPrice: data.high_limit_price,
                lowLimitPrice: data.low_limit_price,
                status: data.status,
                marketStatus: data.market_status
            };
        }

        const res = await api.get(`/stock/${stockId}`);
        return res.data?.data || null;
    },

    /**
     * 신규 주식 종목 상장 등록
     */
    async createStock({ name, content, publicationPrice, publicationBalance }) {
        if (isSupabaseMode) {
            const price = Number(publicationPrice);
            const balance = Number(publicationBalance);
            const highLimit = Math.round(price * 1.3);
            const lowLimit = Math.round(price * 0.7);

            const { data, error } = await supabase
                .from('stocks')
                .insert({
                    name: name.trim(),
                    content: content ? content.trim() : '',
                    publication_price: price,
                    publication_balance: balance,
                    current_price: price,
                    prev_price: price,
                    high_limit_price: highLimit,
                    low_limit_price: lowLimit,
                    market_status: 'CONTINUOUS',
                    status: 'LISTED'
                })
                .select()
                .single();

            if (error) throw new Error(error.message || '종목 상장 실패');
            return { success: true, data };
        }

        const res = await api.post('/admin/stocks', {
            name,
            content,
            publicationPrice: Number(publicationPrice),
            publicationBalance: Number(publicationBalance)
        });
        return res.data;
    },

    /**
     * 주식 종목 정보 수정 (설명, 발행가, 발행잔량)
     */
    async updateStock(stockId, { name, content, publicationPrice, publicationBalance }) {
        if (isSupabaseMode) {
            const updates = {};
            if (name) updates.name = name.trim();
            if (content !== undefined) updates.content = content.trim();
            if (publicationPrice !== undefined) updates.publication_price = Number(publicationPrice);
            if (publicationBalance !== undefined) updates.publication_balance = Number(publicationBalance);

            const { data, error } = await supabase
                .from('stocks')
                .update(updates)
                .eq('id', Number(stockId))
                .select()
                .single();

            if (error) throw new Error(error.message || '종목 수정 실패');
            return { success: true, data };
        }

        const res = await api.put(`/admin/stocks/${stockId}`, {
            name,
            content,
            publicationPrice: Number(publicationPrice),
            publicationBalance: Number(publicationBalance)
        });
        return res.data;
    },

    /**
     * 주식 종목 영구 상장폐지 및 원자적 청산
     */
    async delistStock(stockId, compensationPrice = 0, reason = '') {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('admin_delist_stock', {
                p_stock_id: Number(stockId),
                p_compensation_price: Number(compensationPrice) || 0,
                p_reason: reason || '관리자 상장폐지'
            });

            if (error) throw new Error(error.message || '상장폐지 실행 실패');
            return { success: true, data };
        }

        const res = await api.delete(`/admin/stocks/${stockId}`, {
            params: {
                compensationPrice: Number(compensationPrice) || 0,
                reason: reason || ''
            }
        });
        return res.data;
    },

    /**
     * 특정 종목 체결 거래 내역 조회
     */
    async getStockTransactions(stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('order_trades')
                .select('*')
                .eq('stock_id', Number(stockId))
                .order('created_at', { ascending: false })
                .limit(50);

            if (error || !data) return [];

            // 구매자 및 판매자 프로필 정보 배치 조회
            const userIds = [...new Set(
                data.flatMap(tx => [tx.buyer_id, tx.seller_id]).filter(Boolean)
            )];

            const userMap = new Map();
            if (userIds.length > 0) {
                const { data: profiles, error: profileErr } = await supabase
                    .from('profiles')
                    .select('id, student_id, name, grade, class_name')
                    .in('id', userIds);

                if (!profileErr && profiles) {
                    profiles.forEach(p => userMap.set(p.id, p));
                }
            }

            return data.map((tx) => {
                const buyer = userMap.get(tx.buyer_id);
                const seller = tx.seller_id ? userMap.get(tx.seller_id) : null;
                const isLp = !tx.seller_id;

                const buyerName = buyer 
                    ? (buyer.name && buyer.student_id && buyer.name !== buyer.student_id ? `${buyer.name} (${buyer.student_id})` : (buyer.name || buyer.student_id)) 
                    : '학생';
                const buyerStudentId = buyer?.student_id || tx.buyer_id;

                const sellerName = isLp 
                    ? '초기발행(LP)' 
                    : (seller ? (seller.name && seller.student_id && seller.name !== seller.student_id ? `${seller.name} (${seller.student_id})` : (seller.name || seller.student_id)) : '학생');
                const sellerStudentId = isLp ? 'SYSTEM_LP' : (seller?.student_id || tx.seller_id);

                // sell_order_id가 null이거나 buy_order_id > sell_order_id인 경우 매수 주문이 체결 유발(Taker)
                const isBuyTaker = isLp || !tx.sell_order_id || (Number(tx.buy_order_id) > Number(tx.sell_order_id));
                const tradeType = isBuyTaker ? '매수' : '매도';
                const totalPrice = Number(tx.total_trade_amount) || ((Number(tx.amount) || 0) * (Number(tx.price) || 0));

                return {
                    id: tx.id,
                    transaction_id: tx.id,
                    transactionId: tx.id,
                    stock_id: tx.stock_id,
                    stockId: tx.stock_id,
                    created_at: tx.created_at,
                    created_date: tx.created_at,
                    createdDate: tx.created_at,
                    price: tx.price,
                    tradePrice: tx.price,
                    amount: tx.amount,
                    tradeAmount: tx.amount,
                    total_price: totalPrice,
                    totalPrice: totalPrice,
                    trade_type: tradeType,
                    tradeType: tradeType,
                    buyer_id: tx.buyer_id,
                    buyerId: tx.buyer_id,
                    buyer_name: buyerName,
                    buyerName: buyerName,
                    buyer_student_id: buyerStudentId,
                    buyerStudentId: buyerStudentId,
                    seller_id: tx.seller_id,
                    sellerId: tx.seller_id,
                    seller_name: sellerName,
                    sellerName: sellerName,
                    seller_student_id: sellerStudentId,
                    sellerStudentId: sellerStudentId
                };
            });
        }

        const res = await api.get(`/admin/stocks/${stockId}/transactions`).catch(() => ({ data: { data: [] } }));
        return Array.isArray(res.data?.data) ? res.data.data : [];
    },

    /**
     * 특정 종목 일별 시세 히스토리(OHLCV) 조회
     */
    async getStockHistory(stockId) {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('stock_price_history')
                .select('*')
                .eq('stock_id', Number(stockId))
                .order('base_date', { ascending: true });

            if (error) return [];

            return (data || []).map((h) => ({
                baseDate: h.base_date,
                openPrice: h.open_price,
                highPrice: h.high_price,
                lowPrice: h.low_price,
                closePrice: h.close_price,
                volume: h.volume
            }));
        }

        const res = await api.get(`/stock/${stockId}/history`).catch(() => ({ data: { data: [] } }));
        return Array.isArray(res.data?.data) ? res.data.data : [];
    }
};

export default adminStockService;
