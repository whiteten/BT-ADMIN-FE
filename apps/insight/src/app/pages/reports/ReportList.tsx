import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Drawer, Input, Tooltip } from 'antd';
import { ChevronDown, Hash, Layers, type LucideIcon, Menu, Plus, Search, Share2, SlidersHorizontal, Tags, User } from 'lucide-react';
import { type MenuConfig, type MenuItem, useAuthStore, useBreadcrumbStore, useMenuStore, useOperatorScopeStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import { isBaseTag } from '../../components/statTag';
import ReportRow from '../../features/report/components/ReportRow';
import { useGetReports } from '../../features/report/hooks/useReportQueries';
import type { ReportListItem } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { cn } from '@/lib/utils';

type OwnershipFilter = 'ALL' | 'MINE' | 'PUBLISHED' | 'SYSTEM';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/insight/statistics' },
  { title: '보고서 관리', path: '/insight/statistics/reports' },
];

const OWNERSHIP_OPTIONS: { value: OwnershipFilter; label: string; icon: LucideIcon }[] = [
  { value: 'ALL', label: '전체', icon: Layers },
  { value: 'MINE', label: '내 보고서', icon: User },
  { value: 'PUBLISHED', label: '메뉴 등록', icon: Menu },
  { value: 'SYSTEM', label: '공유', icon: Share2 },
];

/**
 * 메뉴로 등록된 보고서 reportId 집합 추출.
 * 보고서는 QuerySelector 패턴으로 `reports/view?reportId={id}` 형태로 메뉴 path 에 합성 저장된다
 * (화면커스터마이징_queryString메뉴분기 가이드). host 가 부팅 시 적재한 메뉴 store 를 그대로 활용.
 */
