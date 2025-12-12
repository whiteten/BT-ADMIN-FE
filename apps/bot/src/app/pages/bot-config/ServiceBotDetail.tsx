import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { IconCalendar, IconDocument, IconLayer, IconSlidersHorizontal, IconTalk } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ServiceBotBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/ServiceBotBasicInfo'));
const ServiceBotVersion = React.lazy(() => import('../../features/bot-config/tabs/ServiceBotVersion'));
const ServiceBotSchedule = React.lazy(() => import('../../features/bot-config/tabs/ServiceBotSchedule'));
const ServiceBotVoice = React.lazy(() => import('../../features/bot-config/tabs/ServiceBotVoice'));
const ServiceBotEnv = React.lazy(() => import('../../features/bot-config/tabs/ServiceBotEnv'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ServiceBotBasicInfo },
  { id: 'tab2', label: '봇버전/배포', icon: IconLayer, component: ServiceBotVersion },
  { id: 'tab3', label: '스케쥴', icon: IconCalendar, component: ServiceBotSchedule },
  { id: 'tab4', label: 'STT&TTS', icon: IconTalk, component: ServiceBotVoice },
  { id: 'tab5', label: '환경변수', icon: IconSlidersHorizontal, component: ServiceBotEnv },
];

export default function ServiceBotDetail() {
  const { serviceId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '봇', path: '/bot/bot-config/service-bot' },
    { title: '봇 상세', path: `/bot/bot-config/service-bot/${serviceId}` },
  ];
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="봇 편집" breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
