import { useEffect, useState } from 'react';
import { type Layout, Responsive, type ResponsiveLayouts, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { MultiSelect, type Option } from 'react-multi-select-component';
import { type BreadcrumbProps, Button } from 'antd';
// import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import { DEFAULT_LAYOUTS, useBotDashboardStore } from '../../features/dashboard/hooks/useBotDashboardStore';
import PageHeader from '@/components/custom/PageHeader';

const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 60, md: 50, sm: 30, xs: 20, xxs: 10 };

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

const sampleServiceIdList = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];

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

const layoutRenderMapper: Record<string, { title: string }> = {
  '1-1': { title: '시나리오 현황' },
  '1-2': { title: '대화 현황' },
  '1-3': { title: '슬롯 현황' },
  '2-1': { title: '대화 미완결율 Top 10' },
  '2-2': { title: '슬롯 미완결율 Top 10' },
  '2-3': { title: '슬롯 평균 재시도 횟수 Top 10' },
  '2-4': { title: '슬롯 재시도 분포 Top 10' },
  '3-1': { title: '키워드 Top 10' },
  '3-2': { title: '개체 Top 10' },
  '3-3': { title: '의도 Top 10' },
  '3-4': { title: '의도 재질의 Top 10' },
  '3-5': { title: '의도 평균 신회도 Top 10' },
  '4-1': { title: '시간대별 봇 진입 현황' },
  '4-2': { title: '시간대별 봇 점유 현황' },
};

export default function BotDashboard() {
  const [selectedService, setSelectedService] = useState<Option[]>(serviceOptions);
  // const { data, isLoading, error } = useGetBotDashboard({ params: { serviceIds } });
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
        // 현재 브레이크포인트에 없지만 선택된 항목 → DEFAULT_LAYOUTS.lg 기준 + x: 0 y: Infinity 처리하여 추가
        const existingIds = new Set(filtered.map((item) => item.i));
        const toAdd = [...selectedIds]
          .filter((id) => !existingIds.has(id))
          .map((id) => {
            const defaultItem = DEFAULT_LAYOUTS.lg?.find((d) => d.i === id);
            if (!defaultItem) return null;
            return { ...defaultItem, x: 0, y: Infinity };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        newLayouts[breakpoint as keyof typeof newLayouts] = [...filtered, ...toAdd];
      }

      return newLayouts;
    });
  }, [selectedLayoutFilterItems]);

  const extra = (
    <div className="flex gap-2 w-fit items-center shrink-0">
      {isEditMode ? (
        <>
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
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} extra={extra} />
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto pr-2">
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
            {(isEditMode ? draftLayouts.lg : layouts.lg)?.map((layout) => (
              <div key={layout.i} className="bg-white bt-shadow flex items-center justify-center">
                {layoutRenderMapper[layout.i as keyof typeof layoutRenderMapper]?.title ?? layout.i}
              </div>
            ))}
          </Responsive>
        )}
      </div>
    </div>
  );
}
