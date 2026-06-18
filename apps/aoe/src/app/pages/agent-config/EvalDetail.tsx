import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetKnowledge, useGetKnowledgeEval } from '../../features/agent-config/hooks/useKnowledgeQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const EvalBasicInfo = React.lazy(() => import('../../features/agent-config/tabs/EvalBasicInfo'));
const EvalExecution = React.lazy(() => import('../../features/agent-config/tabs/EvalExecution'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: EvalBasicInfo },
  { id: 'tab2', label: '평가 결과', icon: IconDocument, component: EvalExecution },
];

export default function EvalDetail() {
  const { documentId, evalId } = useParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { data: knowledge } = useGetKnowledge({ params: { documentId } });
  const { data: evalData } = useGetKnowledgeEval({ params: { documentId, evalId } });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: 'AOE 관리', path: '/aoe/agent-config' },
      { title: '지식', path: '/aoe/agent-config/knowledge/list' },
      { title: ':documentName', path: `/aoe/agent-config/knowledge/${documentId}` },
      { title: ':evalName', path: `/aoe/agent-config/knowledge/${documentId}/eval/${evalId}` },
    ];
    setBreadcrumb(breadcrumb, {
      documentName: knowledge?.documentName ?? '-',
      evalName: evalData?.evalName ?? '-',
    });
    return () => clearBreadcrumb();
  }, [documentId, evalId, knowledge?.documentName, evalData?.evalName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
