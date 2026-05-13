import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useGetA2A } from '../../features/a2a/hooks/useA2aQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const A2ABasicInfo = React.lazy(() => import('../../features/a2a/tabs/A2ABasicInfo'));
const A2ASkillList = React.lazy(() => import('../../features/a2a/tabs/A2ASkillList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: A2ABasicInfo },
  { id: 'tab2', label: 'Skills', icon: IconDocument, component: A2ASkillList },
];

export default function A2ADetail() {
  const { a2aId } = useParams();
  const { data: a2a } = useGetA2A({ params: { a2aId }, queryOptions: { enabled: !!a2aId } });

  const breadcrumb: BreadcrumbProps['items'] = [{ title: '관리', path: '/aoe/agent-config' }, { title: 'A2A', path: '/aoe/agent-config/a2a/list' }, { title: ':agentName' }];

  const params: BreadcrumbProps['params'] = { agentName: a2a?.agentName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} params={params} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
