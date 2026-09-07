import { create } from 'zustand';
import adminMarketService from '../../../services/adminMarketService';

/**
 * 한국 표준시(KST, UTC+9) 기준 시장 운영 상태 동적 계산 함수
 */
export function calculateMarketStatus(settings) {
    if (!settings) {
        return { marketOpen: false, statusCode: 'CLOSED' };
    }

    const mode = settings.mode || 'AUTO';
    if (mode === 'MANUAL') {
        const isOpen = settings.marketOpen ?? settings.is_market_open ?? false;
        return {
            marketOpen: isOpen,
            statusCode: settings.statusCode || settings.status_code || (isOpen ? 'OPEN' : 'MANUAL_PAUSE')
        };
    }

    // AUTO 모드: 한국 표준시(KST, UTC+9) 기준 요일 및 운영 시간 실시간 판별
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 3600000));

    const day = kst.getDay(); // 0: 일요일, 6: 토요일
    if (day === 0 || day === 6) {
        return { marketOpen: false, statusCode: 'HOLIDAY' };
    }

    const currentHHMM = `${String(kst.getHours()).padStart(2, '0')}:${String(kst.getMinutes()).padStart(2, '0')}`;
    const open = settings.openTime || settings.open_time || '09:00';
    const close = settings.closeTime || settings.close_time || '15:30';
    const auctionStart = settings.callAuctionStartTime || settings.call_auction_start_time || '15:20';

    if (currentHHMM < open || currentHHMM >= close) {
        return { marketOpen: false, statusCode: 'CLOSED' };
    }
    if (currentHHMM >= auctionStart && currentHHMM < close) {
        return { marketOpen: true, statusCode: 'CALL_AUCTION' };
    }
    return { marketOpen: true, statusCode: 'OPEN' };
}

const initialComputed = calculateMarketStatus({
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    callAuctionStartTime: '15:20'
});

const useMarketStore = create((set, get) => ({
    marketOpen: initialComputed.marketOpen,
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    callAuctionStartTime: '15:20',
    statusCode: initialComputed.statusCode,
    isLoading: false,
    _unsubscribe: null,
    _timer: null,

    fetchMarketStatus: async () => {
        try {
            set({ isLoading: true });
            const data = await adminMarketService.getMarketStatus();
            if (data) {
                const computed = calculateMarketStatus(data);
                set({
                    marketOpen: computed.marketOpen,
                    mode: data.mode || 'AUTO',
                    openTime: data.openTime || '09:00',
                    closeTime: data.closeTime || '15:30',
                    callAuctionStartTime: data.callAuctionStartTime || '15:20',
                    statusCode: computed.statusCode,
                    isLoading: false
                });
                return { ...data, marketOpen: computed.marketOpen, statusCode: computed.statusCode };
            }
            set({ isLoading: false });
            return null;
        } catch (err) {
            console.error('Failed to fetch market status in store:', err);
            set({ isLoading: false });
            return null;
        }
    },

    toggleMarketStatus: async () => {
        try {
            set({ isLoading: true });
            const data = await adminMarketService.toggleMarketStatus();
            if (data) {
                const computed = calculateMarketStatus(data);
                set({
                    marketOpen: computed.marketOpen,
                    mode: data.mode,
                    openTime: data.openTime,
                    closeTime: data.closeTime,
                    callAuctionStartTime: data.callAuctionStartTime || '15:20',
                    statusCode: computed.statusCode,
                    isLoading: false
                });
                return data;
            }
            set({ isLoading: false });
        } catch (err) {
            console.error('Failed to toggle market status in store:', err);
            set({ isLoading: false });
            throw err;
        }
    },

    updateMarketSettings: async (newSettings) => {
        try {
            set({ isLoading: true });
            const data = await adminMarketService.updateMarketSettings(newSettings);
            if (data) {
                const computed = calculateMarketStatus(data);
                set({
                    marketOpen: computed.marketOpen,
                    mode: data.mode,
                    openTime: data.openTime,
                    closeTime: data.closeTime,
                    callAuctionStartTime: data.callAuctionStartTime || '15:20',
                    statusCode: computed.statusCode,
                    isLoading: false
                });
                return data;
            }
            set({ isLoading: false });
        } catch (err) {
            console.error('Failed to update market settings in store:', err);
            set({ isLoading: false });
            throw err;
        }
    },

    initRealtime: () => {
        const currentUnsub = get()._unsubscribe;
        if (currentUnsub) {
            currentUnsub();
        }
        const currentTimer = get()._timer;
        if (currentTimer) {
            clearInterval(currentTimer);
        }

        const unsub = adminMarketService.subscribeMarketStatus((updated) => {
            const computed = calculateMarketStatus(updated);
            set({
                marketOpen: computed.marketOpen,
                mode: updated.mode,
                openTime: updated.openTime,
                closeTime: updated.closeTime,
                callAuctionStartTime: updated.callAuctionStartTime || '15:20',
                statusCode: computed.statusCode
            });
        });

        // 30초 주기 AUTO 모드 시간 자동 갱신 (09:00, 15:20, 15:30 실시간 무인 전환)
        const timer = setInterval(() => {
            const state = get();
            if (state.mode === 'AUTO') {
                const computed = calculateMarketStatus(state);
                if (computed.marketOpen !== state.marketOpen || computed.statusCode !== state.statusCode) {
                    set({
                        marketOpen: computed.marketOpen,
                        statusCode: computed.statusCode
                    });
                }
            }
        }, 30000);

        set({ _unsubscribe: unsub, _timer: timer });
    }
}));

export default useMarketStore;
