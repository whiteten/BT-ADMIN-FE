import { Card } from 'antd';
import WidgetOptionsMenu from './WidgetOptionsMenu';
import type { LayoutRenderEntry } from '../constants/BotDashboardLayoutRenderMapper';
import useDashboardViewMode from '../hooks/useDashboardViewMode';
import useWidgetOptions from '../hooks/useWidgetOptions';

import { useWidgetSubscription } from '../hooks/useWidgetSubscription';
import { type BotDashboardResponse, DASHBOARD_VIEW, type DashboardWidgetType } from '../types';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

interface DashboardCardItemProps {
  widgetId: string;
  widgetType: DashboardWidgetType;
  mapEntry: LayoutRenderEntry;
  globalOptions: Record<string, unknown>;
}

const DashboardCardItem = ({ widgetId, widgetType, mapEntry, globalOptions }: DashboardCardItemProps) => {
  const { widgetOptions, setOption } = useWidgetOptions(widgetId, mapEntry.defaultOptions);

  // 글로벌 옵션과 위젯별 옵션을 병합하여 최종 구독 옵션 생성
  const options = { ...globalOptions, ...widgetOptions };

  const { data, error } = useWidgetSubscription({
    widgetType,
    options,
    enabled: (globalOptions.serviceIds as string[])?.length > 0,
  });

  const wrappedData = data !== undefined ? ({ [widgetType]: data } as unknown as BotDashboardResponse) : undefined;
  const isLoading = data === undefined && !error;

  const supportedModes = mapEntry.supportedModes ?? [DASHBOARD_VIEW.CHART];
  const hasMultipleModes = supportedModes.length >= 2;
  const { viewMode, viewModeToggleNode } = useDashboardViewMode(supportedModes);

  const extraNode = (
    <div className="flex items-center gap-1">
      {viewModeToggleNode}
      <WidgetOptionsMenu menuActions={mapEntry.menuActions} widgetOptions={widgetOptions} onOptionChange={setOption} globalOptions={globalOptions} />
    </div>
  );

  return (
    <Card
      title={mapEntry.title ?? widgetType}
      variant="borderless"
      className="h-full flex flex-col"
      classNames={{ title: 'text-base font-semibold text-[#495057]', header: '!min-h-0 !h-[45px] !px-4', body: 'flex-1 min-h-0 !p-0' }}
      extra={extraNode}
    >
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : hasMultipleModes ? (
        <div className="relative h-full">
          <div className="absolute inset-0" style={{ visibility: viewMode === DASHBOARD_VIEW.CHART ? 'visible' : 'hidden' }}>
            {mapEntry.renderChart?.(wrappedData)}
          </div>
          <div className="absolute inset-0" style={{ visibility: viewMode === DASHBOARD_VIEW.TABLE ? 'visible' : 'hidden' }}>
            {mapEntry.renderTable?.(wrappedData)}
          </div>
        </div>
      ) : (
        mapEntry.renderChart?.(wrappedData)
      )}
    </Card>
  );
};

export default DashboardCardItem;
