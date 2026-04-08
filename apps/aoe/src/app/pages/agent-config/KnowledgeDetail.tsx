import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useGetKnowledge } from '../../features/agent-config/hooks/useKnowledgeQueries';
import PageHeader from '@/components/custom/PageHeader';

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
    </div>
  );
}
