import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Tag } from 'antd';
import { Layers, type LucideIcon, Menu, Plus, Search, Server, User } from 'lucide-react';
import { type MenuConfig, type MenuItem, useAuthStore, useBreadcrumbStore, useMenuStore } from '@/shared-store';
import { fuzzyFilter } from '@/shared-util';
import ReportRow from '../../features/report/components/ReportRow';
import { DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../features/report/constants/reportIconConstants';
import { useGetReports } from '../../features/report/hooks/useReportQueries';
import type { DomainCode, ReportListItem } from '../../features/report/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';

type OwnershipFilter = 'ALL' | 'MINE' | 'PUBLISHED' | 'SYSTEM';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '통계', path: '/insight/statistics' },
  { title: '보고서 관리', path: '/insight/statistics/reports' },
];

// 도메인 섹션 순서 — 추후 도메인 확장 시 이 배열만 늘리면 레일·그룹이 함께 확장된다.
const DOMAIN_SECTIONS: DomainCode[] = ['IE', 'IC', 'IR'];
// 레일 도메인 점 색상 (antd Tag 색과 동일 계열). 미정의 도메인은 회색 fallback.
const DOMAIN_DOT_COLOR: Record<string, string> = { IE: '#1677ff', IC: '#389e0d', IR: '#d46b08' };
// 도메인 컬럼 헤더 배경 — 카테고리 구분용이되 색감은 최소화(거의 중성에 살짝 도메인 힌트). 미정의 도메인은 회색 fallback.
const DOMAIN_SOFT_BG: Record<string, string> = { IE: '#f7fafc', IC: '#f7fbf8', IR: '#fcfaf7' };

const OWNERSHIP_OPTIONS: { value: OwnershipFilter; label: string; icon: LucideIcon }[] = [
  { value: 'ALL', label: '전체', icon: Layers },
  { value: 'MINE', label: '내 보고서', icon: User },
  { value: 'PUBLISHED', label: '메뉴 등록', icon: Menu },
  { value: 'SYSTEM', label: '시스템', icon: Server },
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
  const [domain, setDomain] = useState<DomainCode | ''>('');
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

  // 1) 가시성 + 검색 적용 (소유/도메인 미적용) — 소유 탭 건수 기준.
  // 검색은 통합검색/메뉴검색과 동일한 fuzzy 매칭(초성·자모 지원). 제목 + 데이터셋명 통합 대상.
  const visibleBase = useMemo(() => {
    // 기본 가시성: 내 보고서 / 메뉴 등록 / 시스템 기본 장표만 노출
    const visible = reports.filter((r) => isMine(r) || registeredReportIds.has(r.reportId) || r.isSystem);
    return fuzzyFilter(searchValue, visible, (r) => `${r.title} ${(r.datasetNames ?? []).join(' ')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, searchValue, registeredReportIds, myUserId]);

  // 소유 탭별 건수 (검색 반영)
  const ownCounts = useMemo<Record<OwnershipFilter, number>>(() => {
    return {
      ALL: visibleBase.length,
      MINE: visibleBase.filter(isMine).length,
      PUBLISHED: visibleBase.filter((r) => registeredReportIds.has(r.reportId)).length,
      SYSTEM: visibleBase.filter((r) => r.isSystem).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBase, myUserId, registeredReportIds]);

  // 2) 소유 적용 (도메인 미적용) — 도메인 건수 + 목록 기준
  const ownFiltered = useMemo(() => {
    return visibleBase.filter((r) => {
      if (ownership === 'PUBLISHED') return registeredReportIds.has(r.reportId);
      if (ownership === 'MINE') return isMine(r);
      if (ownership === 'SYSTEM') return !!r.isSystem;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBase, ownership, registeredReportIds, myUserId]);

  // 도메인별 건수 (레일 배지) — 전체 + 도메인별
  const domainCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { ALL: ownFiltered.length };
    DOMAIN_SECTIONS.forEach((d) => (counts[d] = 0));
    ownFiltered.forEach((r) => {
      if (counts[r.domain] != null) counts[r.domain] += 1;
    });
    return counts;
  }, [ownFiltered]);

  // 도메인 그룹화 (목록 렌더) — DOMAIN_SECTIONS 기반 동적 초기화.
  // 향후 도메인 목록을 API 로 받아도(배열만 교체) 그대로 수용. 미정의 도메인도 누락 없이 그룹 생성.
  const byDomain = useMemo<Record<string, ReportListItem[]>>(() => {
    const grouped: Record<string, ReportListItem[]> = {};
    DOMAIN_SECTIONS.forEach((d) => (grouped[d] = []));
    ownFiltered.forEach((r) => {
      (grouped[r.domain] ??= []).push(r);
    });
    return grouped;
  }, [ownFiltered]);

  const totalVisible = (domain ? [domain] : DOMAIN_SECTIONS).reduce((sum, d) => sum + byDomain[d].length, 0);

  // 칸반 컬럼 정의 — 전체면 도메인별 컬럼, 도메인 필터 시 선택 도메인을 N개 컬럼으로 균등 분산(레이아웃 일관)
  const colCount = DOMAIN_SECTIONS.length;
  const columns: { key: string; domain: DomainCode; items: ReportListItem[] }[] = domain
    ? Array.from({ length: colCount }, (_, i) => ({
        key: `${domain}-${i}`,
        domain,
        items: byDomain[domain].filter((_, idx) => idx % colCount === i),
      }))
    : DOMAIN_SECTIONS.map((d) => ({ key: d, domain: d, items: byDomain[d] }));

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

          {/* 필터 레일 — 소유 + 도메인 (스크롤) */}
          <div className="flex flex-1 flex-col gap-4 overflow-auto min-h-0">
            {/* 소유 필터 */}
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

        {/* 우측: 보고서 목록 */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col bg-white bt-shadow">
          {isFetching ? (
            <div className="flex h-full w-full items-center justify-center">
              <FallbackSpinner />
            </div>
          ) : totalVisible === 0 ? (
            <div className="flex h-full w-full items-center justify-center">
              <NoData message={searchValue ? `"${searchValue}" 검색 결과 없음` : '조회된 데이터가 없습니다.'} iconSize={50} fontSize="text-lg" gap={2} />
            </div>
          ) : (
            // 칸반 그리드 — 행은 목록과 동일 ReportRow. 도메인(카테고리)별로 독립 패널 분리(테두리+상단 강조선+여백)로 영역 구분감 강화.
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
                      ? col.items.map((report) => <ReportRow key={report.reportId} report={report} query={searchValue} />)
                      : !domain && <div className="px-4 py-8 text-center text-xs text-[var(--color-bt-fg-muted)]">조건에 맞는 보고서가 없습니다.</div>}
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
