import React from 'react';
import { IconCalendar, IconDocument, IconLayer, IconSlidersHorizontal, IconTalk } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';
// import { useParams } from 'react-router-dom';

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
  // const { id } = useParams();
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="봇 편집" breadcrumb="봇 관리 > 봇 > 봇 편집" />
      <PageTabs tabs={tabs} />
    </div>
  );
}
