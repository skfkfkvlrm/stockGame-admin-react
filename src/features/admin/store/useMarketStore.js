import { create } from 'zustand';
import adminMarketService from '../../../services/adminMarketService';

const useMarketStore = create((set, get) => ({
    marketOpen: true,
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    callAuctionStartTime: '15:20',
    statusCode: 'OPEN',
    isLoading: false,
    _unsubscribe: null,

    fetchMarketStatus: async () => {
        try {
            set({ isLoading: true });
            const data = await adminMarketService.getMarketStatus();
            if (data) {
                set({
                    marketOpen: data.marketOpen ?? true,
                    mode: data.mode || 'AUTO',
                    openTime: data.openTime || '09:00',
                    closeTime: data.closeTime || '15:30',
                    callAuctionStartTime: data.callAuctionStartTime || '15:20',
                    statusCode: data.statusCode || 'OPEN',
                    isLoading: false
                });
                return data;
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
                set({
                    marketOpen: data.marketOpen,
                    mode: data.mode,
                    openTime: data.openTime,
                    closeTime: data.closeTime,
                    callAuctionStartTime: data.callAuctionStartTime || '15:20',
                    statusCode: data.statusCode,
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
                set({
                    marketOpen: data.marketOpen,
                    mode: data.mode,
                    openTime: data.openTime,
                    closeTime: data.closeTime,
                    callAuctionStartTime: data.callAuctionStartTime || '15:20',
                    statusCode: data.statusCode,
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

        const unsub = adminMarketService.subscribeMarketStatus((updated) => {
            set({
                marketOpen: updated.marketOpen,
                mode: updated.mode,
                openTime: updated.openTime,
                closeTime: updated.closeTime,
                callAuctionStartTime: updated.callAuctionStartTime || '15:20',
                statusCode: updated.statusCode
            });
        });

        set({ _unsubscribe: unsub });
    }
}));

export default useMarketStore;
