import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import { IconBubble, IconDocument, IconEvaluation } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const EvaluationBasicInfo = React.lazy(() => import('../../features/bot-config/tabs/EvaluationBasicInfo'));
const EvaluationQuestionList = React.lazy(() => import('../../features/bot-config/tabs/EvaluationQuestionList'));
const EvaluationResultList = React.lazy(() => import('../../features/bot-config/tabs/EvaluationResultList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: EvaluationBasicInfo },
  { id: 'tab2', label: '평가 문장', icon: IconBubble, component: EvaluationQuestionList },
  { id: 'tab3', label: '평가 결과', icon: IconEvaluation, component: EvaluationResultList },
];

export default function EvaluationDetail() {
  const { modelId, evalId } = useParams();
  const { isPublic } = useModelRoute();
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/fca/bot-config' },
    isPublic ? { title: '공용 모델', path: '/fca/global/model' } : { title: '모델', path: '/fca/bot-config/model' },
    isPublic ? { title: '공용 모델 상세', path: `/fca/global/model/${modelId}` } : { title: '모델 상세', path: `/fca/bot-config/model/${modelId}` },
    isPublic ? { title: '평가', path: `/fca/global/model/${modelId}?tab=tab4` } : { title: '평가', path: `/fca/bot-config/model/${modelId}?tab=tab4` },
    isPublic
      ? { title: '평가 상세', path: `/fca/global/model/${modelId}/evaluation/${evalId}` }
      : { title: '평가 상세', path: `/fca/bot-config/model/${modelId}/evaluation/${evalId}` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="평가 편집" breadcrumb={breadcrumb} extra={<ModelToolbar modelId={modelId} />} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
