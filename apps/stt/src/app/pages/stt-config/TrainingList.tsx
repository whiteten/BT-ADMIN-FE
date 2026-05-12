import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconIntent, IconRetrain } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ConfidenceTraining = React.lazy(() => import('../../features/stt-config/tabs/ConfidenceTraining'));
const TuningSentence = React.lazy(() => import('../../features/stt-config/tabs/TuningSentence'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '학습 데이터 관리', path: '/stt/stt-config/training/list' },
];

const tabs: PageTab[] = [
  { id: 'confidence-training', label: '신뢰도별 학습', icon: IconRetrain, component: ConfidenceTraining },
  { id: 'tuning-sentence', label: '문자수정', icon: IconIntent, component: TuningSentence },
];

export default function TrainingList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
