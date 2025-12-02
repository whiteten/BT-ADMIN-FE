import React from 'react';
import { IconCalendar, IconDocument, IconLayer, IconSlidersHorizontal, IconTalk } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const BotBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/BotBasicInfo'));

// import { useParams } from 'react-router-dom';

export default function BotDetail() {
  // const { id } = useParams();

  const tabs: PageTab[] = [
    {
      id: 'tab1',
      label: '기본정보',
      icon: IconDocument,
      component: BotBasicInfo,
    },
    {
      id: 'tab2',
      label: '봇버전/배포',
      icon: IconLayer,
      component: () => <div>봇버전/배포</div>,
    },
    {
      id: 'tab3',
      label: '스케쥴',
      icon: IconCalendar,
      component: () => <div>스케쥴</div>,
    },
    {
      id: 'tab4',
      label: 'STT&TTS',
      icon: IconTalk,
      component: () => <div>STT&TTS</div>,
    },
    {
      id: 'tab5',
      label: '환경변수',
      icon: IconSlidersHorizontal,
      component: () => <div>환경변수</div>,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="봇 편집" breadcrumb="봇 관리 > 봇 > 봇 편집" />
      <PageTabs tabs={tabs} />
    </div>
  );
}
