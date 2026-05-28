/**
 * 스킬셋 관리 페이지 (Phase 1 stub).
 * AS-IS SWAT IPR20S5010 마이그레이션 예정.
 */
import { useEffect } from 'react';
import { Empty } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '상담사 관리', path: '/ipron/skillset-master' },
  { title: '스킬 관리', path: '/ipron/skillset-master' },
  { title: '스킬셋 관리', path: '/ipron/skillset-master' },
];

export default function SkillsetMasterList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex items-center justify-center h-full">
      <Empty description="스킬셋 관리 — Phase 2 구현 예정" />
    </div>
  );
}
