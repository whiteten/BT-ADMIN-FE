import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetAoeAgent } from '../../features/bot-config/hooks/useModelQueries';
import { IconFaq } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const AoeFaqList = React.lazy(() => import('../../features/global/tabs/AoeFaqList'));
const tabs: PageTab[] = [{ id: 'tab1', label: 'FAQ', icon: IconFaq, component: AoeFaqList }];

export default function FaqDetail() {
  const { agentId } = useParams();
  const { data: aoeAgent } = useGetAoeAgent({ params: { agentId } });
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '공용', path: '/fca/global' },
      { title: 'AOE 확장', path: '/fca/global/aoe/config' },
      { title: ':agentName', path: `/fca/global/aoe/config/${agentId}/faq` },
    ];
    setBreadcrumb(breadcrumb, { agentName: aoeAgent?.agentName ?? '-' });
    return () => clearBreadcrumb();
  }, [agentId, aoeAgent?.agentName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
