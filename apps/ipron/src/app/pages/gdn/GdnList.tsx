/**
 * 그룹DN 통합 관리 페이지 (Phase 1 stub).
 * ACD + CTI Queue + SIP TRUNK 3 메뉴 통폐합 예정.
 */
import { useEffect } from 'react';
import { Empty } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/gdn' },
  { title: '그룹DN', path: '/ipron/gdn' },
];

export default function GdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex items-center justify-center h-full">
      <Empty description="그룹DN 통합 관리 — Phase 2 구현 예정" />
    </div>
  );
}
