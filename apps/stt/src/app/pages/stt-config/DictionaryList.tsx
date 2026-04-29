import React from 'react';
import type { BreadcrumbProps } from 'antd';
import { IconEvaluation, IconTag } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const KeywordBoosting = React.lazy(() => import('../../features/stt-config/tabs/KeywordBoosting'));
const SttDictionary = React.lazy(() => import('../../features/stt-config/tabs/SttDictionary'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '사전 관리', path: '/stt/stt-config/dictionary/list' },
];

const tabs: PageTab[] = [
  { id: 'keyword-boosting', label: '키워드 부스팅', icon: IconTag, component: KeywordBoosting },
  { id: 'stt-dictionary', label: '후처리 사전', icon: IconEvaluation, component: SttDictionary },
];

export default function DictionaryList() {
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
