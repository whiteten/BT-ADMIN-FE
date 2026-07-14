import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const CampaignScenarioBasicInfoCreate = React.lazy(() => import('../../features/management/tabs/CampaignScenarioBasicInfoCreate'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: CampaignScenarioBasicInfoCreate }];

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/campaign/management' },
  { title: '캠페인 시나리오', path: '/campaign/management/campaign-scenario' },
  { title: '캠페인 시나리오 생성', path: '/campaign/management/campaign-scenario/create' },
];

export default function CampaignScenarioCreate() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
