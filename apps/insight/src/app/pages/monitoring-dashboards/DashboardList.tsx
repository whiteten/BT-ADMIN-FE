import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Tag } from 'antd';
import { Layers, type LucideIcon, Menu, PenLine, Plus, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import DashboardRow from '../../features/monitoring/components/DashboardRow';
import { DOMAIN_LABELS } from '../../features/monitoring/constants/monitoringConstants';
import { useGetDashboards } from '../../features/monitoring/hooks/useDashboardQueries';
import type { DashboardListItem, DomainCode } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '대시보드', path: '/insight/monitoring/dashboards' },
];

// 도메인 섹션 순서 — 추후 도메인 확장 시 이 배열만 늘리면 레일·그룹이 함께 확장된다.
const DOMAIN_SECTIONS: DomainCode[] = ['IE', 'IC', 'IR'];
// 도메인 태그(antd preset) 색.
const DOMAIN_TAG_COLOR: Record<string, string> = { IE: 'blue', IC: 'green', IR: 'orange' };
// 레일 도메인 점 색상 / 패널 강조선 (antd Tag 색과 동일 계열). 미정의 도메인은 회색 fallback.
const DOMAIN_DOT_COLOR: Record<string, string> = { IE: '#1677ff', IC: '#389e0d', IR: '#d46b08' };
// 도메인 컬럼 헤더 배경 — 카테고리 구분용이되 색감은 최소화(거의 중성에 살짝 도메인 힌트). 미정의 도메인은 회색 fallback.
const DOMAIN_SOFT_BG: Record<string, string> = { IE: '#f7fafc', IC: '#f7fbf8', IR: '#fcfaf7' };

