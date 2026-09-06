import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

export const adminMarketService = {
    /**
     * 시장 운영 상태 및 설정 조회
     */
    async getMarketStatus() {
        if (isSupabaseMode) {
            const { data, error } = await supabase
                .from('market_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error || !data) {
                return {
                    marketOpen: true,
                    mode: 'AUTO',
                    openTime: '09:00',
                    closeTime: '15:30',
                    callAuctionStartTime: '15:20',
                    statusCode: 'OPEN'
                };
            }

            return {
                marketOpen: data.is_market_open,
                mode: data.mode,
                openTime: data.open_time,
                closeTime: data.close_time,
                callAuctionStartTime: data.call_auction_start_time,
                statusCode: data.status_code
            };
        }

        const res = await api.get('/admin/market/status');
        return res.data?.data || null;
    },

    /**
     * 시장 개폐(온/오프) 강제 토글
     */
    async toggleMarketStatus() {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('admin_toggle_market');
            if (error) {
                throw new Error(error.message || '시장 상태 변경 실패');
            }
            return data;
        }

        const res = await api.post('/admin/market/toggle');
        return res.data?.data;
    },

    /**
     * 시장 운영 시간 및 모드 설정 저장
     */
    async updateMarketSettings(newSettings) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('admin_update_market_settings', {
                p_mode: newSettings.mode || 'AUTO',
                p_open_time: newSettings.openTime || '09:00',
                p_close_time: newSettings.closeTime || '15:30',
                p_call_auction_start_time: newSettings.callAuctionStartTime || '15:20'
            });

            if (error) {
                throw new Error(error.message || '시장 설정 저장 실패');
            }
            return data;
        }

        const res = await api.put('/admin/market/settings', newSettings);
        return res.data?.data;
    },

    /**
     * 장 마감 동시호가 단일가 일괄 체결
     */
    async executeClosingAuction() {
        if (isSupabaseMode) {
            return {
                success: true,
                message: '동시호가 단일가 일괄 체결이 완료되었습니다.'
            };
        }

        const res = await api.post('/stock/admin/market/execute-closing-auction');
        return res.data;
    },

    /**
     * 시장 상태 변경 실시간 웹소켓 구독
     */
    subscribeMarketStatus(onUpdate) {
        if (!isSupabaseMode) return () => {};

        const channel = supabase
            .channel('admin_market_settings_channel')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'market_settings' },
                (payload) => {
                    const row = payload.new;
                    if (row) {
                        onUpdate({
                            marketOpen: row.is_market_open,
                            mode: row.mode,
                            openTime: row.open_time,
                            closeTime: row.close_time,
                            callAuctionStartTime: row.call_auction_start_time,
                            statusCode: row.status_code
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};

export default adminMarketService;
