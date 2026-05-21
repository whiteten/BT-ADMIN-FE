import type { LayoutItem } from 'react-grid-layout';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { campaignDashboardLayoutRenderMapper } from '../constants/CampaignDashboardLayoutRenderMapper';
import type { CampaignDashboardLayoutItem, CampaignDashboardWidgetType } from '../types';
import { generateWidgetId } from '../utils/dashboardUtils';

export const CAMPAIGN_DEFAULT_LAYOUT: CampaignDashboardLayoutItem[] = [
  { i: generateWidgetId(), widgetType: 'campaignProgressRate', x: 0, y: 0, w: 6, h: 6 },
  { i: generateWidgetId(), widgetType: 'campaignOutboundAttempt', x: 6, y: 0, w: 6, h: 6 },
];

type WidgetOptionsMap = Record<string, Record<string, unknown>>;

interface CampaignDashboardStore {
  layout: CampaignDashboardLayoutItem[];
  widgetOptions: WidgetOptionsMap;
  setLayout: (layout: CampaignDashboardLayoutItem[]) => void;
  setWidgetOption: (widgetId: string, key: string, value: unknown) => void;
  setWidgetOptions: (widgetOptions: WidgetOptionsMap) => void;
}

const validCampaignTypes = new Set(Object.keys(campaignDashboardLayoutRenderMapper));

export const useCampaignDashboardStore = create<CampaignDashboardStore>()(
  devtools(
    persist(
      (set) => ({
        layout: CAMPAIGN_DEFAULT_LAYOUT,
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
        name: 'dashboard-campaign-storage',
        storage: createJSONStorage(() => localStorage),
        version: 2,
        migrate: (persisted, fromVersion) => {
          const sanitizeLayout = (layout: CampaignDashboardLayoutItem[]) => {
            const valid = layout.filter((item) => validCampaignTypes.has(item.widgetType));
            return valid.length > 0 ? valid.map((item) => ({ ...item, i: generateWidgetId() })) : CAMPAIGN_DEFAULT_LAYOUT;
          };

          if (fromVersion === 0) {
            const old = persisted as { layout: LayoutItem[] };
            const layout = old.layout
              .filter((item) => validCampaignTypes.has((item as CampaignDashboardLayoutItem).widgetType ?? item.i))
              .map((item) => ({
                ...item,
                widgetType: ((item as CampaignDashboardLayoutItem).widgetType ?? item.i) as CampaignDashboardWidgetType,
                i: generateWidgetId(),
              })) as CampaignDashboardLayoutItem[];
            return { layout: sanitizeLayout(layout), widgetOptions: {} };
          }

          const state = persisted as CampaignDashboardStore;
          if (fromVersion < 2) {
            return { ...state, layout: sanitizeLayout(state.layout), widgetOptions: {} };
          }
          return state;
        },
      },
    ),
    { name: 'CampaignDashboardStore' },
  ),
);
