import { useEffect } from 'react';
import { type BreadcrumbProps, Tabs } from 'antd';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { AOE_PERM } from '../../constants/permissions';
import DbConnectionTab from '../../features/data-provider/components/DbConnectionTab';
import DbToolTab from '../../features/data-provider/components/DbToolTab';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '데이터 제공', path: '/aoe/data-provider/db' },
  { title: 'DB 연동 관리', path: '/aoe/data-provider/db' },
];

export default function DataProviderDb() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.DATA_PROVIDER_WRITE));

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col w-full h-full bg-white bt-shadow px-7 py-5">
      <Tabs
        defaultActiveKey="connection"
        className="w-full h-full [&_.ant-tabs-body]:h-full [&_.ant-tabs-body-holder]:flex-1 [&_.ant-tabs-content]:h-full"
        items={[
          { key: 'connection', label: 'DB Connection', children: <DbConnectionTab canWrite={canWrite} /> },
          { key: 'tool', label: 'DB Tool', children: <DbToolTab canWrite={canWrite} /> },
        ]}
      />
    </div>
  );
}
