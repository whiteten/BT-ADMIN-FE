import { useState } from 'react';
import { type BreadcrumbProps, Select } from 'antd';
import { useGetBotDashboard } from '../../features/dashboard/hooks/useDashboardQueries';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

const sampleServiceIdList = [1001, 1002, 1003, 1004, 1005];

export default function BotDashboard() {
  const [serviceIds, setServiceIds] = useState<number[]>(sampleServiceIdList);
  const { data, isLoading, error } = useGetBotDashboard({ params: { serviceIds } });

  const handleServiceIdsChange = (value: number[]) => {
    setServiceIds(value ?? []);
  };

  const extra = (
    <div className="flex gap-2 w-[400px] items-center shrink-0">
      <span className="text-sm font-medium text-[#495057] shrink-0">봇서비스</span>
      <Select
        mode="multiple"
        value={serviceIds}
        onChange={handleServiceIdsChange}
        options={sampleServiceIdList.map((serviceId) => ({ label: serviceId.toString(), value: serviceId }))}
        allowClear
        showSearch={{ optionFilterProp: 'label' }}
        maxTagCount="responsive"
        placeholder="검색할 봇서비스를 선택하세요."
        className="!min-w-[250px] w-full"
        popupMatchSelectWidth={false}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} extra={extra} />
    </div>
  );
}
