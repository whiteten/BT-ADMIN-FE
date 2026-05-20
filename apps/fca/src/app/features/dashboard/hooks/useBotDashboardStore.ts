import type { LayoutItem } from 'react-grid-layout';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { botDashboardLayoutRenderMapper } from '../constants/BotDashboardLayoutRenderMapper';
import type { DashboardLayoutItem, DashboardWidgetType } from '../types';
import { generateWidgetId } from '../utils/dashboardUtils';

export const DEFAULT_LAYOUT: DashboardLayoutItem[] = [
  { i: generateWidgetId(), widgetType: 'serviceOccupancy', x: 0, y: 0, w: 6, h: 6 },
  { i: generateWidgetId(), widgetType: 'dialogOccupancy', x: 6, y: 0, w: 3, h: 6 },
  { i: generateWidgetId(), widgetType: 'slotOccupancy', x: 9, y: 0, w: 3, h: 6 },
  { i: generateWidgetId(), widgetType: 'scenarioSummary', x: 0, y: 6, w: 4, h: 5 },
  { i: generateWidgetId(), widgetType: 'dialogSummary', x: 4, y: 6, w: 4, h: 5 },
  { i: generateWidgetId(), widgetType: 'slotSummary', x: 8, y: 6, w: 4, h: 5 },
  { i: generateWidgetId(), widgetType: 'dialogIncompleteTop', x: 0, y: 11, w: 3, h: 5 },
  { i: generateWidgetId(), widgetType: 'slotIncompleteTop', x: 3, y: 11, w: 3, h: 5 },
  { i: generateWidgetId(), widgetType: 'slotRetryAvgTop', x: 6, y: 11, w: 3, h: 5 },
  { i: generateWidgetId(), widgetType: 'slotRetryDistTop', x: 9, y: 11, w: 3, h: 5 },
  { i: generateWidgetId(), widgetType: 'keywordTop', x: 0, y: 16, w: 4, h: 5 },
  { i: generateWidgetId(), widgetType: 'entityTop', x: 8, y: 16, w: 4, h: 5 },
  { i: generateWidgetId(), widgetType: 'intentTop', x: 4, y: 16, w: 4, h: 5 },
  { i: generateWidgetId(), widgetType: 'intentCheckFailTop', x: 0, y: 21, w: 7, h: 5 },
  { i: generateWidgetId(), widgetType: 'intentFailRateTop', x: 7, y: 21, w: 5, h: 5 },
  { i: generateWidgetId(), widgetType: 'hourlyEntry', x: 0, y: 26, w: 12, h: 5 },
];

type WidgetOptionsMap = Record<string, Record<string, unknown>>;

interface BotDashboardStore {
  layout: DashboardLayoutItem[];
  widgetOptions: WidgetOptionsMap;
  setLayout: (layout: DashboardLayoutItem[]) => void;
  setWidgetOption: (widgetId: string, key: string, value: unknown) => void;
  setWidgetOptions: (widgetOptions: WidgetOptionsMap) => void;
}

export const useBotDashboardStore = create<BotDashboardStore>()(
  devtools(
    persist(
      (set) => ({
        layout: DEFAULT_LAYOUT,
        widgetOptions: {},
        setLayout: (layout) => set({ layout }, false, 'setLayout'),
        setWidgetOption: (widgetId, key, value) =>
          set(
            (state) => ({
              widgetOptions: {
                ...state.widgetOptions,
                [widgetId]: { ...state.widgetOptions[widgetId], [key]: value },
              },
            }),
            false,
            'setWidgetOption',
          ),
        setWidgetOptions: (widgetOptions) => set({ widgetOptions }, false, 'setWidgetOptions'),
      }),
      {
        name: 'dashboard-bot-storage',
        storage: createJSONStorage(() => localStorage),
        version: 1,
        migrate: (persisted, version) => {
          if (version === 0) {
            const old = persisted as { layout: LayoutItem[] };
            const validTypes = new Set(Object.keys(botDashboardLayoutRenderMapper));
            return {
              layout: old.layout
                .filter((item) => validTypes.has(item.i))
                .map((item) => ({
                  ...item,
                  widgetType: item.i as DashboardWidgetType,
                  i: generateWidgetId(),
                })),
              widgetOptions: {},
            };
          }
          return persisted as BotDashboardStore;
        },
      },
    ),
    { name: 'BotDashboardStore' },
  ),
);
