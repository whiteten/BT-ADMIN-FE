import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useGetModel } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import { IconDocument, IconEntity, IconEvaluation, IconIntent, IconRetrain, IconSnapshot, IconTag } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ModelBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/ModelBasicInfo'));
const ModelIntentList = React.lazy(() => import('../../features/bot-config/tabs/ModelIntentList'));
const ModelEntityList = React.lazy(() => import('../../features/bot-config/tabs/ModelEntityList'));
const ModelEvaluationList = React.lazy(() => import('../../features/bot-config/tabs/ModelEvaluationList'));
const ModelRetrainList = React.lazy(() => import('../../features/bot-config/tabs/ModelRetrainList'));
const ModelSnapshotList = React.lazy(() => import('../../features/bot-config/tabs/ModelSnapshotList'));
const ModelKeywordList = React.lazy(() => import('../../features/bot-config/tabs/ModelKeywordList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ModelBasicInfo },
  { id: 'tab2', label: '의도', icon: IconIntent, component: ModelIntentList },
  { id: 'tab3', label: '개체', icon: IconEntity, component: ModelEntityList },
  { id: 'tab4', label: '키워드', icon: IconTag, component: ModelKeywordList },
  { id: 'tab5', label: '평가', icon: IconEvaluation, component: ModelEvaluationList },
  { id: 'tab6', label: '재학습', icon: IconRetrain, component: ModelRetrainList },
  { id: 'tab7', label: '스냅샷', icon: IconSnapshot, component: ModelSnapshotList },
];

export default function ModelDetail() {
  const { modelId } = useParams();
  const { isPublic } = useModelRoute();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: model } = useGetModel({ params: { modelId } });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = isPublic
      ? [
          { title: '공용', path: '/fca/global' },
          { title: '공용 모델', path: '/fca/global/model' },
          { title: ':modelName', path: `/fca/global/model/${modelId}` },
        ]
      : [
          { title: '관리', path: '/fca/bot-config' },
          { title: '모델', path: '/fca/bot-config/model' },
          { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
        ];
    setBreadcrumb(breadcrumb, { modelName: model?.modelName ?? '-' });
    return () => clearBreadcrumb();
  }, [isPublic, modelId, model?.modelName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} extra={<ModelToolbar modelId={modelId} />} />
    </div>
  );
}
