import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import ModelToolbar from '../../features/bot-config/components/ModelToolbar';
import { useGetEvaluation, useGetModel } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import { IconBubble, IconDocument, IconEvaluation } from '@/components/custom/Icons';
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
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const { data: model } = useGetModel({ params: { modelId } });
  const { data: evaluation } = useGetEvaluation({ params: { modelId, evalId } });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = isPublic
      ? [
          { title: '공용', path: '/fca/global' },
          { title: '공용 모델', path: '/fca/global/model' },
          { title: ':modelName', path: `/fca/global/model/${modelId}` },
          { title: '평가', path: `/fca/global/model/${modelId}?tab=tab4` },
          { title: ':evaluationName', path: `/fca/global/model/${modelId}/evaluation/${evalId}` },
        ]
      : [
          { title: '관리', path: '/fca/bot-config' },
          { title: '모델', path: '/fca/bot-config/model' },
          { title: ':modelName', path: `/fca/bot-config/model/${modelId}` },
          { title: '평가', path: `/fca/bot-config/model/${modelId}?tab=tab4` },
          { title: ':evaluationName', path: `/fca/bot-config/model/${modelId}/evaluation/${evalId}` },
        ];
    setBreadcrumb(breadcrumb, { modelName: model?.modelName ?? '-', evaluationName: evaluation?.evalName ?? '-' });
    return () => clearBreadcrumb();
  }, [isPublic, modelId, evalId, model?.modelName, evaluation?.evalName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} extra={<ModelToolbar modelId={modelId} />} />
    </div>
  );
}
