import type { LayoutItem } from 'react-grid-layout';
import type { Option } from 'react-multi-select-component';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { campaignDashboardLayoutRenderMapper } from '../constants/CampaignDashboardLayoutRenderMapper';
import type { CampaignDashboardLayoutItem, CampaignDashboardWidgetType } from '../types';
import { generateWidgetId } from '../utils/dashboardUtils';

export const CAMPAIGN_DEFAULT_LAYOUT: CampaignDashboardLayoutItem[] = [
  { i: generateWidgetId(), widgetType: 'campaignProgressRate', x: 0, y: 0, w: 6, h: 6 },
  { i: generateWidgetId(), widgetType: 'campaignCompleteCallRate', x: 6, y: 0, w: 3, h: 3 },
  { i: generateWidgetId(), widgetType: 'campaignOutboundProgressRealtime', x: 9, y: 0, w: 3, h: 3 },
  { i: generateWidgetId(), widgetType: 'campaignOutboundAttemptPerMinute', x: 6, y: 3, w: 3, h: 3 },
  { i: generateWidgetId(), widgetType: 'campaignVerificationFailRate', x: 9, y: 3, w: 3, h: 3 },
  { i: generateWidgetId(), widgetType: 'campaignOutboundAttempt', x: 0, y: 6, w: 12, h: 6 },
];

type WidgetOptionsMap = Record<string, Record<string, unknown>>;

interface CampaignDashboardStore {
  layout: CampaignDashboardLayoutItem[];
  widgetOptions: WidgetOptionsMap;
  selectedCampaign: Option[];
  selectedScenario: Option[];
  hasHydrated: boolean;
  hasSelectionInitialized: boolean;
  hasLayoutFilterInitialized: boolean;
  setLayout: (layout: CampaignDashboardLayoutItem[]) => void;
  setWidgetOption: (widgetId: string, key: string, value: unknown) => void;
  setWidgetOptions: (widgetOptions: WidgetOptionsMap) => void;
  setSelectedCampaign: (selectedCampaign: Option[]) => void;
  setSelectedScenario: (selectedScenario: Option[]) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setHasLayoutFilterInitialized: (hasLayoutFilterInitialized: boolean) => void;
}

const validCampaignTypes = new Set(Object.keys(campaignDashboardLayoutRenderMapper));

export const useCampaignDashboardStore = create<CampaignDashboardStore>()(
  devtools(
    persist(
      (set) => ({
        layout: CAMPAIGN_DEFAULT_LAYOUT,
        widgetOptions: {},
        selectedCampaign: [],
        selectedScenario: [],
        hasHydrated: false,
        hasSelectionInitialized: false,
        hasLayoutFilterInitialized: false,
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
        setSelectedCampaign: (selectedCampaign) => set({ selectedCampaign, hasSelectionInitialized: true }, false, 'setSelectedCampaign'),
        setSelectedScenario: (selectedScenario) => set({ selectedScenario, hasSelectionInitialized: true }, false, 'setSelectedScenario'),
        setHasHydrated: (hasHydrated) => set({ hasHydrated }, false, 'setHasHydrated'),
        setHasLayoutFilterInitialized: (hasLayoutFilterInitialized) => set({ hasLayoutFilterInitialized }, false, 'setHasLayoutFilterInitialized'),
      }),
      {
        name: 'dashboard-campaign-storage',
        storage: createJSONStorage(() => localStorage),
        version: 6,
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
            return {
              ...state,
              layout: sanitizeLayout(state.layout),
              widgetOptions: {},
              selectedCampaign: [],
              selectedScenario: [],
              hasSelectionInitialized: false,
              hasLayoutFilterInitialized: false,
            };
          }
          if (fromVersion < 3) {
            return { ...state, selectedCampaign: [], selectedScenario: [], hasSelectionInitialized: false, hasLayoutFilterInitialized: false };
          }
          if (fromVersion < 4) {
            const selectedCampaign = state.selectedCampaign ?? [];
            const selectedScenario = state.selectedScenario ?? [];
            return {
              ...state,
              hasSelectionInitialized: selectedCampaign.length > 0 || selectedScenario.length > 0,
              hasLayoutFilterInitialized: false,
            };
          }
          if (fromVersion < 5) {
            return {
              ...state,
              hasLayoutFilterInitialized: false,
            };
          }
          if (fromVersion < 6) {
            return {
              ...state,
              hasLayoutFilterInitialized: false,
            };
          }
          return state;
        },
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      },
    ),
    { name: 'CampaignDashboardStore' },
  ),
);
