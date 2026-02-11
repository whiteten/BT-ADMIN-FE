import { type ComponentType, useEffect, useState } from 'react';
import { type Layout, type LayoutItem, Responsive, type ResponsiveLayouts, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { MultiSelect, type Option } from 'react-multi-select-component';
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
import KeywordTopBarChart from '../../features/dashboard/components/KeywordTopBarChart';
import ScenarioSummaryPieChart from '../../features/dashboard/components/ScenarioSummaryPieChart';
import SlotIncompleteTopBarChart from '../../features/dashboard/components/SlotIncompleteTopBarChart';
import SlotRetryAvgTopBarChart from '../../features/dashboard/components/SlotRetryAvgTopBarChart';
import SlotRetryDistTopBarChart from '../../features/dashboard/components/SlotRetryDistTopBarChart';
import SlotSummaryPieChart from '../../features/dashboard/components/SlotSummaryPieChart';
import { DEFAULT_LAYOUTS, useBotDashboardStore } from '../../features/dashboard/hooks/useBotDashboardStore';
import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import PageHeader from '@/components/custom/PageHeader';
import { cn } from '@/lib/utils';

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 60, md: 50, sm: 30, xs: 20, xxs: 10 };

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

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

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

const layoutRenderMapper: Record<string, { title: string; component?: ComponentType }> = {
  '1-1': { title: '시나리오 현황', component: ScenarioSummaryPieChart },
  '1-2': { title: '대화 현황', component: DialogSummaryPieChart },
  '1-3': { title: '슬롯 현황', component: SlotSummaryPieChart },
  '2-1': { title: '대화 미완결율 Top 10', component: DialogIncompleteTopBarChart },
  '2-2': { title: '슬롯 미완결율 Top 10', component: SlotIncompleteTopBarChart },
  '2-3': { title: '슬롯 평균 재시도 횟수 Top 10', component: SlotRetryAvgTopBarChart },
  '2-4': { title: '슬롯 재시도 분포 Top 10', component: SlotRetryDistTopBarChart },
  '3-1': { title: '키워드 Top 10', component: KeywordTopBarChart },
  '3-2': { title: '개체 Top 10', component: EntityTopBarChart },
  '3-3': { title: '의도 Top 10', component: IntentTopBarChart },
  '3-4': { title: '의도 재질의 Top 10', component: IntentCheckFailTopBarChart },
  '3-5': { title: '의도 평균 신회도 Top 10', component: IntentConfidenceTopBarChart },
  '4-1': { title: '시간대별 봇 진입 현황', component: HourlyEntryLineChart },
  '4-2': { title: '시간대별 봇 점유 현황', component: HourlyBusyTimeLineChart },
};

export default function BotDashboard() {
  const [selectedService, setSelectedService] = useState<Option[]>(serviceOptions);
  const { data, isLoading } = useGetBotDashboard({
    params: { serviceIds: selectedService.map((item) => item.value as string) },
    queryOptions: { enabled: false }, // TODO: api 개발 후 selectedService.length > 0 조건으로 변경
  });
  const { layouts, setLayouts } = useBotDashboardStore();
  const { width, containerRef, mounted } = useContainerWidth();

  const [isEditMode, setIsEditMode] = useState(false);
  const [draftLayouts, setDraftLayouts] = useState<ResponsiveLayouts>(layouts);
  const layoutFilterOptions =
    DEFAULT_LAYOUTS.lg?.map((layout) => ({ label: layoutRenderMapper[layout.i as keyof typeof layoutRenderMapper]?.title ?? layout.i, value: layout.i })) ?? [];
  const [selectedLayoutFilterItems, setSelectedLayoutFilterItems] = useState<Option[]>(layoutFilterOptions);

  const handleStartEdit = () => {
    setDraftLayouts(layouts);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    // const breakpoint = getBreakpointFromWidth(breakpoints, width);
    setLayouts(draftLayouts);
    setIsEditMode(false);
  };

  const handleResetLayouts = () => {
    setDraftLayouts(DEFAULT_LAYOUTS);
  };

  const handleLayoutChange = (_layout: Layout, allLayouts: ResponsiveLayouts) => {
    setDraftLayouts(allLayouts);
  };

  useEffect(() => {
    const selectedIds = new Set(selectedLayoutFilterItems.map((item) => item.value as string));

    setDraftLayouts((prev) => {
      const newLayouts: ResponsiveLayouts = {};
      for (const [breakpoint, layouts] of Object.entries(prev)) {
        if (!layouts) continue;
        // 선택된 항목만 유지
        const filtered = layouts.filter((item) => selectedIds.has(item.i));
        // 현재 브레이크포인트에 없지만 선택된 항목 → 가장 좌측 상단 빈 공간에 추가
        const existingIds = new Set(filtered.map((item) => item.i));
        const colCount = cols[breakpoint as keyof typeof cols] ?? cols.lg;
        const toAdd: LayoutItem[] = [];
        for (const id of selectedIds) {
          if (existingIds.has(id)) continue;
          const defaultItem = DEFAULT_LAYOUTS.lg?.find((d) => d.i === id);
          if (!defaultItem) continue;
          const pos = findTopLeftPosition([...filtered, ...toAdd], defaultItem.w, defaultItem.h, colCount);
          toAdd.push({ ...defaultItem, ...pos });
        }
        newLayouts[breakpoint as keyof typeof newLayouts] = [...filtered, ...toAdd];
      }

      return newLayouts;
    });
  }, [selectedLayoutFilterItems]);

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
          `${styles['grid-container']} flex-1 min-h-0 overflow-y-auto pr-2 rounded-lg transition-colors`,
          isEditMode && 'bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] bg-[length:16px_16px]',
        )}
      >
        {mounted && (
          <Responsive
            layouts={isEditMode ? draftLayouts : layouts}
            breakpoints={breakpoints}
            cols={cols}
            width={width}
            rowHeight={60}
            containerPadding={[0, 5]}
            dragConfig={{ enabled: isEditMode, bounded: true }}
            resizeConfig={{ enabled: isEditMode, handles: ['sw', 'nw', 'se', 'ne'] }}
            onLayoutChange={handleLayoutChange}
          >
            {(isEditMode ? draftLayouts.lg : layouts.lg)?.map((layout) => {
              const layoutItem = layoutRenderMapper[layout.i as keyof typeof layoutRenderMapper];
              const WidgetComponent = layoutItem?.component;
              return (
                <div key={layout.i} className="w-full h-full">
                  <Card
                    title={layoutItem?.title ?? layout.i}
                    variant="borderless"
                    className="h-full flex flex-col"
                    classNames={{
                      title: 'text-base font-semibold text-[#495057]',
                      header: '!min-h-0 !h-[45px] !px-4',
                      body: 'flex-1 min-h-0 !p-0',
                    }}
                    loading={isLoading}
                  >
                    {WidgetComponent ? <WidgetComponent /> : null}
                  </Card>
                </div>
              );
            })}
          </Responsive>
        )}
      </div>
    </div>
  );
}
