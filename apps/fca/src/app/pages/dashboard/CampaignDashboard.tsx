import { useEffect, useState } from 'react';
import { GridLayout, type Layout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import type { Option } from 'react-multi-select-component';
import { type BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import styles from './BotDashboard.module.scss';
import CampaignDashboardCardItem from '../../features/dashboard/components/CampaignDashboardCardItem';
import CampaignDashboardToolbar from '../../features/dashboard/components/CampaignDashboardToolbar';
import { campaignDashboardLayoutRenderMapper } from '../../features/dashboard/constants/CampaignDashboardLayoutRenderMapper';
import { GRID_COLS } from '../../features/dashboard/constants/dashboardConstants';
import { CAMPAIGN_DEFAULT_LAYOUT, useCampaignDashboardStore } from '../../features/dashboard/hooks/useCampaignDashboardStore';
import { useDashboardSocket } from '../../features/dashboard/hooks/useDashboardSocket';
import type { CampaignDashboardLayoutItem, CampaignDashboardWidgetType } from '../../features/dashboard/types';
import { syncCampaignLayoutWithFilter } from '../../features/dashboard/utils/campaignDashboardUtils';
import { generateWidgetId } from '../../features/dashboard/utils/dashboardUtils';
import { useGetCampaignOptionList } from '../../features/statistics/hooks/useStatisticsQueries';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '캠페인 현황', path: '/fca/dashboard/call-campaign' },
];

export default function CampaignDashboard() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: campaignList, isLoading: isCampaignLoading } = useGetCampaignOptionList();
  const campaignOptions: Option[] = (campaignList ?? []).map((c) => ({
    label: c.campaignName ? String(c.campaignName) : String(c.campaignId),
    value: String(c.campaignId),
  }));

  const [selectedCampaign, setSelectedCampaign] = useState<Option[]>([]);

  useEffect(() => {
    if (campaignOptions.length > 0) {
      setSelectedCampaign(campaignOptions);
    }
  }, [campaignOptions]);

  useDashboardSocket();
  const globalOptions = {
    campaignIds: selectedCampaign.map((item) => item.value as string),
  };

  const modal = useModal();
  const { layout: storedLayout, setLayout, setWidgetOptions } = useCampaignDashboardStore();
  const { width, containerRef, mounted } = useContainerWidth();

  const [isEditMode, setIsEditMode] = useState(false);
  const layoutFilterOptions = CAMPAIGN_DEFAULT_LAYOUT.filter((item) => item.widgetType in campaignDashboardLayoutRenderMapper).map((item) => {
    const entry = campaignDashboardLayoutRenderMapper[item.widgetType];
    return {
      label: entry?.filterLabel ?? entry?.title ?? item.widgetType,
      value: item.widgetType,
    };
  });
  const storedLayoutTypes = new Set(storedLayout.map((item) => item.widgetType));
  const [selectedLayoutFilterItems, setSelectedLayoutFilterItems] = useState<Option[]>(() => layoutFilterOptions.filter((opt) => storedLayoutTypes.has(opt.value)));
  const [draftLayout, setDraftLayout] = useState<CampaignDashboardLayoutItem[]>(() => [...storedLayout]);

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setDraftLayout([...storedLayout]);
    setSelectedLayoutFilterItems(layoutFilterOptions.filter((opt) => storedLayoutTypes.has(opt.value)));
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    setLayout(draftLayout);
    const activeIds = new Set(draftLayout.map((item) => item.i));
    const currentOptions = useCampaignDashboardStore.getState().widgetOptions;
    const cleanedOptions: Record<string, Record<string, unknown>> = {};
    for (const id of activeIds) {
      if (currentOptions[id]) cleanedOptions[id] = currentOptions[id];
    }
    setWidgetOptions(cleanedOptions);
    setIsEditMode(false);
  };

  const handleResetLayouts = () => {
    modal.confirm.execute({
      options: {
        title: '레이아웃 초기화 안내',
        width: 600,
        content: (
          <>
            <span>레이아웃을 초기화하면, 각 위젯에 설정한 옵션도 함께 초기화됩니다.</span>
            <br />
            <span>저장 시 초기화가 반영됩니다. 진행하시겠습니까?</span>
          </>
        ),
        okText: '초기화',
        okType: 'danger',
      },
      onOk: () => {
        setDraftLayout(CAMPAIGN_DEFAULT_LAYOUT.map((item) => ({ ...item, i: generateWidgetId() })));
        setSelectedLayoutFilterItems(layoutFilterOptions);
      },
    });
  };

  const handleLayoutChange = (newLayout: Layout) => {
    setDraftLayout((prev) => {
      const widgetTypeMap = new Map(prev.map((item) => [item.i, item.widgetType]));
      return newLayout.map((item) => ({
        ...item,
        widgetType: widgetTypeMap.get(item.i) ?? (item.i as CampaignDashboardWidgetType),
      }));
    });
  };

  const handleLayoutFilterChange = (newFilterItems: Option[]) => {
    setSelectedLayoutFilterItems(newFilterItems);
    setDraftLayout((prev) => syncCampaignLayoutWithFilter(prev, newFilterItems, CAMPAIGN_DEFAULT_LAYOUT, GRID_COLS));
  };

  const displayLayout = isEditMode ? draftLayout : storedLayout;

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <CampaignDashboardToolbar
        isEditMode={isEditMode}
        layoutFilterOptions={layoutFilterOptions}
        selectedLayoutFilterItems={selectedLayoutFilterItems}
        campaignOptions={campaignOptions}
        selectedCampaign={selectedCampaign}
        isCampaignLoading={isCampaignLoading}
        onLayoutFilterChange={handleLayoutFilterChange}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onResetLayouts={handleResetLayouts}
        onCampaignChange={setSelectedCampaign}
      />
      <div
        ref={containerRef}
        className={cn(
          `${styles['grid-container']} min-h-0 flex-1 overflow-hidden overflow-y-auto rounded-lg pr-2 transition-colors`,
          isEditMode && 'bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] bg-[length:16px_16px]',
        )}
      >
        {mounted && (
          <GridLayout
            layout={displayLayout}
            width={width}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: 60,
              containerPadding: [0, 5],
            }}
            dragConfig={{ enabled: isEditMode, bounded: true }}
            resizeConfig={{ enabled: isEditMode, handles: ['sw', 'nw', 'se', 'ne'] }}
            onLayoutChange={handleLayoutChange}
          >
            {displayLayout.map((item) => {
              const mapEntry = campaignDashboardLayoutRenderMapper[item.widgetType];
              if (!mapEntry) return null;
              return (
                <div key={item.i} className="h-full w-full">
                  <CampaignDashboardCardItem widgetType={item.widgetType} mapEntry={mapEntry} globalOptions={globalOptions} />
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
