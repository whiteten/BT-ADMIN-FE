import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { IconCalendar, IconDocument, IconLayer, IconSlidersHorizontal, IconTalk } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const BotBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/BotBasicInfo'));
const BotVersion = React.lazy(() => import('../../features/bot-config/tabs/BotVersion'));
const BotSchedule = React.lazy(() => import('../../features/bot-config/tabs/BotSchedule'));
const BotVoice = React.lazy(() => import('../../features/bot-config/tabs/BotVoice'));
const BotEnv = React.lazy(() => import('../../features/bot-config/tabs/BotEnv'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: BotBasicInfo },
  { id: 'tab2', label: '봇버전/배포', icon: IconLayer, component: BotVersion },
  { id: 'tab3', label: '스케쥴', icon: IconCalendar, component: BotSchedule },
  { id: 'tab4', label: 'STT&TTS', icon: IconTalk, component: BotVoice },
  { id: 'tab5', label: '환경변수', icon: IconSlidersHorizontal, component: BotEnv },
];

export default function BotDetail() {
  const { serviceId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '봇', path: '/bot/bot-config/bot' },
    { title: '봇 상세', path: `/bot/bot-config/bot/${serviceId}` },
  ];
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="봇 편집" breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
