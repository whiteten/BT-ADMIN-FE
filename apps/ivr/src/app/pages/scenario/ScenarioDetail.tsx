import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetScenarioDetail } from '../../features/scenario/hooks/useScenarioQueries';
import { IconDocument, IconLayer } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ScenarioBasicInfo = React.lazy(() => import('../../features/scenario/tabs/ScenarioBasicInfo'));
const ScenarioVersionTab = React.lazy(() => import('../../features/scenario/tabs/ScenarioVersionTab'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ScenarioBasicInfo },
  { id: 'tab2', label: '버전/배포', icon: IconLayer, component: ScenarioVersionTab },
];

export default function ScenarioDetail() {
  const { serviceId } = useParams();
  const { data: scenario } = useGetScenarioDetail({
    params: { serviceId: Number(serviceId) },
    queryOptions: { enabled: !!serviceId },
  });
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: 'ForCus', path: '/ivr' },
      { title: '시나리오 관리' },
      { title: '시나리오 목록', path: '/ivr/scenario/list' },
      { title: ':scenarioName', path: `/ivr/scenario/${serviceId}` },
    ];
    setBreadcrumb(breadcrumb, { scenarioName: scenario?.serviceName ?? '-' });
    return () => clearBreadcrumb();
  }, [serviceId, scenario?.serviceName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
