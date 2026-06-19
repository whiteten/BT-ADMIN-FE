import { type ReactNode, useEffect, useMemo, useState } from 'react';
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

  // 패널(영역) 정의 — 전체면 도메인별 N개 영역, 도메인 선택 시 해당 도메인 단일 영역(내부에서 칸만 분할)
  const columns: { key: string; domain: DomainCode; items: DashboardListItem[] }[] = domain
    ? [{ key: domain, domain, items: byDomain[domain] }]
    : DOMAIN_SECTIONS.map((d) => ({ key: d, domain: d, items: byDomain[d] }));
  const colCount = columns.length;
  // 단일 영역 내부 칸(컬럼) 수 — 도메인 선택 시 행을 이만큼 균등 분산
  const SUB_COLS = DOMAIN_SECTIONS.length;

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
                    badge={
                      <span
                        className="inline-flex shrink-0 items-center rounded border border-solid px-1 font-mono text-[10px] font-bold leading-[15px]"
                        style={{ color: DOMAIN_DOT_COLOR[d] ?? '#595959', borderColor: DOMAIN_DOT_COLOR[d] ?? '#d9d9d9' }}
                      >
                        {d}
                      </span>
                    }
                    label={DOMAIN_LABELS[d] ?? d}
                    count={domainCounts[d] ?? 0}
                    onClick={() => setDomain(d)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 대시보드 목록 — 뒷 배경 박스 없이 패널이 페이지 배경 위에 바로(FCA bot list 패턴) */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <FallbackSpinner />
            </div>
          ) : totalVisible === 0 ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '조회된 데이터가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : (
            // 칸반 그리드 — 도메인(카테고리)별 독립 패널. 헤더 배경 없이 상단 강조선·구분선·IE/IC/IR 배지로 구분.
            // 전체: 도메인별 N개 패널 / 도메인 선택: 해당 패널 단일 전체영역 확대
            <div className="flex flex-1 flex-col overflow-auto">
              <div className="grid flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(280px, 1fr))` }}>
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="flex min-w-0 flex-col rounded-lg border border-[#e9ebec] bg-white"
                    style={{
                      borderTopColor: DOMAIN_DOT_COLOR[col.domain] ?? '#868e96',
                      borderTopWidth: 2,
                      borderBottomColor: DOMAIN_DOT_COLOR[col.domain] ?? '#868e96',
                      borderBottomWidth: 2,
                    }}
                  >
                    {/* 도메인 헤더 — 카테고리(IE/IC/IR) 구분 표시, 하단은 회색 기본 구분선(제목 구분용) */}
                    <div className="sticky top-0 z-[1] flex items-center gap-2 rounded-t-md border-b border-[#e9ebec] bg-white px-4 py-2.5">
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
                    {/* 본문 — 전체: 단일 세로 목록 / 도메인 선택: 영역은 하나, 내부에서 칸만 SUB_COLS 분할 */}
                    {col.items.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-[var(--color-bt-fg-muted)]">조건에 맞는 대시보드가 없습니다.</div>
                    ) : domain ? (
                      <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${SUB_COLS}, minmax(0, 1fr))` }}>
                        {Array.from({ length: SUB_COLS }, (_, i) => col.items.filter((_, idx) => idx % SUB_COLS === i)).map((sub, i) => (
                          <div key={i} className={cn('flex min-w-0 flex-col', i < SUB_COLS - 1 && 'border-r border-[#e9ebec]')}>
                            {sub.map((dashboard) => (
                              <DashboardRow key={dashboard.dashboardId} dashboard={dashboard} query={searchValue} />
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      col.items.map((dashboard) => <DashboardRow key={dashboard.dashboardId} dashboard={dashboard} query={searchValue} />)
                    )}
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
