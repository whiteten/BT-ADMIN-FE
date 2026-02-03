import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { IconFaq } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const AoeFaqList = React.lazy(() => import('../../features/global/tabs/AoeFaqList'));
const tabs: PageTab[] = [{ id: 'tab1', label: 'FAQ', icon: IconFaq, component: AoeFaqList }];

export default function FaqDetail() {
  const { agentId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '공용', path: '/fca/global' },
    { title: 'AOE 확장', path: '/fca/global/aoe/config' },
    { title: 'FAQ', path: `/fca/global/aoe/faq/${agentId}` },
  ];
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
