import { Card } from 'antd';
import { CAMPAIGN_DASHBOARD_MOCK_RESPONSE, CAMPAIGN_DASHBOARD_USE_MOCK, type CampaignLayoutRenderEntry } from '../constants/CampaignDashboardLayoutRenderMapper';
import { useWidgetSubscription } from '../hooks/useWidgetSubscription';
import { type CampaignDashboardResponse, type CampaignDashboardWidgetType } from '../types';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

interface CampaignDashboardCardItemProps {
  widgetType: CampaignDashboardWidgetType;
  mapEntry: CampaignLayoutRenderEntry;
  globalOptions: Record<string, unknown>;
}

const CampaignDashboardCardItem = ({ widgetType, mapEntry, globalOptions }: CampaignDashboardCardItemProps) => {
  const useMock = CAMPAIGN_DASHBOARD_USE_MOCK;

  const { data, error } = useWidgetSubscription({
    widgetType,
    options: globalOptions,
    enabled: !useMock && (((globalOptions.campaignIds as string[])?.length ?? 0) > 0 || ((globalOptions.campaignListIds as number[])?.length ?? 0) > 0),
  });

  const liveData = data !== undefined ? ({ [widgetType]: data } as unknown as CampaignDashboardResponse) : undefined;
  const displayData = liveData ?? (useMock ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE : undefined);
  const isLoading = !useMock && displayData === undefined && !error;

  return (
    <Card
      title={mapEntry.title}
      variant="borderless"
      className="flex h-full flex-col"
      classNames={{ title: 'text-base font-semibold text-[#495057]', header: '!min-h-0 !h-[45px] !px-4', body: 'flex-1 min-h-0 !p-0' }}
    >
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : (
        mapEntry.renderContent?.(displayData)
      )}
    </Card>
  );
};

export default CampaignDashboardCardItem;
