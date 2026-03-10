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
import DialogIncompleteTopGrid from '../../features/dashboard/components/DialogIncompleteTopGrid';
import DialogSummaryGrid from '../../features/dashboard/components/DialogSummaryGrid';
import DialogSummaryPieChart from '../../features/dashboard/components/DialogSummaryPieChart';
import EntityTopBarChart from '../../features/dashboard/components/EntityTopBarChart';
import EntityTopGrid from '../../features/dashboard/components/EntityTopGrid';
import HourlyBusyTimeGrid from '../../features/dashboard/components/HourlyBusyTimeGrid';
import HourlyBusyTimeLineChart from '../../features/dashboard/components/HourlyBusyTimeLineChart';
import HourlyEntryGrid from '../../features/dashboard/components/HourlyEntryGrid';
import HourlyEntryLineChart from '../../features/dashboard/components/HourlyEntryLineChart';
import IntentCheckFailTopBarChart from '../../features/dashboard/components/IntentCheckFailTopBarChart';
import IntentCheckFailTopGrid from '../../features/dashboard/components/IntentCheckFailTopGrid';
import IntentConfidenceTopBarChart from '../../features/dashboard/components/IntentConfidenceTopBarChart';
import IntentConfidenceTopGrid from '../../features/dashboard/components/IntentConfidenceTopGrid';
import IntentTopBarChart from '../../features/dashboard/components/IntentTopBarChart';
import IntentTopGrid from '../../features/dashboard/components/IntentTopGrid';
import KeywordTopGrid from '../../features/dashboard/components/KeywordTopGrid';
import KeywordWordCloud from '../../features/dashboard/components/KeywordWordCloud';
import OccupancyBarChart from '../../features/dashboard/components/OccupancyBarChart';
import OccupancyGrid from '../../features/dashboard/components/OccupancyGrid';
import ScenarioSummaryGrid from '../../features/dashboard/components/ScenarioSummaryGrid';
import ScenarioSummaryPieChart from '../../features/dashboard/components/ScenarioSummaryPieChart';
import SlotIncompleteTopBarChart from '../../features/dashboard/components/SlotIncompleteTopBarChart';
import SlotIncompleteTopGrid from '../../features/dashboard/components/SlotIncompleteTopGrid';
import SlotRetryAvgTopBarChart from '../../features/dashboard/components/SlotRetryAvgTopBarChart';
import SlotRetryAvgTopGrid from '../../features/dashboard/components/SlotRetryAvgTopGrid';
import SlotRetryDistTopBarChart from '../../features/dashboard/components/SlotRetryDistTopBarChart';
import SlotRetryDistTopGrid from '../../features/dashboard/components/SlotRetryDistTopGrid';
import SlotSummaryGrid from '../../features/dashboard/components/SlotSummaryGrid';
import SlotSummaryPieChart from '../../features/dashboard/components/SlotSummaryPieChart';
import { GRID_COLS, REFRESH_INTERVAL } from '../../features/dashboard/constants/dashboardConstants';
import { DEFAULT_LAYOUT, useBotDashboardStore } from '../../features/dashboard/hooks/useBotDashboardStore';
import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import useDashboardViewMode from '../../features/dashboard/hooks/useDashboardViewMode';
import { type BotDashboardResponse, DASHBOARD_VIEW, type DashboardViewMode } from '../../features/dashboard/types/dashboard.types';
import { syncLayoutWithFilter } from '../../features/dashboard/utils/dashboardUtils';
import PageHeader from '@/components/custom/PageHeader';
import { cn } from '@/lib/utils';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

interface LayoutRenderEntry {
  title: string;
  supportedModes?: DashboardViewMode[];
  render?: (data?: BotDashboardResponse, viewMode?: DashboardViewMode) => React.ReactNode;
}

