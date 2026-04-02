import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useGetAgent } from '../../features/agent-config/hooks/useAgentQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const AgentBasicInfo = React.lazy(() => import('../../features/agent-config/tabs/AgentBasicInfo'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: AgentBasicInfo }];

export default function AgentDetail() {
  const { agentId } = useParams();
  const { data: agent } = useGetAgent({ params: { agentId } });

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '관리', path: '/aoe/agent-config' },
    { title: 'Agent', path: '/aoe/agent-config/agent/list' },
    { title: ':agentName', path: `/aoe/agent-config/agent/${agentId}` },
  ];

  const params: BreadcrumbProps['params'] = { agentName: agent?.agentName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} params={params} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
