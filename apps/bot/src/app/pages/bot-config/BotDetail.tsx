import React from 'react';
import { IconDocument } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const BotBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/BotBasicInfo'));

// import { useParams } from 'react-router-dom';

export default function BotDetail() {
  // const { id } = useParams();

  const tabs: PageTab[] = [
    {
      id: 'basic',
      label: '기본정보',
      icon: <IconDocument className="h-5 w-5" />,
      component: BotBasicInfo,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="봇 편집" breadcrumb="봇 관리 > 봇 > 봇 편집" />
      <PageTabs tabs={tabs} />
    </div>
  );
}
