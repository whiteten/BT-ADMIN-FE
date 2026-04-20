import React from 'react';
import type { BreadcrumbProps } from 'antd';
import { IconMenuBotConfig } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ConfidenceTraining = React.lazy(() => import('../../features/stt-config/tabs/ConfidenceTraining'));
const TuningSentence = React.lazy(() => import('../../features/stt-config/tabs/TuningSentence'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '학습 데이터 관리', path: '/stt/stt-config/training/list' },
];

const tabs: PageTab[] = [
  { id: 'confidence-training', label: '신뢰도별 학습', icon: IconMenuBotConfig, component: ConfidenceTraining },
  { id: 'tuning-sentence', label: '문자수정', icon: IconMenuBotConfig, component: TuningSentence },
];

export default function TrainingList() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
