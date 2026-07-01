import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Drawer, Input } from 'antd';
import { ChevronDown, Hash, Layers, type LucideIcon, Menu, PenLine, Plus, Search, SlidersHorizontal, Tags } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import { isBaseTag } from '../../components/statTag';
import DashboardRow from '../../features/monitoring/components/DashboardRow';
import { useGetDashboards } from '../../features/monitoring/hooks/useDashboardQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '대시보드', path: '/insight/monitoring/dashboards' },
];

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
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  // 좁은 화면(레일 숨김) 전용 필터 드로어
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: dashboards = [], isLoading } = useGetDashboards();

  // 1) 검색만 적용 — 상태 탭 건수 기준.
  // 검색은 통합검색/메뉴검색과 동일한 fuzzy 매칭(초성·자모 지원). 제목 + 태그 통합 대상.
  const searchFiltered = useMemo(() => fuzzyFilter(searchValue, dashboards, (d) => `${d.dashboardName} ${(d.tags ?? []).join(' ')}`), [dashboards, searchValue]);

  // 상태 탭별 건수 (검색 반영) — 메뉴 등록 여부 기준 (행 태그와 일치)
  const statusCounts = useMemo<Record<StatusFilter, number>>(
    () => ({
      ALL: searchFiltered.length,
      PUBLISHED: searchFiltered.filter((d) => d.menuRegistered).length,
      DRAFT: searchFiltered.filter((d) => !d.menuRegistered).length,
    }),
    [searchFiltered],
  );

  // 2) 상태 적용 — 태그 집계 / 태그 필터의 가시 범위 기준
  const statusFiltered = useMemo(() => {
    return searchFiltered.filter((d) => {
      if (status === 'PUBLISHED') return d.menuRegistered;
      if (status === 'DRAFT') return !d.menuRegistered;
      return true;
    });
  }, [searchFiltered, status]);

  // 태그 집계 (빈도 내림차순) — 현재 검색/상태 적용된 가시 목록 기준
  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    statusFiltered.forEach((d) => (d.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [statusFiltered]);

  // 등록된 태그가 있으면 필터를 최초 1회 자동 펼침 (이후 수동 토글 존중)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenedRef.current && sortedTags.length > 0) {
      autoOpenedRef.current = true;
      setFilterOpen(true);
    }
  }, [sortedTags]);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  // 3) 태그 적용 (AND) — 도메인 건수 + 목록 기준
  const tagFiltered = useMemo(() => {
    if (!selectedTags.size) return statusFiltered;
    return statusFiltered.filter((d) => {
      const tags = d.tags ?? [];
      return [...selectedTags].every((t) => tags.includes(t));
    });
  }, [statusFiltered, selectedTags]);

  // 상단 표기 명칭 — 활성 범위(상태) 조합. 미선택이면 '전체'
  const rangeParts: string[] = [];
  if (status !== 'ALL') rangeParts.push(STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '');
  const rangeLabel = rangeParts.filter(Boolean).join(' · ') || '전체';

  const handleNew = () => navigate('/insight/monitoring/dashboards/create');

  // 활성 필터 수 — 좁은 화면 '필터' 버튼 뱃지
  const activeFilterCount = selectedTags.size + (status !== 'ALL' ? 1 : 0);

  // 필터 본문(태그 + 상태 + 도메인) — 넓은 화면 레일 / 좁은 화면 드로어 공용
  const renderFilters = () => (
    <div className="flex flex-1 flex-col gap-4 overflow-auto min-h-0">
      {/* 태그 필터 (접이식) */}
      <div className="rounded-md bg-gray-50">
        <button type="button" className="flex w-full items-center justify-between px-2.5 py-2 select-none" onClick={() => setFilterOpen((v) => !v)}>
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            <Tags className="size-3.5" />
            태그 필터
            {selectedTags.size > 0 && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{selectedTags.size}</span>}
          </span>
          <span className="flex items-center gap-2">
            {selectedTags.size > 0 && (
              <span
                className="text-xs text-[var(--color-bt-primary)] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTags(new Set());
                }}
              >
                초기화
              </span>
            )}
            <ChevronDown className={`size-4 text-gray-400 transition-transform ${filterOpen ? '' : '-rotate-90'}`} />
          </span>
        </button>
        {filterOpen && (
          <div className="px-2.5 pb-2.5">
            {sortedTags.length === 0 ? (
              <div className="py-1 text-[11px] text-gray-400">등록된 태그가 없습니다.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-auto">
                {sortedTags.map(([t]) => {
                  const on = selectedTags.has(t);
                  const base = isBaseTag(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`inline-flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-xs transition ${
                        on ? 'border-transparent bg-[var(--color-bt-primary)] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {base && <Hash size={11} strokeWidth={2.75} className={on ? 'text-white' : 'text-[var(--color-bt-primary)]'} />}
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 상태 필터 */}
      <div>
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">상태</div>
        <div className="flex flex-col gap-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <RailButton key={opt.value} active={status === opt.value} icon={opt.icon} label={opt.label} count={statusCounts[opt.value]} onClick={() => setStatus(opt.value)} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 좁은 화면 전용 상단 툴바 — 레일 숨김 시 검색 + 필터(드로어) + 추가 */}
      <div className="flex lg:hidden items-center gap-2 w-full bg-white bt-shadow px-4 py-3">
        <Input
          allowClear
          prefix={<Search className="size-4 text-gray-400" />}
          placeholder="대시보드 검색"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="flex-1"
        />
        <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setFilterDrawerOpen(true)}>
          필터
          {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </Button>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleNew} />
      </div>

      {/* 보고서 관리와 동일한 2분할: 좌측 검색+필터 레일 박스 / 우측 목록 박스 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 필터 레일 — 넓은 화면(lg+)만 표시 */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col gap-3 bg-white bt-shadow p-4 min-h-0">
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

          {renderFilters()}
        </div>

        {/* 우측: 대시보드 목록 — 카드 그리드(반응형 auto-fill, 폭 줄면 1열까지) */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <FallbackSpinner />
            </div>
          ) : tagFiltered.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <NoData
                message={searchValue ? `"${searchValue}" 검색 결과 없음` : activeFilterCount ? '필터 결과 없음' : '조회된 데이터가 없습니다.'}
                iconSize={50}
                fontSize="text-lg"
                gap={2}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-auto">
              <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-[#e9ebec] bg-white">
                {/* 범위 헤더 (sticky) */}
                <div className="sticky top-0 z-[1] flex items-center gap-2 rounded-t-lg border-b border-[#e9ebec] bg-white px-4 py-2.5">
                  <span className="text-[13px] font-semibold">{rangeLabel}</span>
                  <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{tagFiltered.length}</span>
                </div>
                {/* 본문 — 반응형 카드 그리드 (auto-fill: 폭에 따라 다열→1열) */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                  {tagFiltered.map((dashboard) => (
                    <div key={dashboard.dashboardId} className="min-w-0 border-r border-[#e9ebec]">
                      <DashboardRow dashboard={dashboard} query={searchValue} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 좁은 화면 전용 필터 드로어 */}
      <Drawer title="필터" placement="left" width={320} open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} styles={{ body: { padding: 16 } }}>
        {renderFilters()}
      </Drawer>
    </div>
  );
}

interface RailButtonProps {
  active: boolean;
  label: string;
  count: number;
  dot?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  onClick: () => void;
}

function RailButton({ active, label, count, dot, icon: Icon, badge, onClick }: RailButtonProps) {
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
        {dot ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} /> : null}
        {badge ?? (Icon ? <Icon size={14} className={cn('shrink-0', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')} /> : null)}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('shrink-0 text-xs tabular-nums', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')}>{count}</span>
    </button>
  );
}