function collectRegisteredReportIds(configs: MenuConfig[]): Set<number> {
  const ids = new Set<number>();
  const walk = (items: MenuItem[]) => {
    for (const m of items) {
      if (m.path) {
        const match = /reports\/view[^#]*[?&]reportId=(\d+)/.exec(m.path);
        if (match) ids.add(Number(match[1]));
      }
      if (m.children?.length) walk(m.children);
    }
  };
  configs.forEach((c) => walk(c.menus ?? []));
  return ids;
}

export default function ReportList() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [ownership, setOwnership] = useState<OwnershipFilter>('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  // 좁은 화면(레일 숨김) 전용 필터 드로어
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ── 운영자 모드 — 목록 스코프 테넌트 (필수 단일 선택, "전체" 없음) ──────────
  // 기본값 = 운영자 모드 진입 전 로그인돼 있던 컨텍스트 테넌트. 선택 테넌트의
  // 장표 목록을 조회하고, 장표를 열면 뷰어 테넌트 조건이 이 값으로 프리셋된다.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const myTenantId = useAuthStore((s) => s.userInfo?.tenant ?? null);
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants);
  const [scopeTenantId, setScopeTenantId] = useState<string | null>(null);
  const effectiveScopeTenantId = scopeTenantId ?? myTenantId;
  const isForeignScope = operatorMode && effectiveScopeTenantId != null && effectiveScopeTenantId !== myTenantId;
  const tenantScopeOptions = (availableTenants ?? []).map((t) => ({ id: String(t.tenantId), name: t.tenantName }));

  const { data: reports = [], isFetching } = useGetReports({
    params: operatorMode && effectiveScopeTenantId ? { tenantId: effectiveScopeTenantId } : undefined,
  });

  // 메뉴 등록 여부 판정 — host 가 적재한 메뉴 store 기준 (메뉴 path 의 ?reportId)
  const menuConfigs = useMenuStore((s) => s.menuConfigs);
  const registeredReportIds = useMemo(() => collectRegisteredReportIds(menuConfigs), [menuConfigs]);

  // 내 userId — 소유 판정 기준
  const myUserId = useAuthStore((s) => s.userInfo?.userId);
  const isMine = (r: ReportListItem) => myUserId != null && String(r.ownerUserId) === String(myUserId);

  // 가시성 판정 — 일반: 내 것/메뉴 등록/공유만. 운영자 모드(admin): BE 가 스코프 테넌트
  // 전체(개인 포함)를 내려주므로 클라이언트 필터를 걸지 않는다 (소유+역할 권한 모델).
  const isVisible = (r: ReportListItem) => operatorMode || isMine(r) || registeredReportIds.has(r.reportId) || !!r.isSystem;

  // 태그 집계 (빈도 내림차순) — 가시 범위 기준
  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.filter(isVisible).forEach((r) => (r.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, registeredReportIds, myUserId, operatorMode]);

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

  // 1) 가시성 + 태그 + 검색 적용 (소유 미적용) — 범위 탭 건수 기준.
  // 검색은 통합검색/메뉴검색과 동일한 fuzzy 매칭(초성·자모 지원). 제목 + 데이터셋명 + 태그 통합 대상.
  const visibleBase = useMemo(() => {
    // 기본 가시성: 내 보고서 / 메뉴 등록 / 시스템 기본 장표만 노출 (운영자 모드는 전체)
    let visible = reports.filter(isVisible);
    // 태그 필터 (AND) — 선택 태그를 모두 가진 보고서만
    if (selectedTags.size) {
      visible = visible.filter((r) => {
        const tags = r.tags ?? [];
        return [...selectedTags].every((t) => tags.includes(t));
      });
    }
    return fuzzyFilter(searchValue, visible, (r) => `${r.title} ${(r.datasetNames ?? []).join(' ')} ${(r.tags ?? []).join(' ')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, searchValue, registeredReportIds, myUserId, selectedTags, operatorMode]);

  // 범위(소유) 탭별 건수 (검색 반영)
  const ownCounts = useMemo<Record<OwnershipFilter, number>>(() => {
    return {
      ALL: visibleBase.length,
      MINE: visibleBase.filter(isMine).length,
      PUBLISHED: visibleBase.filter((r) => registeredReportIds.has(r.reportId)).length,
      SYSTEM: visibleBase.filter((r) => r.isSystem).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBase, myUserId, registeredReportIds]);

  // 범위 적용 — 목록 기준
  const ownFiltered = useMemo(() => {
    return visibleBase.filter((r) => {
      if (ownership === 'PUBLISHED') return registeredReportIds.has(r.reportId);
      if (ownership === 'MINE') return isMine(r);
      if (ownership === 'SYSTEM') return !!r.isSystem;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBase, ownership, registeredReportIds, myUserId]);

  // 상단 표기 명칭 — 범위 미선택(ALL)이면 '전체', 선택 시 해당 범위 명칭
  const rangeLabel = OWNERSHIP_OPTIONS.find((o) => o.value === ownership)?.label ?? '전체';

  const handleNew = () => navigate('/insight/statistics/reports/new');

  // 타 테넌트 스코프 열람 중엔 생성 차단 — 신규 장표 소유가 컨텍스트 테넌트로 박혀
  // "보고 있는 테넌트 ≠ 생성되는 테넌트" 불일치가 생기는 것을 방지.
  const newDisabled = isForeignScope;
  const newDisabledTip = newDisabled ? '내 테넌트 스코프에서만 생성할 수 있습니다' : undefined;

  // 운영자 스코프 셀렉트 (운영자 모드 전용, "전체" 없음 — 단일 테넌트 필수)
  const renderTenantScope = (fullWidth?: boolean) =>
    operatorMode ? (
      <ScopeSelect
        kind="tenant"
        hideAll
        options={tenantScopeOptions}
        value={effectiveScopeTenantId}
        onChange={(id) => setScopeTenantId(id)}
        width={fullWidth ? 240 : 170}
        className={fullWidth ? 'w-full' : undefined}
      />
    ) : null;

  // 활성 필터 수 — 좁은 화면 '필터' 버튼 뱃지
  const activeFilterCount = selectedTags.size + (ownership !== 'ALL' ? 1 : 0);

  // 필터 본문(태그 + 범위) — 넓은 화면 레일 / 좁은 화면 드로어 공용
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

      <div>
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">범위</div>
        <div className="flex flex-col gap-0.5">
          {OWNERSHIP_OPTIONS.map((opt) => (
            <RailButton key={opt.value} active={ownership === opt.value} icon={opt.icon} label={opt.label} count={ownCounts[opt.value]} onClick={() => setOwnership(opt.value)} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 좁은 화면 전용 상단 툴바 — 레일 숨김 시 (운영자 스코프) + 검색 + 필터(드로어) + 추가 */}
      <div className="flex lg:hidden items-center gap-2 w-full bg-white bt-shadow px-4 py-3">
        {renderTenantScope()}
        <Input
          allowClear
          prefix={<Search className="size-4 text-gray-400" />}
          placeholder="보고서 검색"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="flex-1"
        />
        <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setFilterDrawerOpen(true)}>
          필터
          {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </Button>
        <Tooltip title={newDisabledTip}>
          <Button type="primary" icon={<Plus className="size-4" />} disabled={newDisabled} onClick={handleNew} />
        </Tooltip>
      </div>

      {/* datasets 페이지와 동일한 2분할: 좌측 검색+필터 레일 박스 / 우측 목록 박스 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: (운영자 스코프) + 검색 + 필터 레일 — 넓은 화면(lg+)만 표시 */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col gap-3 bg-white bt-shadow p-4 min-h-0">
          {operatorMode && (
            <>
              {renderTenantScope(true)}
              <div className="border-t border-gray-200" />
            </>
          )}
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="보고서 검색"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            <Tooltip title={newDisabledTip}>
              <Button type="primary" icon={<Plus className="size-4" />} disabled={newDisabled} onClick={handleNew}>
                추가
              </Button>
            </Tooltip>
          </div>

          <div className="border-t border-gray-200" />

          {renderFilters()}
        </div>

        {/* 우측: 보고서 목록 — 카드 그리드(반응형 auto-fill, 폭 줄면 1열까지) */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col">
          {isFetching ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <FallbackSpinner />
            </div>
          ) : ownFiltered.length === 0 ? (
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
                  <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{ownFiltered.length}</span>
                </div>
                {/* 본문 — 반응형 카드 그리드 (auto-fill: 폭에 따라 다열→1열) */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                  {ownFiltered.map((report) => (
                    <div key={report.reportId} className="min-w-0 border-r border-[#e9ebec]">
                      <ReportRow
                        report={report}
                        query={searchValue}
                        isMenuRegistered={registeredReportIds.has(report.reportId)}
                        scopeTenantId={operatorMode ? (effectiveScopeTenantId ?? undefined) : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 좁은 화면 전용 필터 드로어 */}
      <Drawer title="필터" placement="left" size={320} open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} styles={{ body: { padding: 16 } }}>
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
        {badge ? badge : Icon ? <Icon size={14} className={cn('shrink-0', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')} /> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('shrink-0 text-xs tabular-nums', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')}>{count}</span>
    </button>
  );
}
