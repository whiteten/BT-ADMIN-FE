import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ScheduleBasicInfoCreate = React.lazy(() => import('../../features/schedule/tabs/ScheduleBasicInfoCreate'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: ScheduleBasicInfoCreate }];

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '스케줄', path: '/campaign/schedule' },
  { title: '스케줄 관리', path: '/campaign/schedule/schedule-management' },
  { title: '스케줄 추가', path: '/campaign/schedule/create' },
];

export default function ScheduleCreate() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