const layoutRenderMapper: Record<string, LayoutRenderEntry> = {
  serviceOccupancy: {
    title: '봇 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <OccupancyGrid data={d?.serviceOccupancy} /> : <OccupancyBarChart data={d?.serviceOccupancy} />),
  },
  dialogOccupancy: {
    title: '대화 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <OccupancyGrid data={d?.dialogOccupancy} /> : <OccupancyBarChart data={d?.dialogOccupancy} />),
  },
  slotOccupancy: {
    title: '슬롯 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <OccupancyGrid data={d?.slotOccupancy} /> : <OccupancyBarChart data={d?.slotOccupancy} />),
  },
  scenarioSummary: {
    title: '봇 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <ScenarioSummaryGrid data={d?.scenarioSummary} /> : <ScenarioSummaryPieChart data={d?.scenarioSummary} />),
  },
  dialogSummary: {
    title: '대화 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <DialogSummaryGrid data={d?.dialogSummary} /> : <DialogSummaryPieChart data={d?.dialogSummary} />),
  },
  slotSummary: {
    title: '슬롯 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <SlotSummaryGrid data={d?.slotSummary} /> : <SlotSummaryPieChart data={d?.slotSummary} />),
  },
  dialogIncompleteTop: {
    title: '대화 미완결율 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <DialogIncompleteTopGrid data={d?.dialogIncompleteTop} /> : <DialogIncompleteTopBarChart data={d?.dialogIncompleteTop} />),
  },
  slotIncompleteTop: {
    title: '슬롯 미완결율 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <SlotIncompleteTopGrid data={d?.slotIncompleteTop} /> : <SlotIncompleteTopBarChart data={d?.slotIncompleteTop} />),
  },
  slotRetryAvgTop: {
    title: '슬롯 평균 재시도 횟수 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <SlotRetryAvgTopGrid data={d?.slotRetryAvgTop} /> : <SlotRetryAvgTopBarChart data={d?.slotRetryAvgTop} />),
  },
  slotRetryDistTop: {
    title: '슬롯 완결 건 재시도 분포 TOP 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <SlotRetryDistTopGrid data={d?.slotRetryDistTop} /> : <SlotRetryDistTopBarChart data={d?.slotRetryDistTop} />),
  },
  keywordTop: {
    title: '키워드 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <KeywordTopGrid data={d?.keywordTop} /> : <KeywordWordCloud data={d?.keywordTop} />),
  },
  entityTop: {
    title: '개체 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <EntityTopGrid data={d?.entityTop} /> : <EntityTopBarChart data={d?.entityTop} />),
  },
  intentTop: {
    title: '의도 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <IntentTopGrid data={d?.intentTop} /> : <IntentTopBarChart data={d?.intentTop} />),
  },
  intentCheckFailTop: {
    title: '의도 Check/Fail Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <IntentCheckFailTopGrid data={d?.intentCheckFailTop} /> : <IntentCheckFailTopBarChart data={d?.intentCheckFailTop} />),
  },
  intentConfidenceTop: {
    title: '의도 평균 신뢰도 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <IntentConfidenceTopGrid data={d?.intentConfidenceTop} /> : <IntentConfidenceTopBarChart data={d?.intentConfidenceTop} />),
  },
  hourlyEntry: {
    title: '시간대별 봇 진입 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <HourlyEntryGrid data={d?.hourlyEntry} /> : <HourlyEntryLineChart data={d?.hourlyEntry} />),
  },
  hourlyBusyTime: {
    title: '시간대별 봇 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    render: (d, vm) => (vm === DASHBOARD_VIEW.TABLE ? <HourlyBusyTimeGrid data={d?.hourlyBusyTime} /> : <HourlyBusyTimeLineChart data={d?.hourlyBusyTime} />),
  },
};

interface DashboardCardItemProps {
  layoutKey: string;
  mapEntry: LayoutRenderEntry;
  data?: BotDashboardResponse;
  isLoading: boolean;
}

function DashboardCardItem({ layoutKey, mapEntry, data, isLoading }: DashboardCardItemProps) {
  const supportedModes = mapEntry.supportedModes ?? [DASHBOARD_VIEW.CHART];
  const { viewMode, extra } = useDashboardViewMode(supportedModes);

  return (
    <Card
      title={mapEntry.title ?? layoutKey}
      variant="borderless"
      className="h-full flex flex-col"
      classNames={{ title: 'text-base font-semibold text-[#495057]', header: '!min-h-0 !h-[45px] !px-4', body: 'flex-1 min-h-0 !p-0' }}
      extra={extra}
    >
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : (
        mapEntry.render?.(data, viewMode)
      )}
    </Card>
  );
}

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
    setSelectedLayoutFilterItems(layoutFilterOptions.filter((opt) => storedLayoutIds.has(opt.value)));
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    setLayout(draftLayout);
    setIsEditMode(false);
  };

  const handleResetLayouts = () => {
    setDraftLayout([...DEFAULT_LAYOUT]);
    setSelectedLayoutFilterItems(layoutFilterOptions);
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
                  <DashboardCardItem layoutKey={item.i} mapEntry={mapEntry} data={data} isLoading={isLoading} />
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
