import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { getMockScheduleManagementDetail } from '../../features/schedule/constants/scheduleManagementMockData';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const ScheduleBasicInfo = React.lazy(() => import('../../features/schedule/tabs/ScheduleBasicInfo'));

const tabs: PageTab[] = [{ id: 'tab1', label: '기본정보', icon: IconDocument, component: ScheduleBasicInfo }];

export default function ScheduleDetail() {
  const { scheduleId } = useParams();
  const schedule = scheduleId ? getMockScheduleManagementDetail(scheduleId) : undefined;
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    const breadcrumb: BreadcrumbProps['items'] = [
      { title: '스케줄', path: '/campaign/schedule' },
      { title: '스케줄 관리', path: '/campaign/schedule/schedule-management' },
      { title: ':scheduleName', path: `/campaign/schedule/schedule-management/${scheduleId}` },
    ];
    setBreadcrumb(breadcrumb, { scheduleName: schedule?.scheduleName ?? '-' });
    return () => clearBreadcrumb();
  }, [scheduleId, schedule?.scheduleName, setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
