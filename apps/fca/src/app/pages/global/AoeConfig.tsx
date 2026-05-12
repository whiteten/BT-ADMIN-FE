import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconDocument, IconFaq } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const AoeBasicInfo = React.lazy(() => import('../../features/global/tabs/AoeBasicInfo'));
const AoeFaqAgentList = React.lazy(() => import('../../features/global/tabs/AoeFaqAgentList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: AoeBasicInfo },
  { id: 'tab2', label: 'FAQ', icon: IconFaq, component: AoeFaqAgentList },
];

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '공용', path: '/fca/global' },
  { title: 'AOE 확장', path: '/fca/global/aoe/config' },
];

export default function AoeConfig() {
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
