import { useBotDashboardStore } from './useBotDashboardStore';

const useWidgetOptions = (widgetId: string, defaultOptions?: Record<string, unknown>) => {
  const storedOptions = useBotDashboardStore((s) => s.widgetOptions[widgetId]);
  const storeSetWidgetOption = useBotDashboardStore((s) => s.setWidgetOption);

  const widgetOptions = storedOptions ?? { ...defaultOptions };

  const setOption = (key: string, value: unknown) => {
    storeSetWidgetOption(widgetId, key, value);
  };

  return { widgetOptions, setOption };
};

export default useWidgetOptions;
