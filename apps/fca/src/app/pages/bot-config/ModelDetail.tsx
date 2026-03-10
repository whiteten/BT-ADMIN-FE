import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useGetModel } from '../../features/bot-config/hooks/useModelQueries';
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

  const { data: model } = useGetModel({ params: { modelId } });

  const privateBreadcrumb: BreadcrumbProps['items'] = [
    { title: '관리', path: '/fca/bot-config' },
    { title: '모델', path: '/fca/bot-config/model' },
    { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
  ];

  const publicBreadcrumb: BreadcrumbProps['items'] = [
    { title: '공용', path: '/fca/global' },
    { title: '공용 모델', path: '/fca/global/model' },
    { title: ':modelName', path: `/fca/global/model/${modelId}` },
  ];

  const params: BreadcrumbProps['params'] = { modelName: model?.modelName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={isPublic ? publicBreadcrumb : privateBreadcrumb} params={params} extra={<ModelToolbar modelId={modelId} />} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
