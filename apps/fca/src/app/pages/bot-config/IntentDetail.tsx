import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
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
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/fca/bot-config' },
    isPublic ? { title: '공용 모델', path: '/fca/common/models' } : { title: '모델', path: '/fca/bot-config/model' },
    isPublic ? { title: '공용 모델 상세', path: `/fca/common/models/${modelId}` } : { title: '모델 상세', path: `/fca/bot-config/model/${modelId}` },
    isPublic ? { title: '의도', path: `/fca/common/models/${modelId}?tab=tab2` } : { title: '의도', path: `/fca/bot-config/model/${modelId}?tab=tab2` },
    isPublic
      ? { title: '의도 상세', path: `/fca/common/models/${modelId}/intent/${intentId}` }
      : { title: '의도 상세', path: `/fca/bot-config/model/${modelId}/intent/${intentId}` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="의도 편집" breadcrumb={breadcrumb} extra={<ModelToolbar modelId={modelId} />} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
