import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input } from 'antd';
import { Layers, type LucideIcon, Menu, Plus, Search, Share2, User } from 'lucide-react';
import { type MenuConfig, type MenuItem, useAuthStore, useBreadcrumbStore, useMenuStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import ReportRow from '../../features/report/components/ReportRow';
import { useGetReports } from '../../features/report/hooks/useReportQueries';
import type { ReportListItem } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';

type OwnershipFilter = 'ALL' | 'MINE' | 'PUBLISHED' | 'SYSTEM';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/insight/statistics' },
  { title: '보고서 관리', path: '/insight/statistics/reports' },
];

// 목록 본문 칸(컬럼) 수 — 행을 이만큼 균등 분산(round-robin)
const LIST_COLS = 3;

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

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: reports = [], isFetching } = useGetReports();

  // 메뉴 등록 여부 판정 — host 가 적재한 메뉴 store 기준 (메뉴 path 의 ?reportId)
  const menuConfigs = useMenuStore((s) => s.menuConfigs);
  const registeredReportIds = useMemo(() => collectRegisteredReportIds(menuConfigs), [menuConfigs]);

  // 내 userId — 소유 판정 기준
  const myUserId = useAuthStore((s) => s.userInfo?.userId);
  const isMine = (r: ReportListItem) => myUserId != null && String(r.ownerUserId) === String(myUserId);

  // 1) 가시성 + 검색 적용 (소유 미적용) — 범위 탭 건수 기준.
  // 검색은 통합검색/메뉴검색과 동일한 fuzzy 매칭(초성·자모 지원). 제목 + 데이터셋명 통합 대상.
  const visibleBase = useMemo(() => {
    // 기본 가시성: 내 보고서 / 메뉴 등록 / 시스템 기본 장표만 노출
    const visible = reports.filter((r) => isMine(r) || registeredReportIds.has(r.reportId) || r.isSystem);
    return fuzzyFilter(searchValue, visible, (r) => `${r.title} ${(r.datasetNames ?? []).join(' ')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, searchValue, registeredReportIds, myUserId]);

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

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* datasets 페이지와 동일한 2분할: 좌측 검색+필터 레일 박스 / 우측 목록 박스 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 필터 레일 (트리 자리) */}
        <div className="flex w-[340px] shrink-0 flex-col gap-3 bg-white bt-shadow p-4 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="보고서 검색"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleNew}>
              추가
            </Button>
          </div>

          <div className="border-t border-gray-200" />

          {/* 필터 레일 — 범위(소유) */}
          <div className="flex flex-1 flex-col gap-4 overflow-auto min-h-0">
            <div>
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">범위</div>
              <div className="flex flex-col gap-0.5">
                {OWNERSHIP_OPTIONS.map((opt) => (
                  <RailButton
                    key={opt.value}
                    active={ownership === opt.value}
                    icon={opt.icon}
                    label={opt.label}
                    count={ownCounts[opt.value]}
                    onClick={() => setOwnership(opt.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 보고서 목록 — 뒷 배경 박스 없이 패널이 페이지 배경 위에 바로(FCA bot list 패턴) */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col">
          {isFetching ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <FallbackSpinner />
            </div>
          ) : ownFiltered.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '조회된 데이터가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : (
            // 단일 패널 — 상단에 범위 명칭(전체/선택 범위), 본문은 LIST_COLS 칸으로 균등 분산
            <div className="flex flex-1 flex-col overflow-auto">
              <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-[#e9ebec] bg-white">
                {/* 범위 헤더 (sticky) */}
                <div className="sticky top-0 z-[1] flex items-center gap-2 rounded-t-lg border-b border-[#e9ebec] bg-white px-4 py-2.5">
                  <span className="text-[13px] font-semibold">{rangeLabel}</span>
                  <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{ownFiltered.length}</span>
                </div>
                {/* 본문 — LIST_COLS 칸 분할 (round-robin) */}
                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${LIST_COLS}, minmax(0, 1fr))` }}>
                  {Array.from({ length: LIST_COLS }, (_, i) => ownFiltered.filter((_, idx) => idx % LIST_COLS === i)).map((sub, i) => (
                    <div key={i} className={cn('flex min-w-0 flex-col', i < LIST_COLS - 1 && 'border-r border-[#e9ebec]')}>
                      {sub.map((report) => (
                        <ReportRow key={report.reportId} report={report} query={searchValue} isMenuRegistered={registeredReportIds.has(report.reportId)} />
                      ))}
                    </div>
                  ))}
                </div>
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
