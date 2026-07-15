import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ExecutionBasicInfo = React.lazy(() => import('../../features/execution/execution-management/tabs/ExecutionBasicInfo'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: ExecutionBasicInfo }];

export default function ExecutionDetail() {
  const { executionId } = useParams();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '실행', path: '/campaign/execution' },
      { title: '캠페인 실행관리', path: '/campaign/execution/execution-management' },
      { title: ':executionLabel', path: `/campaign/execution/execution-management/${executionId}` },
    ];
    setBreadcrumb(breadcrumb, { executionLabel: '-' });
    return () => clearBreadcrumb();
  }, [executionId, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <PageTabs tabs={tabs} />
    </div>
  );
}
