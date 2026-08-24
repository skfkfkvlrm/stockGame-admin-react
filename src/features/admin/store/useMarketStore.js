import { create } from 'zustand';
import api from '../../../api/axios';

const useMarketStore = create((set) => ({
    marketOpen: true,
    mode: 'AUTO',
    openTime: '09:00',
    closeTime: '15:30',
    statusCode: 'OPEN',
    isLoading: false,

    fetchMarketStatus: async () => {
        try {
            set({ isLoading: true });
            const res = await api.get('/admin/market/status');
            const data = res.data?.data;
            if (data) {
                set({
                    marketOpen: data.marketOpen ?? true,
                    mode: data.mode || 'AUTO',
                    openTime: data.openTime || '09:00',
                    closeTime: data.closeTime || '15:30',
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
            const res = await api.post('/admin/market/toggle');
            const data = res.data?.data;
            if (data) {
                set({
                    marketOpen: data.marketOpen,
                    mode: data.mode,
                    openTime: data.openTime,
                    closeTime: data.closeTime,
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
            const res = await api.put('/admin/market/settings', newSettings);
            const data = res.data?.data;
            if (data) {
                set({
                    marketOpen: data.marketOpen,
                    mode: data.mode,
                    openTime: data.openTime,
                    closeTime: data.closeTime,
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
    }
}));

export default useMarketStore;

