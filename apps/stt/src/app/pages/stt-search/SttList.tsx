import React from 'react';
import type { BreadcrumbProps } from 'antd';
import { IconMenuBotConfig } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const SttSearch = React.lazy(() => import('../../features/stt-search/tabs/SttSearch'));
const SttSearchCallbot = React.lazy(() => import('../../features/stt-search/tabs/SttSearchCallbot'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: 'STT 검색', path: '/stt/stt-config/stt/list' },
];

const tabs: PageTab[] = [
  { id: 'stt', label: 'STT 검색', icon: IconMenuBotConfig, component: SttSearch },
  { id: 'call-bot', label: 'STT 검색(음성봇)', icon: IconMenuBotConfig, component: SttSearchCallbot },
];

export default function SttList() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
