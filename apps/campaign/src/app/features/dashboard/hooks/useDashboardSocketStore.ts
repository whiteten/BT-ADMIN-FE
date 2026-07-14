import { isEqual } from 'lodash';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DashboardSocketStore {
  wsId: string | null;
  isConnected: boolean;
  widgetData: Record<string, unknown>;
  widgetErrors: Record<string, string>;
  send: ((data: Record<string, unknown>) => void) | null;

  setWsId: (wsId: string | null) => void;
  setIsConnected: (isConnected: boolean) => void;
  setSend: (send: ((data: Record<string, unknown>) => void) | null) => void;
  setWidgetData: (widgetId: string, data: unknown) => void;
  setWidgetError: (widgetId: string, message: string) => void;
  removeWidget: (widgetId: string) => void;
  reset: () => void;
}

export const useDashboardSocketStore = create<DashboardSocketStore>()(
  devtools(
    (set) => ({
      wsId: null,
      isConnected: false,
      widgetData: {},
      widgetErrors: {},
      send: null,

      setWsId: (wsId) => set({ wsId }, false, 'setWsId'),
      setIsConnected: (isConnected) => set({ isConnected }, false, 'setIsConnected'),
      setSend: (send) => set({ send }, false, 'setSend'),
      setWidgetData: (widgetId, data) =>
        set(
          (state) => {
            if (isEqual(state.widgetData[widgetId], data)) return state;
            return { widgetData: { ...state.widgetData, [widgetId]: data } };
          },
          false,
          'setWidgetData',
        ),
      setWidgetError: (widgetId, message) =>
        set(
          (state) => ({
            widgetErrors: { ...state.widgetErrors, [widgetId]: message },
          }),
          false,
          'setWidgetError',
        ),
      removeWidget: (widgetId) =>
        set(
          (state) => {
            const nextData = { ...state.widgetData };
            delete nextData[widgetId];
            const nextErrors = { ...state.widgetErrors };
            delete nextErrors[widgetId];
            return { widgetData: nextData, widgetErrors: nextErrors };
          },
          false,
          'removeWidget',
        ),
      reset: () =>
        set(
          {
            wsId: null,
            isConnected: false,
            widgetData: {},
            widgetErrors: {},
            send: null,
          },
          false,
          'reset',
        ),
    }),
    { name: 'DashboardSocketStore' },
  ),
);
