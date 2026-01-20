import React from 'react';
import type { BreadcrumbProps } from 'antd';
import { IconDocument, IconFaq } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const AoeBasicInfo = React.lazy(() => import('../../features/global/tabs/AoeBasicInfo'));
const AoeFaqAgentList = React.lazy(() => import('../../features/global/tabs/AoeFaqAgentList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: AoeBasicInfo },
  { id: 'tab2', label: 'FAQ', icon: IconFaq, component: AoeFaqAgentList },
];

export default function AoeConfig() {
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '공용', path: '/bot/global' },
    { title: 'AOE 확장', path: '/bot/global/aoe/config' },
  ];
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="AOE 확장" breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
