import { useEffect, useState } from 'react';
import { GridLayout, type Layout, type LayoutItem, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import type { Option } from 'react-multi-select-component';
import { keepPreviousData } from '@tanstack/react-query';
import { type BreadcrumbProps, Card } from 'antd';
import styles from './BotDashboard.module.scss';
import { useGetBots } from '../../features/bot-config/hooks/useBotQueries';
import BotDashboardToolbar from '../../features/dashboard/components/BotDashboardToolbar';
import DialogIncompleteTopBarChart from '../../features/dashboard/components/DialogIncompleteTopBarChart';
import DialogSummaryPieChart from '../../features/dashboard/components/DialogSummaryPieChart';
import EntityTopBarChart from '../../features/dashboard/components/EntityTopBarChart';
import HourlyBusyTimeLineChart from '../../features/dashboard/components/HourlyBusyTimeLineChart';
import HourlyEntryLineChart from '../../features/dashboard/components/HourlyEntryLineChart';
import IntentCheckFailTopBarChart from '../../features/dashboard/components/IntentCheckFailTopBarChart';
import IntentConfidenceTopBarChart from '../../features/dashboard/components/IntentConfidenceTopBarChart';
import IntentTopBarChart from '../../features/dashboard/components/IntentTopBarChart';
import KeywordWordCloud from '../../features/dashboard/components/KeywordWordCloud';
import OccupancyBarChart from '../../features/dashboard/components/OccupancyBarChart';
import ScenarioSummaryPieChart from '../../features/dashboard/components/ScenarioSummaryPieChart';
import SlotIncompleteTopBarChart from '../../features/dashboard/components/SlotIncompleteTopBarChart';
import SlotRetryAvgTopBarChart from '../../features/dashboard/components/SlotRetryAvgTopBarChart';
import SlotRetryDistTopBarChart from '../../features/dashboard/components/SlotRetryDistTopBarChart';
import SlotSummaryPieChart from '../../features/dashboard/components/SlotSummaryPieChart';
import { GRID_COLS, REFRESH_INTERVAL } from '../../features/dashboard/constants/dashboardConstants';
import { DEFAULT_LAYOUT, useBotDashboardStore } from '../../features/dashboard/hooks/useBotDashboardStore';
import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import type { BotDashboardResponse } from '../../features/dashboard/types/dashboard.types';
import { syncLayoutWithFilter } from '../../features/dashboard/utils/dashboardUtils';
import PageHeader from '@/components/custom/PageHeader';
import { cn } from '@/lib/utils';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

const layoutRenderMapper: Record<string, { title: string; render?: (data?: BotDashboardResponse) => React.ReactNode }> = {
  serviceOccupancy: { title: '봇 점유 현황', render: (d) => <OccupancyBarChart data={d?.serviceOccupancy} /> },
  dialogOccupancy: { title: '대화 점유 현황', render: (d) => <OccupancyBarChart data={d?.dialogOccupancy} /> },
  slotOccupancy: { title: '슬롯 점유 현황', render: (d) => <OccupancyBarChart data={d?.slotOccupancy} /> },
  scenarioSummary: { title: '봇 현황', render: (d) => <ScenarioSummaryPieChart data={d?.scenarioSummary} /> },
  dialogSummary: { title: '대화 현황', render: (d) => <DialogSummaryPieChart data={d?.dialogSummary} /> },
  slotSummary: { title: '슬롯 현황', render: (d) => <SlotSummaryPieChart data={d?.slotSummary} /> },
  dialogIncompleteTop: { title: '대화 미완결율 Top 10', render: (d) => <DialogIncompleteTopBarChart data={d?.dialogIncompleteTop} /> },
  slotIncompleteTop: { title: '슬롯 미완결율 Top 10', render: (d) => <SlotIncompleteTopBarChart data={d?.slotIncompleteTop} /> },
  slotRetryAvgTop: { title: '슬롯 평균 재시도 횟수 Top 10', render: (d) => <SlotRetryAvgTopBarChart data={d?.slotRetryAvgTop} /> },
  slotRetryDistTop: { title: '슬롯 재시도 분포 Top 10', render: (d) => <SlotRetryDistTopBarChart data={d?.slotRetryDistTop} /> },
  keywordTop: { title: '키워드 현황', render: (d) => <KeywordWordCloud data={d?.keywordTop} /> },
  entityTop: { title: '개체 Top 10', render: (d) => <EntityTopBarChart data={d?.entityTop} /> },
  intentTop: { title: '의도 Top 10', render: (d) => <IntentTopBarChart data={d?.intentTop} /> },
  intentCheckFailTop: { title: '의도 Check/Fail Top 10', render: (d) => <IntentCheckFailTopBarChart data={d?.intentCheckFailTop} /> },
  intentConfidenceTop: { title: '의도 평균 신뢰도 Top 10', render: (d) => <IntentConfidenceTopBarChart data={d?.intentConfidenceTop} /> },
  hourlyEntry: { title: '시간대별 봇 진입 현황', render: (d) => <HourlyEntryLineChart data={d?.hourlyEntry} /> },
  hourlyBusyTime: { title: '시간대별 봇 점유 현황', render: (d) => <HourlyBusyTimeLineChart data={d?.hourlyBusyTime} /> },
};

export default function BotDashboard() {
  const { data: botList } = useGetBots();
  const serviceOptions: Option[] = (botList ?? []).map((b) => ({
    label: b.serviceName ? String(b.serviceName) : String(b.serviceId),
    value: String(b.serviceId),
  }));

  const [selectedService, setSelectedService] = useState<Option[]>([]);

  useEffect(() => {
    if (serviceOptions.length > 0) {
      setSelectedService(serviceOptions);
    }
  }, [serviceOptions]);

  const { data, isLoading } = useGetBotDashboard({
    params: { serviceIds: selectedService.map((item) => item.value as string) },
    queryOptions: { enabled: !!selectedService.length, refetchInterval: REFRESH_INTERVAL, placeholderData: keepPreviousData },
  });
  const { layout: storedLayout, setLayout } = useBotDashboardStore();
  const { width, containerRef, mounted } = useContainerWidth();

  const [isEditMode, setIsEditMode] = useState(false);
  const layoutFilterOptions = DEFAULT_LAYOUT.map((item) => ({ label: layoutRenderMapper[item.i as keyof typeof layoutRenderMapper]?.title ?? item.i, value: item.i }));
  const storedLayoutIds = new Set(storedLayout.map((item) => item.i));
  const [selectedLayoutFilterItems, setSelectedLayoutFilterItems] = useState<Option[]>(() => layoutFilterOptions.filter((opt) => storedLayoutIds.has(opt.value)));
  const [draftLayout, setDraftLayout] = useState<LayoutItem[]>(() => [...storedLayout]);

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setDraftLayout([...storedLayout]);
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    setLayout(draftLayout);
    setIsEditMode(false);
  };

  const handleResetLayouts = () => {
    setDraftLayout([...DEFAULT_LAYOUT]);
  };

  const handleLayoutChange = (newLayout: Layout) => {
    setDraftLayout([...newLayout]);
  };

  // 필터와 레이아웃을 한번에 업데이트 처리
  const handleLayoutFilterChange = (newFilterItems: Option[]) => {
    setSelectedLayoutFilterItems(newFilterItems);
    setDraftLayout((prev) => syncLayoutWithFilter(prev, newFilterItems, DEFAULT_LAYOUT, GRID_COLS));
  };

  // 편집 중에는 임시(draft) 레이아웃을, 아닐 때는 저장된 레이아웃을 표시한다
  const displayLayout = isEditMode ? draftLayout : storedLayout;

  const extra = (
    <BotDashboardToolbar
      isEditMode={isEditMode}
      layoutFilterOptions={layoutFilterOptions}
      selectedLayoutFilterItems={selectedLayoutFilterItems}
      serviceOptions={serviceOptions}
      selectedService={selectedService}
      onLayoutFilterChange={handleLayoutFilterChange}
      onStartEdit={handleStartEdit}
      onCancelEdit={handleCancelEdit}
      onSaveEdit={handleSaveEdit}
      onResetLayouts={handleResetLayouts}
      onServiceChange={setSelectedService}
    />
  );

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} extra={extra} />
      <div
        ref={containerRef}
        className={cn(
          `${styles['grid-container']} flex-1 min-h-0 overflow-hidden overflow-y-auto pr-2 rounded-lg transition-colors`,
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
              const mapEntry = layoutRenderMapper[item.i as keyof typeof layoutRenderMapper];
              return (
                <div key={item.i} className="w-full h-full">
                  <Card
                    title={mapEntry?.title ?? item.i}
                    variant="borderless"
                    className="h-full flex flex-col"
                    classNames={{ title: 'text-base font-semibold text-[#495057]', header: '!min-h-0 !h-[45px] !px-4', body: 'flex-1 min-h-0 !p-0' }}
                  >
                    {isLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <FallbackSpinner />
                      </div>
                    ) : mapEntry?.render ? (
                      mapEntry.render(data)
                    ) : null}
                  </Card>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
