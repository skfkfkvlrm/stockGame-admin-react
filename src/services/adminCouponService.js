import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const adminCouponService = {
    /**
     * 전체 쿠폰 상품 목록 조회
     */
    async getCoupons() {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;

            return (data || []).map((c) => ({
                id: c.id,
                couponId: c.id,
                couponCode: c.coupon_code,
                name: c.name,
                price: c.price,
                status: c.status,
                createdAt: c.created_at
            }));
        }

        const res = await api.get('/admin/coupons');
        return res.data?.data || [];
    },

    /**
     * 신규 보상 쿠폰 상품 등록
     */
    async createCoupon({ name, price, status = 'ON_SALE' }) {
        if (isSupabaseMode) {
            const code = `CPN-${Date.now().toString().slice(-6)}`;
            const { data, error } = await supabase
                .from('coupons')
                .insert({
                    coupon_code: code,
                    name: name.trim(),
                    price: Number(price),
                    status: status || 'ON_SALE'
                })
                .select()
                .single();

            if (error) throw new Error(error.message || '쿠폰 등록 실패');
            return { success: true, data };
        }

        const res = await api.post('/admin/coupons', {
            name,
            price: Number(price),
            status
        });
        return res.data;
    },

    /**
     * 쿠폰 상품 정보 수정 (이름, 가격, 상태)
     */
    async updateCoupon(couponId, { name, price, status }) {
        if (isSupabaseMode) {
            const updates = {};
            if (name) updates.name = name.trim();
            if (price !== undefined) updates.price = Number(price);
            if (status) updates.status = status;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('coupons')
                .update(updates)
                .eq('id', Number(couponId))
                .select()
                .single();

            if (error) throw new Error(error.message || '쿠폰 수정 실패');
            return { success: true, data };
        }

        const res = await api.put(`/admin/coupons/${couponId}`, {
            name,
            price: Number(price),
            status
        });
        return res.data;
    },

    /**
     * 쿠폰 상품 삭제
     */
    async deleteCoupon(couponId) {
        if (isSupabaseMode) {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('id', Number(couponId));

            if (error) throw new Error(error.message || '쿠폰 삭제 실패');
            return { success: true };
        }

        const res = await api.delete(`/admin/coupons/${couponId}`);
        return res.data;
    }
};

export default adminCouponService;
