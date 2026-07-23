import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Drawer, Input } from 'antd';
import { Boxes, ChevronDown, Hash, Headphones, Layers, type LucideIcon, PhoneCall, Plus, Search, Server, SlidersHorizontal, Tags } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import { isBaseTag } from '../../components/statTag';
import LookupCatalogCard from '../../features/monitoring/components/lookup/LookupCatalogCard';
import LookupCatalogFormDrawer from '../../features/monitoring/components/lookup/LookupCatalogFormDrawer';
import { monitoringLookupCatalogKeys, useDeleteMonitoringLookupCatalog, useGetMonitoringLookupCatalogs } from '../../features/monitoring/hooks/useLookupCatalogQueries';
import type { LookupCatalogItem } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type CategoryFilter = '' | '일반' | 'IE' | 'IC' | 'IR';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '룩업코드', path: '/insight/monitoring/lookups' },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string; icon: LucideIcon }[] = [
  { value: '', label: '전체', icon: Layers },
  { value: '일반', label: '일반', icon: Boxes },
  { value: 'IE', label: 'IE (교환기)', icon: Server },
  { value: 'IC', label: 'IC (CTI)', icon: Headphones },
  { value: 'IR', label: 'IR (IVR)', icon: PhoneCall },
];

export default function LookupCatalogList() {
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [category, setCategory] = useState<CategoryFilter>('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  // 좁은 화면(레일 숨김) 전용 필터 드로어
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: catalogs = [], isLoading } = useGetMonitoringLookupCatalogs();
  const { mutate: deleteCatalog } = useDeleteMonitoringLookupCatalog({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: monitoringLookupCatalogKeys.list._def });
        toast.success('코드 룩업이 삭제되었습니다.');
      },
    },
  });

  // 등록/편집 Drawer 상태
  const [editingItem, setEditingItem] = useState<LookupCatalogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCreate = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };
  const handleEdit = (item: LookupCatalogItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };
  const handleDelete = (item: LookupCatalogItem) => {
    if (item.usageCount > 0) {
      toast.warning('사용 중인 데이터셋이 있어 삭제할 수 없습니다.');
      return;
    }
    modal.confirm.delete({ onOk: () => deleteCatalog(item.lookupCatalogId) });
  };
  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: monitoringLookupCatalogKeys.list._def });
  };

  // 1) 검색만 적용 — 카테고리 탭 건수 기준. 표시명 + 테이블명 + 태그 통합 fuzzy 매칭.
  const searchFiltered = useMemo(() => fuzzyFilter(searchValue, catalogs, (c) => `${c.displayName} ${c.tableName} ${(c.tags ?? []).join(' ')}`), [catalogs, searchValue]);

  // 카테고리 탭별 건수 (검색 반영)
  const categoryCounts = useMemo<Record<CategoryFilter, number>>(
    () => ({
      '': searchFiltered.length,
      일반: searchFiltered.filter((c) => c.category === '일반').length,
      IE: searchFiltered.filter((c) => c.category === 'IE').length,
      IC: searchFiltered.filter((c) => c.category === 'IC').length,
      IR: searchFiltered.filter((c) => c.category === 'IR').length,
    }),
    [searchFiltered],
  );

  // 2) 카테고리 적용 — 태그 집계 / 태그 필터의 가시 범위 기준
  const categoryFiltered = useMemo(() => {
    if (!category) return searchFiltered;
    return searchFiltered.filter((c) => c.category === category);
  }, [searchFiltered, category]);

  // 태그 집계 (빈도 내림차순) — 현재 검색/카테고리 적용된 가시 목록 기준
  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryFiltered.forEach((c) => (c.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [categoryFiltered]);

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

  // 3) 태그 적용 (AND) — 목록 기준
  const tagFiltered = useMemo(() => {
    if (!selectedTags.size) return categoryFiltered;
    return categoryFiltered.filter((c) => {
      const tags = c.tags ?? [];
      return [...selectedTags].every((t) => tags.includes(t));
    });
  }, [categoryFiltered, selectedTags]);

  // 상단 표기 명칭 — 카테고리 미선택이면 '전체'
  const rangeLabel = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? '전체';

  // 활성 필터 수 — 좁은 화면 '필터' 버튼 뱃지
  const activeFilterCount = selectedTags.size + (category !== '' ? 1 : 0);

  // 필터 본문(태그 + 카테고리) — 넓은 화면 레일 / 좁은 화면 드로어 공용
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

      {/* 카테고리 필터 */}
      <div>
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-bt-fg-muted)]">카테고리</div>
        <div className="flex flex-col gap-0.5">
          {CATEGORY_OPTIONS.map((opt) => (
            <RailButton
              key={opt.value}
              active={category === opt.value}
              icon={opt.icon}
              label={opt.label}
              count={categoryCounts[opt.value]}
              onClick={() => setCategory(opt.value)}
            />
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
          placeholder="룩업코드 검색"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="flex-1"
        />
        <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setFilterDrawerOpen(true)}>
          필터
          {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </Button>
        <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate} />
      </div>

      {/* 보고서 관리와 동일한 2분할: 좌측 검색+필터 레일 박스 / 우측 목록 박스 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 필터 레일 — 넓은 화면(lg+)만 표시 */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col gap-3 bg-white bt-shadow p-4 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="룩업코드 검색"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
              추가
            </Button>
          </div>

          <div className="border-t border-gray-200" />

          {renderFilters()}
        </div>

        {/* 우측: 룩업코드 목록 — 카드 그리드(반응형 auto-fill, 폭 줄면 1열까지) */}
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
                  {tagFiltered.map((item) => (
                    <div key={item.lookupCatalogId} className="min-w-0 border-r border-[#e9ebec]">
                      <LookupCatalogCard item={item} query={searchValue} onEdit={handleEdit} onDelete={handleDelete} />
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

      {/* 등록/편집 Drawer */}
      <LookupCatalogFormDrawer open={drawerOpen} initial={editingItem} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} />
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
