import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const CampaignBasicInfoCreate = React.lazy(() => import('../../features/management/tabs/CampaignBasicInfoCreate'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: CampaignBasicInfoCreate }];

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/campaign/management' },
  { title: '캠페인', path: '/campaign/management/campaign' },
  { title: '캠페인 생성', path: '/campaign/management/campaign/create' },
];

export default function CampaignCreate() {
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
