import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useGetIntent, useGetModel } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import { IconDocument, IconIntent } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const IntentBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/IntentBasicInfo'));
const IntentSentenceList = React.lazy(() => import('../../features/bot-config/tabs/IntentSentenceList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: IntentBasicInfo },
  { id: 'tab2', label: '의도문장', icon: IconIntent, component: IntentSentenceList },
];

export default function IntentDetail() {
  const { modelId, intentId } = useParams();
  const { isPublic } = useModelRoute();

  const { data: model } = useGetModel({ params: { modelId } });
  const { data: intent } = useGetIntent({ params: { modelId, intentId } });

  const privateBreadcrumb: BreadcrumbProps['items'] = [
    { title: '관리', path: '/fca/bot-config' },
    { title: '모델', path: '/fca/bot-config/model' },
    { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
    { title: '의도', path: `/fca/bot-config/model/${modelId}?tab=tab2` },
    { title: ':intentName', path: `/fca/bot-config/model/${modelId}/intent/${intentId}` },
  ];

  const publicBreadcrumb: BreadcrumbProps['items'] = [
    { title: '공용', path: '/fca/global' },
    { title: '공용 모델', path: '/fca/global/model' },
    { title: ':modelName', path: `/fca/global/model/${modelId}` },
    { title: '의도', path: `/fca/global/model/${modelId}?tab=tab2` },
    { title: ':intentName', path: `/fca/global/model/${modelId}/intent/${intentId}` },
  ];

  const params: BreadcrumbProps['params'] = { modelName: model?.modelName ?? '-', intentName: intent?.intentName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={isPublic ? publicBreadcrumb : privateBreadcrumb} params={params} />
      <PageTabs tabs={tabs} extra={<ModelToolbar modelId={modelId} />} />
    </div>
  );
}
