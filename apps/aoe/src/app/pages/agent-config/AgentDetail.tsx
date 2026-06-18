import React, { Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetAgent } from '../../features/agent-config/hooks/useAgentQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const AgentBasicInfo = React.lazy(() => import('../../features/agent-config/tabs/AgentBasicInfo'));

export default function AgentDetail() {
  const { agentId } = useParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { data: agent } = useGetAgent({ params: { agentId } });

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: 'AOE 관리', path: '/aoe/agent-config' },
      { title: 'Agent', path: '/aoe/agent-config/agent/list' },
      { title: ':agentName', path: `/aoe/agent-config/agent/${agentId}` },
    ];
    setBreadcrumb(breadcrumb, { agentName: agent?.agentName ?? '-' });
    return () => clearBreadcrumb();
  }, [agentId, agent?.agentName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <Suspense fallback={<FallbackSpinner />}>
        <AgentBasicInfo />
      </Suspense>
    </div>
  );
}
