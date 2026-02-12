import { useEffect, useState } from 'react';
import { GridLayout, type Layout, type LayoutItem, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { MultiSelect, type Option } from 'react-multi-select-component';
import { keepPreviousData } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Card } from 'antd';
import styles from './BotDashboard.module.scss';
import DialogIncompleteTopBarChart from '../../features/dashboard/components/DialogIncompleteTopBarChart';
import DialogSummaryPieChart from '../../features/dashboard/components/DialogSummaryPieChart';
import EntityTopBarChart from '../../features/dashboard/components/EntityTopBarChart';
import HourlyBusyTimeLineChart from '../../features/dashboard/components/HourlyBusyTimeLineChart';
import HourlyEntryLineChart from '../../features/dashboard/components/HourlyEntryLineChart';
import IntentCheckFailTopBarChart from '../../features/dashboard/components/IntentCheckFailTopBarChart';
import IntentConfidenceTopBarChart from '../../features/dashboard/components/IntentConfidenceTopBarChart';
import IntentTopBarChart from '../../features/dashboard/components/IntentTopBarChart';
import KeywordWordCloud from '../../features/dashboard/components/KeywordWordCloud';
import ScenarioSummaryPieChart from '../../features/dashboard/components/ScenarioSummaryPieChart';
import SlotIncompleteTopBarChart from '../../features/dashboard/components/SlotIncompleteTopBarChart';
import SlotRetryAvgTopBarChart from '../../features/dashboard/components/SlotRetryAvgTopBarChart';
import SlotRetryDistTopBarChart from '../../features/dashboard/components/SlotRetryDistTopBarChart';
import SlotSummaryPieChart from '../../features/dashboard/components/SlotSummaryPieChart';
import { DEFAULT_LAYOUT, useBotDashboardStore } from '../../features/dashboard/hooks/useBotDashboardStore';
import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import type { BotDashboardResponse } from '../../features/dashboard/types/dashboard.types';
import PageHeader from '@/components/custom/PageHeader';
import { cn } from '@/lib/utils';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

const GRID_COLS = 12;
const REFRESH_INTERVAL = 3000;

function findTopLeftPosition(existingItems: LayoutItem[], itemW: number, itemH: number, totalCols: number): { x: number; y: number } {
  const collides = (x: number, y: number, w: number, h: number, item: LayoutItem) => x < item.x + item.w && x + w > item.x && y < item.y + item.h && y + h > item.y;
  const maxY = existingItems.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= totalCols - itemW; x++) {
      const hasCollision = existingItems.some((item) => collides(x, y, itemW, itemH, item));
      if (!hasCollision) return { x, y };
    }
  }
  return { x: 0, y: maxY };
}

const sampleServiceIdList = [1001, 1002, 1003, 1004, 1005];

const serviceOptions: Option[] = sampleServiceIdList.map((id) => ({
  label: id.toString(),
  value: id,
}));

const multiSelectStrings = {
  selectSomeItems: '봇서비스를 선택하세요.',
  allItemsAreSelected: '전체 선택됨',
  selectAll: '전체 선택',
  selectAllFiltered: '전체 선택 (필터)',
  search: '검색어를 입력하세요.',
  clearSearch: '검색 초기화',
  clearSelected: '선택 초기화',
  noOptions: '옵션 없음',
  create: '생성',
};

const layoutRenderMapper: Record<string, { title: string; render?: (data?: BotDashboardResponse) => React.ReactNode }> = {
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
  const [selectedService, setSelectedService] = useState<Option[]>(serviceOptions);
  const { data, isLoading } = useGetBotDashboard({
    params: { serviceIds: selectedService.map((item) => item.value as string) },
    queryOptions: { enabled: !!selectedService.length, refetchInterval: REFRESH_INTERVAL, placeholderData: keepPreviousData },
  });
  const { layout: storedLayout, setLayout } = useBotDashboardStore();
  const { width, containerRef, mounted } = useContainerWidth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<LayoutItem[]>([...storedLayout]);
  const layoutFilterOptions = DEFAULT_LAYOUT.map((item) => ({ label: layoutRenderMapper[item.i as keyof typeof layoutRenderMapper]?.title ?? item.i, value: item.i }));
  const [selectedLayoutFilterItems, setSelectedLayoutFilterItems] = useState<Option[]>(layoutFilterOptions);

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

  useEffect(() => {
    const selectedIds = new Set(selectedLayoutFilterItems.map((item) => item.value as string));
    setDraftLayout((prev) => {
      const filtered = prev.filter((item) => selectedIds.has(item.i));
      const existingIds = new Set(filtered.map((item) => item.i));
      const toAdd: LayoutItem[] = [];
      for (const id of selectedIds) {
        if (existingIds.has(id)) continue;
        const defaultItem = DEFAULT_LAYOUT.find((d) => d.i === id);
        if (!defaultItem) continue;
        const pos = findTopLeftPosition([...filtered, ...toAdd], defaultItem.w, defaultItem.h, GRID_COLS);
        toAdd.push({ ...defaultItem, ...pos });
      }
      return [...filtered, ...toAdd];
    });
  }, [selectedLayoutFilterItems]);

  const displayLayout = isEditMode ? draftLayout : storedLayout;

  const extra = (
    <div className="flex gap-2 w-fit items-center shrink-0">
      {isEditMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">현황판 선택</span>
          <MultiSelect
            options={layoutFilterOptions}
            value={selectedLayoutFilterItems}
            onChange={setSelectedLayoutFilterItems}
            labelledBy="현황판 선택"
            hasSelectAll
            overrideStrings={multiSelectStrings}
            valueRenderer={(selected, options) => {
              if (selected.length === 0) return '현황판을 선택하세요.';
              if (selected.length === options.length) return '전체 선택됨';
              if (selected.length === 1) return selected[0].label;
              return `${selected.length}개 선택됨`;
            }}
            isLoading={false}
            className="w-[250px]"
          />
          <Button onClick={handleCancelEdit}>취소</Button>
          <Button variant="solid" color="orange" onClick={handleResetLayouts}>
            초기화
          </Button>
          <Button variant="solid" color="cyan" onClick={handleSaveEdit}>
            저장
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
          <MultiSelect
            options={serviceOptions}
            value={selectedService}
            onChange={setSelectedService}
            labelledBy="봇서비스 선택"
            hasSelectAll
            overrideStrings={multiSelectStrings}
            valueRenderer={(selected, options) => {
              if (selected.length === 0) return '봇서비스를 선택하세요.';
              if (selected.length === options.length) return '전체 선택됨';
              if (selected.length === 1) return selected[0].label;
              return `${selected.length}개 선택됨`;
            }}
            isLoading={false}
            className="w-[250px]"
          />
          <Button variant="solid" color="primary" onClick={handleStartEdit}>
            화면편집
          </Button>
        </div>
      )}
    </div>
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
                    classNames={{
                      title: 'text-base font-semibold text-[#495057]',
                      header: '!min-h-0 !h-[45px] !px-4',
                      body: 'flex-1 min-h-0 !p-0',
                    }}
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
