import React from 'react';
import type { BreadcrumbProps } from 'antd';
import { IconMenuBotConfig } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ConfidenceLearning = React.lazy(() => import('../../features/training/tabs/ConfidenceLearning'));
const TextCorrection = React.lazy(() => import('../../features/training/tabs/TextCorrection'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '학습 데이터 관리', path: '/stt/stt-config/training/list' },
];

const tabs: PageTab[] = [
  { id: 'confidence', label: '신뢰도별 학습', icon: IconMenuBotConfig, component: ConfidenceLearning },
  { id: 'text-correction', label: '문자수정', icon: IconMenuBotConfig, component: TextCorrection },
];

export default function TrainingList() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
