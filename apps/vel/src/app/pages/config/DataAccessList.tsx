import { useEffect } from 'react';
import { useBreadcrumbStore } from '@/shared-store';

const breadcrumb = [{ title: 'VEL' }, { title: '설정관리' }, { title: '데이터접근관리', path: '/vel/config/data-access' }];

export default function DataAccessList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full gap-2">
          <h2 className="text-lg font-semibold text-gray-800">데이터접근관리</h2>
        </header>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">준비 중입니다.</div>
      </div>
    </div>
  );
}
