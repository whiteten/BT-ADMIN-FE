import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Segmented, Select, Tag } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import DashboardCard from '../../features/monitoring/components/DashboardCard';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../features/monitoring/constants/monitoringConstants';
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
  const [domain, setDomain] = useState<DomainCode | ''>('');
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
        return d.dashboardName.toLowerCase().includes(kw);
      })
      .forEach((d) => {
        if (grouped[d.domainCode]) grouped[d.domainCode].push(d);
      });
    return grouped;
  }, [dashboards, status, searchValue]);

  const activeSections = domain ? [domain as DomainCode] : DOMAIN_SECTIONS;
  const hasAnyMatch = activeSections.some((d) => byDomain[d].length > 0);
  const isFiltered = !!searchValue || status !== 'ALL';
  const goCreate = () => navigate('/insight/monitoring/dashboards/create');

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
          <Select
            value={domain}
            onChange={(v) => setDomain(v as DomainCode | '')}
            options={[
              { value: '', label: '전체 도메인' },
              { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
              { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
              { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
            ]}
            className="!min-w-[140px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="대시보드 이름 검색…" className="w-full max-w-[300px]" allowClear />
        </div>
        <Button type="primary" onClick={goCreate}>
          + 새 대시보드
        </Button>
      </div>

      {/* 도메인별 섹션 */}
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : !hasAnyMatch && isFiltered ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '조회된 데이터가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full overflow-y-auto pb-4">
          {activeSections.map((d) => (
            <DomainSection key={d} domain={d} items={byDomain[d]} onNew={goCreate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DomainSectionProps {
  domain: DomainCode;
  items: DashboardListItem[];
  onNew: () => void;
}

function DomainSection({ domain, items, onNew }: DomainSectionProps) {
  const label = DOMAIN_LABELS[domain];

  return (
    <section className="bg-white bt-shadow">
      <div className="flex items-center gap-2 px-7 pt-5 pb-3">
        <Tag color={DOMAIN_TAG_COLOR[domain]} className="font-mono !text-sm !font-bold !px-2 !py-0.5">
          {domain}
        </Tag>
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[12px] text-[var(--color-bt-fg-muted)]">· {items.length}개</span>
      </div>

      <div className="px-7 pb-5">
        {items.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
            {items.map((dashboard) => (
              <DashboardCard key={dashboard.dashboardId} dashboard={dashboard} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-[12.5px] text-[var(--color-bt-fg-muted)]">
            <span>{label} 도메인에 등록된 대시보드가 없습니다.</span>
            <Button size="small" onClick={onNew}>
              + 새 대시보드
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
