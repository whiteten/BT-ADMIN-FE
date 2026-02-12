import type { Layout, LayoutItem } from 'react-grid-layout';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'scenarioSummary', x: 0, y: 0, w: 4, h: 5 },
  { i: 'dialogSummary', x: 4, y: 0, w: 4, h: 5 },
  { i: 'slotSummary', x: 8, y: 0, w: 4, h: 5 },
  { i: 'dialogIncompleteTop', x: 0, y: 5, w: 3, h: 5 },
  { i: 'slotIncompleteTop', x: 3, y: 5, w: 3, h: 5 },
  { i: 'slotRetryAvgTop', x: 6, y: 5, w: 3, h: 5 },
  { i: 'slotRetryDistTop', x: 9, y: 5, w: 3, h: 5 },
  { i: 'keywordTop', x: 0, y: 10, w: 4, h: 5 },
  { i: 'entityTop', x: 8, y: 10, w: 4, h: 5 },
  { i: 'intentTop', x: 4, y: 10, w: 4, h: 5 },
  { i: 'intentCheckFailTop', x: 9, y: 15, w: 5, h: 5 },
  { i: 'intentConfidenceTop', x: 9, y: 20, w: 5, h: 5 },
  { i: 'hourlyEntry', x: 0, y: 15, w: 7, h: 5 },
  { i: 'hourlyBusyTime', x: 0, y: 20, w: 7, h: 5 },
];

interface BotDashboardStore {
  layout: Layout;
  setLayout: (layout: Layout) => void;
}

export const useBotDashboardStore = create<BotDashboardStore>()(
  persist(
    (set) => ({
      layout: DEFAULT_LAYOUT,
      setLayout: (layout) => set({ layout }),
    }),
    {
      name: 'dashboard-bot-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
