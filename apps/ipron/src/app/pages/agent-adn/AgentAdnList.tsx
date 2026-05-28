/**
 * 상담사 로그인번호(ADN) 관리 페이지 (Phase 1 stub).
 * AS-IS SWAT IPR20S3011 마이그레이션 예정.
 */
import { useEffect } from 'react';
import { Empty } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '상담사 관리', path: '/ipron/agent-adn' },
  { title: '상담사', path: '/ipron/agent-adn' },
  { title: '상담사 ADN', path: '/ipron/agent-adn' },
];

export default function AgentAdnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex items-center justify-center h-full">
      <Empty description="상담사 ADN 관리 — Phase 2 구현 예정" />
    </div>
  );
}
