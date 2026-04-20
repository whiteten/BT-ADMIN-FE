import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useGetKnowledge } from '../../features/agent-config/hooks/useKnowledgeQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const KnowledgeBasicInfo = React.lazy(() => import('../../features/agent-config/tabs/KnowledgeBasicInfo'));
const KnowledgeFileList = React.lazy(() => import('../../features/agent-config/tabs/KnowledgeFileList'));
const KnowledgeEvalList = React.lazy(() => import('../../features/agent-config/tabs/KnowledgeEvalList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: KnowledgeBasicInfo },
  { id: 'tab2', label: '문서', icon: IconDocument, component: KnowledgeFileList },
  { id: 'tab3', label: '평가', icon: IconDocument, component: KnowledgeEvalList },
];

export default function KnowledgeDetail() {
  const { documentId } = useParams();
  const { data: knowledge } = useGetKnowledge({ params: { documentId } });

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '관리', path: '/aoe/agent-config' },
    { title: '지식', path: '/aoe/agent-config/knowledge/list' },
    { title: ':documentName', path: `/aoe/agent-config/knowledge/${documentId}` },
  ];

  const params: BreadcrumbProps['params'] = { documentName: knowledge?.documentName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} params={params} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
