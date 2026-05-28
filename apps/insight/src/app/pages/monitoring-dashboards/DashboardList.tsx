import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Segmented, Tag } from 'antd';
import { Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import DashboardCard from '../../features/monitoring/components/DashboardCard';
import { DOMAIN_LABELS } from '../../features/monitoring/constants/monitoringConstants';
import { useGetDashboards } from '../../features/monitoring/hooks/useDashboardQueries';
import type { DashboardListItem, DomainCode } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '대시보드', path: '/insight/monitoring/dashboards' },
];

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

/** 도메인별 섹션 표시 순서. */
const DOMAIN_SECTIONS: DomainCode[] = ['IE', 'IC', 'IR'];

export default function DashboardList() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: dashboards = [], isLoading } = useGetDashboards();

  // 상태·검색 필터 후 도메인별 그룹화
  const byDomain = useMemo<Record<DomainCode, DashboardListItem[]>>(() => {
    const kw = searchValue.trim().toLowerCase();
    const grouped: Record<DomainCode, DashboardListItem[]> = { IE: [], IC: [], IR: [] };
    dashboards
      .filter((d) => {
        if (status !== 'ALL' && d.status !== status) return false;
        if (!kw) return true;
        return d.dashboardName.toLowerCase().includes(kw) || d.dashboardCode.toLowerCase().includes(kw);
      })
      .forEach((d) => {
        if (grouped[d.domainCode]) grouped[d.domainCode].push(d);
      });
    return grouped;
  }, [dashboards, status, searchValue]);

  const hasAnyMatch = byDomain.IE.length + byDomain.IC.length + byDomain.IR.length > 0;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 필터바 — 다른 모듈(AgentList 등) 동일 컨벤션: 좌측 필터 + 우측 추가 버튼 */}
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={[
              { value: 'ALL', label: '전체' },
              { value: 'PUBLISHED', label: '메뉴 등록' },
              { value: 'DRAFT', label: '초안' },
            ]}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="대시보드 이름·코드 검색" className="w-full max-w-[400px]" allowClear />
        </div>
        <Button type="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => navigate('/insight/monitoring/dashboards/create')}>
          추가
        </Button>
      </div>

      {/* 본문 — 도메인별 3섹션 */}
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : !hasAnyMatch && (searchValue || status !== 'ALL') ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full overflow-y-auto pb-4">
          {DOMAIN_SECTIONS.map((domain) => (
            <DomainSection key={domain} domain={domain} items={byDomain[domain]} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DomainSectionProps {
  domain: DomainCode;
  items: DashboardListItem[];
}

function DomainSection({ domain, items }: DomainSectionProps) {
  const label = DOMAIN_LABELS[domain];

  return (
    <section className="bg-white bt-shadow">
      <div className="flex items-center gap-2 px-7 pt-5 pb-3">
        <Tag color="blue" className="font-mono">
          {domain}
        </Tag>
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[12px] text-[var(--color-bt-fg-muted)]">· {items.length}개</span>
      </div>

      <div className="px-7 pb-5">
        {items.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4">
            {items.map((dashboard) => (
              <DashboardCard key={dashboard.dashboardId} dashboard={dashboard} />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-[12.5px] text-[var(--color-bt-fg-muted)]">{label} 도메인에 등록된 대시보드가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
