import { useEffect, useMemo, useState } from 'react';
import { type BreadcrumbProps, Button, Input, Segmented } from 'antd';
import { Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import DashboardCard from '../../features/monitoring/components/DashboardCard';
import DashboardCreateModal from '../../features/monitoring/components/DashboardCreateModal';
import { DOMAIN_LABELS } from '../../features/monitoring/constants/monitoringConstants';
import { useGetDashboards } from '../../features/monitoring/hooks/useDashboardQueries';
import { MOCK_DASHBOARDS } from '../../features/monitoring/mocks/mockDashboards';
import type { DomainCode } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '인사이트' }, { title: '모니터링' }, { title: '대시보드', path: '/insight/monitoring/dashboards' }];

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

export default function DashboardList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [domain, setDomain] = useState<DomainCode | ''>('');
  const [searchValue, setSearchValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: rawDashboards = [], isFetching } = useGetDashboards({
    params: {
      status: status !== 'ALL' ? status : undefined,
      domain: domain || undefined,
    },
  });

  // BE 미구현 상태 — mock data fallback (BE 구현 후 제거)
  const dashboards = rawDashboards.length > 0 ? rawDashboards : MOCK_DASHBOARDS;

  const filtered = useMemo(() => {
    let result = dashboards;
    if (status !== 'ALL') {
      result = result.filter((d) => d.status === status);
    }
    if (domain) {
      result = result.filter((d) => d.domainCode === domain);
    }
    if (searchValue.trim()) {
      const kw = searchValue.toLowerCase();
      result = result.filter((d) => d.dashboardName.toLowerCase().includes(kw) || d.dashboardCode.toLowerCase().includes(kw));
    }
    return result;
  }, [dashboards, status, domain, searchValue]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 필터 바 */}
      <div className="flex items-center justify-between gap-4 w-full bg-white bt-shadow px-7 py-5">
        <div className="flex items-center gap-3">
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={[
              { value: 'ALL', label: '전체' },
              { value: 'PUBLISHED', label: '메뉴 등록' },
              { value: 'DRAFT', label: '초안' },
            ]}
          />
          <Segmented
            value={domain || 'ALL'}
            onChange={(v) => setDomain((v === 'ALL' ? '' : v) as DomainCode | '')}
            options={[
              { value: 'ALL', label: '전체 도메인' },
              { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
              { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
              { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
            ]}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="대시보드 이름·코드 검색…" className="w-full max-w-[300px]" allowClear />
        </div>
        <Button type="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>
          새 대시보드
        </Button>
      </div>

      {/* 카드 그리드 */}
      {isFetching && rawDashboards.length === 0 ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 w-full overflow-y-auto">
          {filtered.map((dashboard) => (
            <DashboardCard key={dashboard.dashboardId} dashboard={dashboard} />
          ))}
          {/* 신규 카드 placeholder — 시안 §2 그리드 끝 위치 */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center justify-center min-h-[180px] rounded border-2 border-dashed border-[var(--color-bt-border)] bg-white/40 hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/30 transition-colors gap-2"
          >
            <Plus className="w-5 h-5 text-[var(--color-bt-fg-muted)] group-hover:text-[var(--color-bt-primary)]" />
            <span className="text-[12px] font-medium text-[var(--color-bt-fg-muted)] hover:text-[var(--color-bt-primary)]">새 대시보드</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-white bt-shadow gap-4">
          <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '대시보드가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
          {!searchValue && (
            <Button type="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>
              새 대시보드 만들기
            </Button>
          )}
        </div>
      )}

      {/* 새 대시보드 모달 (§2-A) */}
      <DashboardCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
