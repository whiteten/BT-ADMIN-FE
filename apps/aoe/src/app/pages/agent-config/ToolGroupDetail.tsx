import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetToolGroups } from '../../features/tool/hooks/useToolQueries';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ToolGroupBasicInfo = React.lazy(() => import('../../features/tool/tabs/ToolGroupBasicInfo'));
const ToolGroupToolList = React.lazy(() => import('../../features/tool/tabs/ToolGroupToolList'));

const tabs: PageTab[] = [
  { id: 'tab1', label: '기본정보', icon: IconDocument, component: ToolGroupBasicInfo },
  { id: 'tab2', label: '도구 목록', icon: IconDocument, component: ToolGroupToolList },
];

export default function ToolGroupDetail() {
  const { groupId } = useParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const { data: groups = [] } = useGetToolGroups();
  const group = groups.find((g) => g.groupId === groupId);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '관리', path: '/aoe/agent-config' },
      { title: '도구', path: '/aoe/agent-config/tool/list' },
      { title: ':groupName', path: `/aoe/agent-config/tool/${groupId}` },
    ];
    setBreadcrumb(breadcrumb, { groupName: group?.groupName ?? '-' });
    return () => clearBreadcrumb();
  }, [groupId, group?.groupName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
