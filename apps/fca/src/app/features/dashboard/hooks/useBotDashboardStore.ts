import type { ResponsiveLayouts } from 'react-grid-layout';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: '1-1', x: 0, y: 0, w: 20, h: 5 },
    { i: '1-2', x: 20, y: 0, w: 20, h: 5 },
    { i: '1-3', x: 40, y: 0, w: 20, h: 5 },
    { i: '2-1', x: 0, y: 5, w: 15, h: 5 },
    { i: '2-2', x: 15, y: 5, w: 15, h: 5 },
    { i: '2-3', x: 30, y: 5, w: 15, h: 5 },
    { i: '2-4', x: 45, y: 5, w: 15, h: 5 },
    { i: '3-1', x: 0, y: 10, w: 12, h: 5 },
    { i: '3-2', x: 12, y: 10, w: 12, h: 5 },
    { i: '3-3', x: 24, y: 10, w: 12, h: 5 },
    { i: '3-4', x: 36, y: 10, w: 12, h: 5 },
    { i: '3-5', x: 48, y: 10, w: 12, h: 5 },
    { i: '4-1', x: 0, y: 15, w: 30, h: 5 },
    { i: '4-2', x: 30, y: 15, w: 30, h: 5 },
  ],
};

interface BotDashboardStore {
  layouts: ResponsiveLayouts;
  setLayouts: (layouts: ResponsiveLayouts) => void;
}

export const useBotDashboardStore = create<BotDashboardStore>()(
  persist(
    (set) => ({
      layouts: DEFAULT_LAYOUTS,
      setLayouts: (layouts) => set({ layouts }),
    }),
    {
      name: 'bot-dashboard-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