const STATUS_OPTIONS: { value: StatusFilter; label: string; icon: LucideIcon }[] = [
  { value: 'ALL', label: '전체', icon: Layers },
  { value: 'PUBLISHED', label: '메뉴 등록', icon: Menu },
  { value: 'DRAFT', label: '초안', icon: PenLine },
];

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

  // 1) 검색만 적용 (상태/도메인 미적용) — 상태 탭 건수 기준.
  // 검색은 통합검색/메뉴검색과 동일한 fuzzy 매칭(초성·자모 지원).
  const visibleBase = useMemo(() => fuzzyFilter(searchValue, dashboards, (d) => d.dashboardName), [dashboards, searchValue]);

  // 상태 탭별 건수 (검색 반영) — 메뉴 등록 여부 기준 (행 태그와 일치)
  const statusCounts = useMemo<Record<StatusFilter, number>>(
    () => ({
      ALL: visibleBase.length,
      PUBLISHED: visibleBase.filter((d) => d.menuRegistered).length,
      DRAFT: visibleBase.filter((d) => !d.menuRegistered).length,
    }),
    [visibleBase],
  );

  // 2) 상태 적용 (도메인 미적용) — 도메인 건수 + 목록 기준
  const statusFiltered = useMemo(() => {
    return visibleBase.filter((d) => {
      if (status === 'PUBLISHED') return d.menuRegistered;
      if (status === 'DRAFT') return !d.menuRegistered;
      return true;
    });
  }, [visibleBase, status]);

  // 도메인별 건수 (레일 배지) — 전체 + 도메인별
  const domainCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { ALL: statusFiltered.length };
    DOMAIN_SECTIONS.forEach((d) => (counts[d] = 0));
    statusFiltered.forEach((d) => {
      if (counts[d.domainCode] != null) counts[d.domainCode] += 1;
    });
    return counts;
  }, [statusFiltered]);

  // 도메인 그룹화 (목록 렌더) — DOMAIN_SECTIONS 기반 동적 초기화.
  const byDomain = useMemo<Record<string, DashboardListItem[]>>(() => {
    const grouped: Record<string, DashboardListItem[]> = {};
    DOMAIN_SECTIONS.forEach((d) => (grouped[d] = []));
    statusFiltered.forEach((d) => {
      (grouped[d.domainCode] ??= []).push(d);
    });
    return grouped;
  }, [statusFiltered]);

  const totalVisible = (domain ? [domain] : DOMAIN_SECTIONS).reduce((sum, d) => sum + byDomain[d].length, 0);

  // 칸반 컬럼 정의 — 전체면 도메인별 컬럼, 도메인 필터 시 선택 도메인을 N개 컬럼으로 균등 분산(레이아웃 일관)
  const colCount = DOMAIN_SECTIONS.length;
  const columns: { key: string; domain: DomainCode; items: DashboardListItem[] }[] = domain
    ? Array.from({ length: colCount }, (_, i) => ({
        key: `${domain}-${i}`,
        domain,
        items: byDomain[domain].filter((_, idx) => idx % colCount === i),
      }))
    : DOMAIN_SECTIONS.map((d) => ({ key: d, domain: d, items: byDomain[d] }));

  const handleNew = () => navigate('/insight/monitoring/dashboards/create');

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 보고서 관리와 동일한 2분할: 좌측 검색+필터 레일 박스 / 우측 목록 박스 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 필터 레일 */}
        <div className="flex w-[340px] shrink-0 flex-col gap-3 bg-white bt-shadow p-4 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="대시보드 검색"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleNew}>
              추가
            </Button>
          </div>

          <div className="border-t border-gray-200" />

          {/* 필터 레일 — 상태 + 도메인 (스크롤) */}
          <div className="flex flex-1 flex-col gap-4 overflow-auto min-h-0">
            {/* 상태 필터 */}
            <div>
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">상태</div>
              <div className="flex flex-col gap-0.5">
                {STATUS_OPTIONS.map((opt) => (
                  <RailButton
                    key={opt.value}
                    active={status === opt.value}
                    icon={opt.icon}
                    label={opt.label}
                    count={statusCounts[opt.value]}
                    onClick={() => setStatus(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* 도메인 필터 */}
            <div>
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">도메인</div>
              <div className="flex flex-col gap-0.5">
                <RailButton active={domain === ''} dot="#868e96" label="전체" count={domainCounts.ALL} onClick={() => setDomain('')} />
                {DOMAIN_SECTIONS.map((d) => (
                  <RailButton
                    key={d}
                    active={domain === d}
                    dot={DOMAIN_DOT_COLOR[d] ?? '#868e96'}
                    label={`${d} ${DOMAIN_LABELS[d] ?? d}`}
                    count={domainCounts[d] ?? 0}
                    onClick={() => setDomain(d)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 대시보드 목록 */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col bg-white bt-shadow">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <FallbackSpinner />
            </div>
          ) : totalVisible === 0 ? (
            <div className="flex h-full w-full items-center justify-center">
              <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '조회된 데이터가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : (
            // 칸반 그리드 — 도메인(카테고리)별 독립 패널 분리(테두리+상단 강조선+여백)로 영역 구분감 강화.
            // 전체: 컬럼별 도메인 헤더 / 도메인 필터: 합친 단일 헤더(총 건수) + 아래만 그리드 분산
            <div className="flex flex-1 flex-col overflow-auto p-3">
              {domain && (
                <div
                  className="sticky top-0 z-[2] mb-3 flex shrink-0 items-center gap-2 rounded-lg border border-[#e9ebec] border-l-4 px-4 py-2.5"
                  style={{ background: DOMAIN_SOFT_BG[domain] ?? '#fafbfc', borderLeftColor: DOMAIN_DOT_COLOR[domain] ?? '#868e96' }}
                >
                  <Tag
                    color={DOMAIN_TAG_COLOR[domain]}
                    className="!m-0 font-mono !rounded-md !border !border-solid !px-2 !py-0.5 !text-xs !font-bold"
                    style={{ borderColor: DOMAIN_DOT_COLOR[domain] ?? '#868e96' }}
                  >
                    {domain}
                  </Tag>
                  <span className="text-[13px] font-semibold">{DOMAIN_LABELS[domain] ?? domain}</span>
                  <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{byDomain[domain].length}</span>
                </div>
              )}
              <div className="grid flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(280px, 1fr))` }}>
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="flex min-w-0 flex-col rounded-lg border border-[#e9ebec] bg-white"
                    style={{ borderTopColor: DOMAIN_DOT_COLOR[col.domain] ?? '#868e96', borderTopWidth: 2 }}
                  >
                    {/* 전체일 때만 컬럼별 도메인 헤더 노출 (필터 시엔 위 합친 헤더가 담당) */}
                    {!domain && (
                      <div
                        className="sticky top-0 z-[1] flex items-center gap-2 rounded-t-md border-b border-[#e9ebec] px-4 py-2.5"
                        style={{ background: DOMAIN_SOFT_BG[col.domain] ?? '#fafbfc' }}
                      >
                        <Tag
                          color={DOMAIN_TAG_COLOR[col.domain]}
                          className="!m-0 font-mono !rounded-md !border !border-solid !px-2 !py-0.5 !text-xs !font-bold"
                          style={{ borderColor: DOMAIN_DOT_COLOR[col.domain] ?? '#868e96' }}
                        >
                          {col.domain}
                        </Tag>
                        <span className="text-[13px] font-semibold">{DOMAIN_LABELS[col.domain] ?? col.domain}</span>
                        <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{col.items.length}</span>
                      </div>
                    )}
                    {/* 컬럼 행 목록 */}
                    {col.items.length > 0
                      ? col.items.map((dashboard) => <DashboardRow key={dashboard.dashboardId} dashboard={dashboard} query={searchValue} />)
                      : !domain && <div className="px-4 py-8 text-center text-xs text-[var(--color-bt-fg-muted)]">조건에 맞는 대시보드가 없습니다.</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RailButtonProps {
  active: boolean;
  label: string;
  count: number;
  dot?: string;
  icon?: LucideIcon;
  onClick: () => void;
}

function RailButton({ active, label, count, dot, icon: Icon, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
        active ? 'bg-[var(--color-bt-primary-soft)] font-semibold text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg)] hover:bg-[#f0f3f7]',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {Icon ? (
          <Icon size={14} className={cn('shrink-0', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')} />
        ) : dot ? (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('shrink-0 text-xs tabular-nums', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')}>{count}</span>
    </button>
  );
}
