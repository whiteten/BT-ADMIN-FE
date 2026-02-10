import { useState } from 'react';
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
  const { width, containerRef, mounted } = useContainerWidth();

  const { layouts, setLayouts } = useBotDashboardStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftLayouts, setDraftLayouts] = useState<ResponsiveLayouts>(layouts);

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

  const extra = (
    <div className="flex gap-2 w-fit items-center shrink-0">
      {isEditMode ? (
        <>
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
            편집
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
            dragConfig={{ enabled: isEditMode }}
            resizeConfig={{ enabled: isEditMode }}
            onLayoutChange={handleLayoutChange}
          >
            {layouts.lg?.map((layout) => (
              <div key={layout.i} className="bg-white bt-shadow flex items-center justify-center">
                {layoutRenderMapper[layout.i as keyof typeof layoutRenderMapper].title}
              </div>
            ))}
          </Responsive>
        )}
      </div>
    </div>
  );
}
