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
            // 시장이 개장(OPEN)되었을 경우, 최신 코스피/코스닥 지수를 즉시 1회 백그라운드 동기화
            if (data?.marketOpen) {
                supabase.functions.invoke('sync-market-indices').catch(err => {
                    console.warn('Market indices sync trigger failed:', err);
                });
            }
            return data;
        }

        const res = await api.post('/admin/market/toggle');
        return res.data?.data;
    },

    /**
     * 코스피/코스닥 시장 지수 즉시 동기화 (Edge Function 트리거)
     */
    async syncMarketIndices() {
        if (isSupabaseMode) {
            const { data, error } = await supabase.functions.invoke('sync-market-indices');
            if (error) {
                throw new Error(error.message || '시장 지수 동기화 실패');
            }
            return data;
        }
        return { success: false, message: 'Spring Boot mode not supported' };
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
     * 장 마감 동시호가 단일가 일괄 체결 (RPC)
     */
    async executeClosingAuction(stockId = null) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('execute_call_auction', {
                p_stock_id: stockId
            });
            if (error) {
                throw new Error(error.message || '동시호가 단일가 체결 실패');
            }
            return data;
        }

        const res = await api.post('/stock/admin/market/execute-closing-auction');
        return res.data;
    },

    /**
     * 차기 수업용 교실 모의투자 세션 1-클릭 리셋
     */
    async resetClassroomSession(defaultPoint = 100000, resetStockPrice = true) {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('admin_reset_classroom_session', {
                p_default_point: defaultPoint,
                p_reset_stock_price: resetStockPrice
            });
            if (error) {
                throw new Error(error.message || '교실 모의투자 세션 초기화 실패');
            }
            return data;
        }

        const res = await api.post('/admin/market/reset-session', { defaultPoint, resetStockPrice });
        return res.data?.data;
    },

    /**
     * 데모 세션 거래 및 LP 주문/체결 선택적 롤백 (일반 학생 계정 보존)
     */
    async rollbackAdminDemoSession() {
        if (isSupabaseMode) {
            const { data, error } = await supabase.rpc('rollback_admin_demo_session');
            if (error) {
                throw new Error(error.message || '데모 세션 롤백 실패');
            }
            return data;
        }

        const res = await api.post('/admin/demo/rollback');
        return res.data?.data || res.data;
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
