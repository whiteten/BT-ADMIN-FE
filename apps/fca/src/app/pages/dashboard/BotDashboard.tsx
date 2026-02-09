import { useState } from 'react';
import { GridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { MultiSelect, type Option } from 'react-multi-select-component';
import { type BreadcrumbProps } from 'antd';
// import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import PageHeader from '@/components/custom/PageHeader';

const layout = [
  { i: 'a', x: 0, y: 0, w: 6, h: 4 },
  { i: 'b', x: 6, y: 0, w: 6, h: 4 },
  { i: 'c', x: 0, y: 4, w: 12, h: 4 },
  { i: 'd', x: 0, y: 8, w: 12, h: 4 },
  { i: 'e', x: 0, y: 12, w: 12, h: 4 },
];

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

export default function BotDashboard() {
  const [selectedService, setSelectedService] = useState<Option[]>(serviceOptions);
  // const { data, isLoading, error } = useGetBotDashboard({ params: { serviceIds } });
  const { width, containerRef, mounted } = useContainerWidth();

  const extra = (
    <div className="flex gap-2 w-[300px] items-center shrink-0">
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
        className="min-w-[250px] w-full"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} extra={extra} />
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto">
        {mounted && (
          <GridLayout width={width} layout={layout} gridConfig={{ cols: 12, rowHeight: 60 }}>
            <div key="a" className="bg-white bt-shadow">
              A
            </div>
            <div key="b" className="bg-white bt-shadow">
              B
            </div>
            <div key="c" className="bg-white bt-shadow">
              C
            </div>
            <div key="d" className="bg-white bt-shadow">
              D
            </div>
            <div key="e" className="bg-white bt-shadow">
              E
            </div>
          </GridLayout>
        )}
      </div>
    </div>
  );
}
