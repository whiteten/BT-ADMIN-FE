import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import { IconDocument, IconEntity, IconEvaluation, IconIntent, IconRetrain, IconSnapshot } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ModelBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/ModelBasicInfo'));
const ModelIntentList = React.lazy(() => import('../../features/bot-config/tabs/ModelIntentList'));
const ModelEntityList = React.lazy(() => import('../../features/bot-config/tabs/ModelEntityList'));
const ModelEvaluationList = React.lazy(() => import('../../features/bot-config/tabs/ModelEvaluationList'));
const ModelRetrainList = React.lazy(() => import('../../features/bot-config/tabs/ModelRetrainList'));
const ModelSnapshotList = React.lazy(() => import('../../features/bot-config/tabs/ModelSnapshotList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ModelBasicInfo },
  { id: 'tab2', label: '의도', icon: IconIntent, component: ModelIntentList },
  { id: 'tab3', label: '개체', icon: IconEntity, component: ModelEntityList },
  { id: 'tab4', label: '평가', icon: IconEvaluation, component: ModelEvaluationList },
  { id: 'tab5', label: '재학습', icon: IconRetrain, component: ModelRetrainList },
  { id: 'tab6', label: '스냅샷', icon: IconSnapshot, component: ModelSnapshotList },
];

export default function ModelDetail() {
  const { modelId } = useParams();
  const { isPublic } = useModelRoute();

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/fca/bot-config' },
    isPublic ? { title: '공용 모델', path: '/fca/common/models' } : { title: '모델', path: '/fca/bot-config/model' },
    isPublic ? { title: '공용 모델 상세', path: `/fca/common/models/${modelId}` } : { title: '모델 상세', path: `/fca/bot-config/model/${modelId}` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title={isPublic ? '공용 모델 편집' : '모델 편집'} breadcrumb={breadcrumb} extra={<ModelToolbar modelId={modelId} />} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
