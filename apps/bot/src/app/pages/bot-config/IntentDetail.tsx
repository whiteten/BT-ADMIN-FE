import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps, Button } from 'antd';
import { IconDocument, IconIntent } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const IntentBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/IntentBasicInfo'));
const IntentSentence = React.lazy(() => import('../../features/bot-config/tabs/IntentSentence'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: IntentBasicInfo },
  { id: 'tab2', label: '의도문장', icon: IconIntent, component: IntentSentence },
];

export default function IntentDetail() {
  const { modelId, intentId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '모델', path: '/bot/bot-config/model' },
    { title: '모델 상세', path: `/bot/bot-config/model/${modelId}` },
    { title: '의도', path: `/bot/bot-config/model/${modelId}/intent` },
    { title: '의도 상세', path: `/bot/bot-config/model/${modelId}/intent/${intentId}` },
  ];

  const extra = (
    <div className="flex justify-end">
      <div className="flex gap-2">
        <Button variant="solid">모델 학습</Button>
        <Button variant="solid">모델 배포</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="의도 편집" breadcrumb={breadcrumb} extra={extra} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
