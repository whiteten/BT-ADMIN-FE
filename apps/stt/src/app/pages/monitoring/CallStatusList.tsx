import { useEffect } from 'react';
import { type BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 모니터링', path: '/stt/stt-monitoring' },
  { title: '콜 현황', path: '/stt/stt-monitoring/call/list' },
];

export default function CallStatusList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return <div className="flex flex-col gap-4 w-full h-full" />;
}
