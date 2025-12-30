import React from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps, Button } from 'antd';
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
  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/bot/bot-config' },
    { title: '모델', path: '/bot/bot-config/model' },
    { title: '모델 상세', path: `/bot/bot-config/model/${modelId}` },
    { title: '평가', path: `/bot/bot-config/model/${modelId}?tab=tab4` },
    { title: '평가 상세', path: `/bot/bot-config/model/${modelId}/evaluation/${evalId}` },
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
      <PageHeader title="평가 편집" breadcrumb={breadcrumb} extra={extra} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
