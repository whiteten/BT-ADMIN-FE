import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps, Button } from 'antd';
import { IconDocument, IconEntity, IconEvaluation, IconIntent, IconRetrain, IconSnapshot } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ModelBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/ModelBasicInfo'));
const ModelIntentList = React.lazy(() => import('../../features/bot-config/tabs/ModelIntentList'));
const ModelEntityList = React.lazy(() => import('../../features/bot-config/tabs/ModelEntityList'));
const ModelEvaluationList = React.lazy(() => import('../../features/bot-config/tabs/ModelEvaluationList'));
const ModelRetrain = React.lazy(() => import('../../features/bot-config/tabs/ModelRetrain'));
const ModelSnapshot = React.lazy(() => import('../../features/bot-config/tabs/ModelSnapshot'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ModelBasicInfo },
  { id: 'tab2', label: '의도', icon: IconIntent, component: ModelIntentList },
  { id: 'tab3', label: '개체', icon: IconEntity, component: ModelEntityList },
  { id: 'tab4', label: '평가', icon: IconEvaluation, component: ModelEvaluationList },
  { id: 'tab5', label: '재학습', icon: IconRetrain, component: ModelRetrain },
  { id: 'tab6', label: '스냅샷', icon: IconSnapshot, component: ModelSnapshot },
];

export default function ModelDetail() {
  const { modelId } = useParams();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '모델', path: '/bot/bot-config/model' },
    { title: '모델 상세', path: `/bot/bot-config/model/${modelId}` },
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
      <PageHeader title="모델 편집" breadcrumb={breadcrumb} extra={extra} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
