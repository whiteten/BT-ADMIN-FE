import React from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useGetMcpList } from '../../features/mcp/hooks/useMcpQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const McpBasicInfo = React.lazy(() => import('../../features/mcp/tabs/McpBasicInfo'));
const McpApiList = React.lazy(() => import('../../features/mcp/tabs/McpApiList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: McpBasicInfo },
  { id: 'tab2', label: '등록된 API', icon: IconDocument, component: McpApiList },
];

export default function McpDetail() {
  const { mcpId } = useParams();
  const { data: mcpList = [] } = useGetMcpList();
  const mcp = mcpList.find((m) => m.mcpId === mcpId);

  const breadcrumb: BreadcrumbProps['items'] = [{ title: '관리', path: '/aoe/agent-config' }, { title: 'MCP', path: '/aoe/agent-config/mcp/list' }, { title: ':serverName' }];

  const params: BreadcrumbProps['params'] = { serverName: mcp?.serverName ?? '-' };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} params={params} />
      <PageTabs tabs={tabs} />
    </div>
  );
}
