import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { IconDocument, IconEntity, IconEvaluation, IconFaq, IconIntent, IconRetrain, IconSnapshot } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ModelBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/ModelBasicInfo'));
const ModelIntent = React.lazy(() => import('../../features/bot-config/tabs/ModelIntent'));
const ModelEntity = React.lazy(() => import('../../features/bot-config/tabs/ModelEntity'));
const ModelEvaluation = React.lazy(() => import('../../features/bot-config/tabs/ModelEvaluation'));
const ModelRetrain = React.lazy(() => import('../../features/bot-config/tabs/ModelRetrain'));
const ModelSnapshot = React.lazy(() => import('../../features/bot-config/tabs/ModelSnapshot'));
const ModelFaq = React.lazy(() => import('../../features/bot-config/tabs/ModelFaq'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ModelBasicInfo },
  { id: 'tab2', label: '의도', icon: IconIntent, component: ModelIntent },
  { id: 'tab3', label: '개체', icon: IconEntity, component: ModelEntity },
  { id: 'tab4', label: '평가', icon: IconEvaluation, component: ModelEvaluation },
  { id: 'tab5', label: '재학습', icon: IconRetrain, component: ModelRetrain },
  { id: 'tab6', label: '스냅샷', icon: IconSnapshot, component: ModelSnapshot },
  { id: 'tab7', label: 'FAQ', icon: IconFaq, component: ModelFaq },
];

export default function ModelDetail() {
  const { modelId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '모델', path: '/bot/bot-config/model' },
    { title: '모델 상세', path: `/bot/bot-config/model/${modelId}` },
  ];
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="모델 편집" breadcrumb={breadcrumb} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
