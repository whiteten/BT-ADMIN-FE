import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Drawer, Input } from 'antd';
import { ChevronDown, Hash, Layers, Plus, Search, SlidersHorizontal, Tags } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyFilter, toast } from '@/shared-util';
import { isBaseTag } from '../../components/statTag';
import WidgetCatalogCard, { type WidgetCatalogEntry } from '../../features/monitoring/components/catalog/WidgetCatalogCard';
import WidgetCatalogFormDrawer from '../../features/monitoring/components/catalog/WidgetCatalogFormDrawer';
import { dashboardKeys, useGetCustomWidgetCatalog } from '../../features/monitoring/hooks/useDashboardQueries';
import { templateWidgetKeys, useDeleteTemplateWidget, useGetTemplateWidgets } from '../../features/monitoring/hooks/useTemplateWidgetQueries';
import type { CustomWidgetCatalogItem, TemplateWidgetDefinitionListItem } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconLayer, IconSlidersHorizontal } from '@/components/custom/Icons';
import NoData from '@/components/custom/NoData';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type KindFilter = 'ALL' | 'TEMPLATE' | 'CUSTOM';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '위젯 관리', path: '/insight/monitoring/widgets' },
];

const KIND_OPTIONS: { value: KindFilter; label: string; icon: ReactNode }[] = [
  { value: 'ALL', label: '전체', icon: <Layers size={14} /> },
  { value: 'TEMPLATE', label: '템플릿 위젯', icon: <IconLayer className="size-3.5" /> },
  { value: 'CUSTOM', label: '커스텀 위젯', icon: <IconSlidersHorizontal className="size-3.5" /> },
];

/**
 * 위젯 관리 — 좌측 범위 레일 + 우측 카드 그리드 (통계 보고서 관리 ReportList 와 동일 UI).
 * 템플릿 위젯(데이터셋 기반, CRUD)과 커스텀 위젯(시스템 자원, 수정만)을 단일 목록으로 합쳐 보여준다.
 * 범위/카드에서 종류를 아이콘·뱃지로 구분.
 */
export default function WidgetCatalogManageList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [kind, setKind] = useState<KindFilter>('ALL');
  const [searchValue, setSearchValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  // 좁은 화면(레일 숨김) 전용 필터 드로어
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  // 커스텀 위젯 편집 드로어
  const [editingItem, setEditingItem] = useState<CustomWidgetCatalogItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: templates = [], isLoading: templatesLoading } = useGetTemplateWidgets();
  const { data: customs = [], isLoading: customsLoading } = useGetCustomWidgetCatalog();
  const isLoading = templatesLoading || customsLoading;

  const { mutate: deleteTemplate } = useDeleteTemplateWidget({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: templateWidgetKeys.list._def });
        toast.success('템플릿 위젯이 삭제되었습니다.');
      },
    },
  });

  // 템플릿 + 커스텀을 단일 목록으로 병합 (각 항목에 kind 판별자 부여)
  const entries = useMemo<WidgetCatalogEntry[]>(
    () => [
      ...templates.map((t): WidgetCatalogEntry => ({ kind: 'TEMPLATE', id: t.templateWidgetId, name: t.widgetName, tags: t.tags ?? [], raw: t })),
      ...customs.map((c): WidgetCatalogEntry => ({ kind: 'CUSTOM', id: c.widgetTypeId, name: c.widgetName, tags: c.tags ?? [], raw: c })),
    ],
    [templates, customs],
  );

  // 태그 집계 (빈도 내림차순) — 필터 옵션
  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => e.tags.forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [entries]);

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

  // 태그(AND) + 검색(fuzzy) 적용 — 범위 미적용. 범위 건수 기준.
  // 검색 대상: 위젯명 + 태그 + (템플릿=데이터셋명 / 커스텀=식별자)
  const visibleBase = useMemo(() => {
    let visible = entries;
    if (selectedTags.size) {
      visible = visible.filter((e) => [...selectedTags].every((t) => e.tags.includes(t)));
    }
    return fuzzyFilter(searchValue, visible, (e) => {
      const extra = e.kind === 'TEMPLATE' ? (e.raw.datasetName ?? '') : e.raw.widgetTypeId;
      return `${e.name} ${e.tags.join(' ')} ${extra}`;
    });
  }, [entries, searchValue, selectedTags]);

  // 범위(종류)별 건수 (검색 반영)
  const kindCounts = useMemo<Record<KindFilter, number>>(
    () => ({
      ALL: visibleBase.length,
      TEMPLATE: visibleBase.filter((e) => e.kind === 'TEMPLATE').length,
      CUSTOM: visibleBase.filter((e) => e.kind === 'CUSTOM').length,
    }),
    [visibleBase],
  );

  // 범위 적용 — 목록 기준
  const filtered = useMemo(() => visibleBase.filter((e) => kind === 'ALL' || e.kind === kind), [visibleBase, kind]);

  const rangeLabel = KIND_OPTIONS.find((o) => o.value === kind)?.label ?? '전체';

  // 추가 버튼 — 커스텀은 시스템 자원이라 생성 불가, 항상 템플릿 위젯 생성으로 이동
  const handleNew = () => navigate('/insight/monitoring/widgets/template/new');
  const handleEditTemplate = (id: number) => navigate(`/insight/monitoring/widgets/template/${id}/edit`);
  const handleDeleteTemplate = (item: TemplateWidgetDefinitionListItem) => modal.confirm.delete({ onOk: () => deleteTemplate(item.templateWidgetId) });
  const handleEditCustom = (item: CustomWidgetCatalogItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };
  const handleSaved = () => queryClient.invalidateQueries({ queryKey: dashboardKeys.customWidgetCatalog._def });

  // 활성 필터 수 — 좁은 화면 '필터' 버튼 뱃지
  const activeFilterCount = selectedTags.size + (kind !== 'ALL' ? 1 : 0);

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
          {KIND_OPTIONS.map((opt) => (
            <RailButton key={opt.value} active={kind === opt.value} icon={opt.icon} label={opt.label} count={kindCounts[opt.value]} onClick={() => setKind(opt.value)} />
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
          placeholder="위젯 검색"
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

      {/* 2분할: 좌측 검색+필터 레일 박스 / 우측 목록 박스 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 필터 레일 — 넓은 화면(lg+)만 표시 */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col gap-3 bg-white bt-shadow p-4 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="위젯 검색"
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

        {/* 우측: 위젯 목록 — 카드 그리드(반응형 auto-fill, 폭 줄면 1열까지) */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-white bt-shadow">
              <FallbackSpinner />
            </div>
          ) : filtered.length === 0 ? (
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
                  <span className="ml-auto text-xs text-[var(--color-bt-fg-muted)]">{filtered.length}</span>
                </div>
                {/* 본문 — 반응형 카드 그리드 (auto-fill: 폭에 따라 다열→1열) */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                  {filtered.map((entry) => (
                    <div key={`${entry.kind}-${entry.id}`} className="min-w-0 border-r border-[#e9ebec]">
                      <WidgetCatalogCard
                        entry={entry}
                        query={searchValue}
                        onEditTemplate={handleEditTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                        onEditCustom={handleEditCustom}
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
      <Drawer title="필터" placement="left" width={320} open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} styles={{ body: { padding: 16 } }}>
        {renderFilters()}
      </Drawer>

      {/* 커스텀 위젯 편집 드로어 */}
      <WidgetCatalogFormDrawer open={drawerOpen} initial={editingItem} onClose={() => setDrawerOpen(false)} onSaved={handleSaved} />
    </div>
  );
}

interface RailButtonProps {
  active: boolean;
  label: string;
  count: number;
  icon?: ReactNode;
  onClick: () => void;
}

function RailButton({ active, label, count, icon, onClick }: RailButtonProps) {
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
        {icon ? <span className={cn('flex shrink-0 items-center', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')}>{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('shrink-0 text-xs tabular-nums', active ? 'text-[var(--color-bt-primary)]' : 'text-[var(--color-bt-fg-muted)]')}>{count}</span>
    </button>
  );
}
