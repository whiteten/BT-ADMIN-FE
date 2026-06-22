import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Popover, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Database, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { fuzzyScore, toast } from '@/shared-util';
import { datasetKeys, useDeleteDataset, useGetDataset, useGetDatasets, useSetDatasetSystemFlag } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem, FieldMetaItem } from '../../features/dataset/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Highlight } from '@/components/custom/Highlight';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const UNIT_LABEL: Record<string, string> = { MI: '10분', HH: '시간', DD: '일', MM: '월', YY: '연' };

// 상태(isActive)·유형(isSystem) 단일 선택 필터 옵션
const STATUS_OPTS = [
  ['all', '전체'],
  ['active', '활성'],
  ['inactive', '비활성'],
] as const;
const TYPE_OPTS = [
  ['all', '전체'],
  ['system', '시스템'],
  ['user', '사용자'],
] as const;

// ─── 태그 임시 시드 (과도기) ──────────────────────────────────────────────────
// ⚠️ 백엔드 tags 필드 제공 전까지 화면 확인용 데모 태그를 생성한다.
//    실제 tags 응답이 오면 seedTags 는 d.tags 를 그대로 반환하므로(아래 가드),
//    백엔드 연동 후 이 POOL·매핑 블록만 제거하면 된다.
const DOMAIN_TAG: Record<string, string> = { IE: 'PBX', IC: 'CTI', IR: 'IVR' };
// prettier-ignore
const DEMO_TAG_POOL = [
  '실시간', '일배치', '원천로그', '마트', '대용량', '외부연동', '상담사', '큐', '트렁크', '내선',
  '호처리', '라우팅', '시나리오', '노드', '녹취', '통화품질', '집계', 'KPI', '실험', '보존정책',
  '민감정보', '파티셔닝', '인입', '아웃바운드', '스킬', '캠페인', '세션', '이벤트로그', '요약', '월마감',
];
const seedTags = (d: DatasetListItem): string[] => {
  if (d.tags?.length) return d.tags; // 백엔드가 주면 그대로 사용
  const base = DOMAIN_TAG[d.productCode] ? [DOMAIN_TAG[d.productCode]] : [];
  const n = 2 + (d.datasetId % 6); // 2~7개
  const extra: string[] = [];
  for (let i = 0; i < n; i++) extra.push(DEMO_TAG_POOL[(d.datasetId * 7 + i * 11) % DEMO_TAG_POOL.length]);
  return [...new Set([...base, ...extra])];
};

// 상세 패널 — 역할/타입(서식) 뱃지 명칭은 편집화면(WizardStepB) 기준
const FIELD_ROLE_META: Record<string, { label: string; color: string }> = {
  DIMENSION: { label: '디멘션', color: 'purple' },
  TIMESTAMP: { label: '디멘션', color: 'purple' },
  MEASURE: { label: '측정값', color: 'volcano' },
  CALC: { label: '계산필드', color: 'green' },
};
// formatterType → 편집화면 서식 명칭 (역할 색상과 겹치지 않게 분리)
const FIELD_FORMAT_META: Record<string, { label: string; color: string }> = {
  NUMBER: { label: 'Number', color: 'blue' },
  DECIMAL: { label: 'Decimal', color: 'lime' },
  PERCENT: { label: 'Rate', color: 'gold' },
  DATETIME: { label: 'Date', color: 'cyan' },
  DURATION: { label: 'Time', color: 'geekblue' },
  NONE: { label: 'String', color: 'default' },
};

// 상세 패널 — 필드 구성 그리드 컬럼 (필드명·역할·타입 좁게, 표시명이 남은 폭 채움)
const FIELD_COLUMN_DEFS: ColDef<FieldMetaItem>[] = [
  { field: 'fieldName', headerName: '필드명', maxWidth: 300, cellClass: 'font-mono' },
  { field: 'displayName', headerName: '표시명', flex: 1 },
  {
    field: 'fieldRole',
    headerName: '역할',
    maxWidth: 150,
    cellStyle: { display: 'flex', alignItems: 'center' },
    cellRenderer: (p: { value?: string }) => {
      const m = FIELD_ROLE_META[p.value ?? ''] ?? { label: p.value ?? '-', color: 'default' };
      return (
        <Tag color={m.color} className="!mr-0">
          {m.label}
        </Tag>
      );
    },
  },
  {
    field: 'formatterType',
    headerName: '타입',
    maxWidth: 150,
    cellStyle: { display: 'flex', alignItems: 'center' },
    cellRenderer: (p: { value?: string | null }) => {
      const m = FIELD_FORMAT_META[p.value ?? 'NONE'] ?? FIELD_FORMAT_META.NONE;
      return (
        <Tag color={m.color} className="!mr-0">
          {m.label}
        </Tag>
      );
    },
  },
];

// 액션 버튼 툴팁 — 공통 컴팩트 규격
const TOOLTIP_PROPS = {
  mouseEnterDelay: 0.5,
  styles: { container: { minHeight: 'auto', fontSize: 12, lineHeight: '16px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
} as const;

export default function StatDatasetList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  // 시스템 데이터셋은 시스템 관리자만 삭제 가능
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'user'>('all');
  const [statusPopOpen, setStatusPopOpen] = useState(false);
  const [typePopOpen, setTypePopOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setBreadcrumb([
      { title: '통계', path: '/insight/statistics' },
      { title: '데이터셋', path: '/insight/statistics/datasets' },
    ]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: datasets = [], isLoading } = useGetDatasets();

  const { mutate: deleteDataset } = useDeleteDataset({
    mutationOptions: {
      onSuccess: (_, deletedId) => {
        queryClient.invalidateQueries({ queryKey: datasetKeys.list._def });
        if (selectedId === deletedId) setSelectedId(null);
        toast.success('데이터셋이 삭제되었습니다.');
      },
      onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
    },
  });

  // 태그 시드 적용본 — 목록·필터·상세가 공유
  const tagged = datasets.map((d) => ({ d, tags: seedTags(d) }));

  // 전체 태그 빈도 (필터 패널용, 빈도 내림차순)
  const tagCounts: Record<string, number> = {};
  tagged.forEach(({ tags }) => tags.forEach((t) => (tagCounts[t] = (tagCounts[t] ?? 0) + 1)));
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  // 검색(fuzzy: 이름·DB뷰Prefix) + 태그 필터(AND)
  const kw = search.trim();
  const filtered = tagged.filter(({ d, tags }) => {
    const tagPass = selectedTags.length === 0 || selectedTags.every((t) => tags.includes(t));
    if (!tagPass) return false;
    const statusPass = statusFilter === 'all' || (statusFilter === 'active' ? d.isActive : !d.isActive);
    if (!statusPass) return false;
    const typePass = typeFilter === 'all' || (typeFilter === 'system' ? d.isSystem : !d.isSystem);
    if (!typePass) return false;
    if (!kw) return true;
    return fuzzyScore(kw, d.datasourceName) >= 0 || fuzzyScore(kw, d.dbViewPrefix ?? '') >= 0;
  });

  const isFiltering = selectedTags.length > 0;
  const selected = selectedId != null ? (datasets.find((d) => d.datasetId === selectedId) ?? null) : null;

  const toggleTag = (t: string) => setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const clearTags = () => setSelectedTags([]);

  // 선택한 태그를 앞쪽으로 정렬 (stable — 동순위는 원래 순서 유지)
  const orderTags = (tags: string[]) => [...tags].sort((a, b) => (selectedTags.includes(a) ? 0 : 1) - (selectedTags.includes(b) ? 0 : 1));

  const handleSelect = (id: number) => setSelectedId((prev) => (prev === id ? null : id)); // 재클릭 시 해제 → 안내 화면 복귀
  const handleCreate = () => navigate('/insight/statistics/datasets/new');
  const handleEditDataset = (d: DatasetListItem) => navigate(`/insight/statistics/datasets/${d.datasetId}/edit`);
  const handleDeleteDataset = (d: DatasetListItem) => modal.confirm.delete({ onOk: () => deleteDataset(d.datasetId) });

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 태그 필터 + 데이터셋 목록 */}
        <div className="w-[340px] shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="데이터셋 이름·뷰 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
              추가
            </Button>
          </div>

          {/* 태그 필터 (접이식, 다중 선택) */}
          <div className="rounded-md bg-gray-50">
            <button type="button" onClick={() => setFilterOpen((o) => !o)} className="flex w-full items-center justify-between px-2.5 py-2 select-none">
              <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                <Tags className="size-3.5" />
                태그 필터
                {isFiltering && <span className="ml-1 rounded-full bg-[var(--color-bt-primary)] px-1.5 text-[10px] font-bold text-white">{selectedTags.length}</span>}
              </span>
              <span className="flex items-center gap-2">
                {isFiltering && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTags();
                    }}
                    className="text-xs text-[var(--color-bt-primary)] hover:underline"
                  >
                    초기화
                  </span>
                )}
                <ChevronDown className={`size-4 text-gray-400 transition-transform ${filterOpen ? '' : '-rotate-90'}`} />
              </span>
            </button>
            {filterOpen && (
              <div className="px-2.5 pb-2.5">
                {sortedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-auto">
                    {sortedTags.map(([t, c]) => (
                      <Tag.CheckableTag
                        key={t}
                        checked={selectedTags.includes(t)}
                        onChange={() => toggleTag(t)}
                        className={`!m-0 !px-2.5 !py-0.5 !rounded-full !text-xs !border ${
                          selectedTags.includes(t) ? '!border-transparent' : '!border-gray-200 !bg-white !text-gray-600'
                        }`}
                      >
                        {t} <span className="opacity-60">{c}</span>
                      </Tag.CheckableTag>
                    ))}
                  </div>
                ) : (
                  <div className="py-2 text-center text-[11px] text-gray-400">태그 없음</div>
                )}
              </div>
            )}
          </div>

          {/* 상태·유형 필터 (as-is 솔루션/도메인 칩 셀렉트 패턴) */}
          <div className="flex flex-wrap gap-2">
            <ChipSelect
              open={statusPopOpen}
              onOpenChange={setStatusPopOpen}
              label="상태"
              valueLabel={STATUS_OPTS.find(([v]) => v === statusFilter)?.[1] ?? '전체'}
              active={statusFilter !== 'all'}
              content={STATUS_OPTS.map(([v, label]) => (
                <ChipOption
                  key={v}
                  active={statusFilter === v}
                  onClick={() => {
                    setStatusFilter(v);
                    setStatusPopOpen(false);
                  }}
                >
                  {label}
                </ChipOption>
              ))}
            />
            <ChipSelect
              open={typePopOpen}
              onOpenChange={setTypePopOpen}
              label="유형"
              valueLabel={TYPE_OPTS.find(([v]) => v === typeFilter)?.[1] ?? '전체'}
              active={typeFilter !== 'all'}
              content={TYPE_OPTS.map(([v, label]) => (
                <ChipOption
                  key={v}
                  active={typeFilter === v}
                  onClick={() => {
                    setTypeFilter(v);
                    setTypePopOpen(false);
                  }}
                >
                  {label}
                </ChipOption>
              ))}
            />
          </div>

          <div className="border-t border-gray-200" />

          {/* 목록 헤더 */}
          <div className="flex items-center gap-1.5 px-1 shrink-0">
            <span className="text-[12.5px] text-gray-700 font-semibold">데이터셋</span>
            <span className="text-[11px] text-gray-400">{filtered.length}</span>
          </div>

          {/* 평탄 목록 */}
          <div className="flex-1 overflow-auto -mx-1 flex flex-col gap-0.5">
            {isLoading ? (
              <FallbackSpinner />
            ) : filtered.length > 0 ? (
              filtered.map(({ d, tags }) => (
                <DatasetRow
                  key={d.datasetId}
                  d={d}
                  tags={orderTags(tags)}
                  selected={d.datasetId === selectedId}
                  showTags={isFiltering}
                  search={search}
                  canDelete={!d.isSystem || isSystemAdmin}
                  onSelect={() => handleSelect(d.datasetId)}
                  onEdit={() => handleEditDataset(d)}
                  onDelete={() => handleDeleteDataset(d)}
                />
              ))
            ) : (
              <div className="px-3 py-6 text-center text-[11px] text-gray-400">{kw || isFiltering ? '검색 결과 없음' : '등록된 데이터셋이 없습니다.'}</div>
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col">
          {selected ? (
            <DatasetDetailPanel
              key={selected.datasetId}
              listItem={selected}
              tags={seedTags(selected)}
              onEdit={() => navigate(`/insight/statistics/datasets/${selected.datasetId}/edit`)}
              onDelete={() => modal.confirm.delete({ onOk: () => deleteDataset(selected.datasetId) })}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-gray-400">
              <Tags className="size-10 opacity-40" />
              <div className="text-sm">좌측에서 데이터셋을 선택해주세요</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 목록 행 ─────────────────────────────────────────────────────────────────
// 기본은 이름 + 시스템/비활성 뱃지(+hover 액션)만. 태그 필터 중일 때만 태그 한 줄을
// 노출하고, 한 줄을 넘으면 +N 으로 접는다 (fca BotCard useWrappedItemCount 패턴).

function DatasetRow({
  d,
  tags,
  selected,
  showTags,
  search,
  canDelete,
  onSelect,
  onEdit,
  onDelete,
}: {
  d: DatasetListItem;
  tags: string[];
  selected: boolean;
  showTags: boolean;
  search: string;
  canDelete: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // DB 뷰 Prefix 보조 표기 — 이름이 아닌 prefix 로 검색 매칭됐을 때만 노출 (기존 tree 로직)
  const kw = search.trim();
  const prefix = d.dbViewPrefix ?? '';
  const prefixMatched = !!kw && !!prefix && fuzzyScore(kw, prefix) >= 0 && fuzzyScore(kw, d.datasourceName) < 0;

  return (
    <div
      onClick={onSelect}
      className={`group flex flex-col gap-1 px-3 py-2 rounded-md cursor-pointer border-l-[3px] transition ${
        selected ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]' : 'border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 flex flex-col">
          <span className={`truncate text-[13px] ${selected ? 'text-[var(--color-bt-primary)] font-medium' : 'text-gray-800'}`}>
            <Highlight text={d.datasourceName} query={search} />
          </span>
          {prefixMatched && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-gray-400 leading-tight">
              <Database className="size-3 flex-shrink-0" />
              <span className="truncate">
                <Highlight text={prefix} query={search} />
              </span>
            </span>
          )}
        </span>
        {/* 뱃지 — hover 시 숨김 */}
        <span className="inline-flex items-center gap-1 shrink-0 group-hover:hidden">
          {d.isSystem && (
            <Tag color="purple" className="!mb-0 !mr-0 !text-[10px] !px-1 !py-0 !leading-4">
              시스템
            </Tag>
          )}
          {!d.isActive && (
            <Tag color="default" className="!mb-0 !mr-0 !text-[10px] !px-1 !py-0 !leading-4">
              비활성
            </Tag>
          )}
        </span>
        {/* 액션 — hover 시 노출 */}
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <Tooltip title="편집" {...TOOLTIP_PROPS}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] transition"
            >
              <Pencil className="size-3.5" />
            </button>
          </Tooltip>
          {canDelete && (
            <Tooltip title="삭제" {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Tooltip>
          )}
        </span>
      </div>

      {/* 태그 — 필터 중일 때만. 한 줄 고정 + 넘치면 +N. 순서 바뀌면 remount 해 +N 재계산 */}
      {showTags && tags.length > 0 && <TagLine key={tags.join('|')} tags={tags} />}
    </div>
  );
}

// 태그 한 줄 — 한 줄을 넘어 둘째 줄로 밀린 개수를 +N 으로 접는다 (fca BotCard 패턴).
// showTags 토글 시 mount/unmount 되므로 effect deps 없이 mount 시 1회 계산하면 충분하다.
function TagLine({ tags }: { tags: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wrappedCount, setWrappedCount] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current;
      if (!el || el.children.length === 0) return;
      const firstTop = (el.children[0] as HTMLElement).getBoundingClientRect().top;
      let count = 0;
      for (let i = 1; i < el.children.length; i++) {
        if ((el.children[i] as HTMLElement).getBoundingClientRect().top > firstTop + 1) count++;
      }
      setWrappedCount(count);
    };
    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex items-start gap-1 w-full">
      <div ref={containerRef} className="flex flex-wrap gap-1 overflow-hidden flex-1 min-w-0" style={{ height: 22 }}>
        {tags.map((t) => (
          <span key={t} className="rounded border border-bt-border bg-bt-bg-muted px-1.5 py-0 text-[10px] leading-5 text-bt-fg-muted">
            {t}
          </span>
        ))}
      </div>
      {wrappedCount > 0 && <span className="shrink-0 inline-flex items-center h-5 rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500">+{wrappedCount}</span>}
    </div>
  );
}

// ─── 상세 패널 (선택 데이터셋 1건 — datasetId 로 remount) ─────────────────────────

function DatasetDetailPanel({ listItem, tags, onEdit, onDelete }: { listItem: DatasetListItem; tags: string[]; onEdit: () => void; onDelete: () => void }) {
  const modal = useModal();
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const canDelete = !listItem.isSystem || isSystemAdmin;
  const { gridOptions } = useAggridOptions();

  const { data: detail, isLoading } = useGetDataset({ params: { datasetId: listItem.datasetId } });

  // 시스템 데이터셋 승격/해제 — 시스템 관리자 전용 (편집 화면에서 이관)
  const { mutate: setSystemFlag, isPending: isFlagPending } = useSetDatasetSystemFlag({
    mutationOptions: {
      onSuccess: (_, { toSystem }) => toast.success(toSystem ? '시스템 데이터셋으로 승격되었습니다.' : '시스템 데이터셋 승격이 해제되었습니다.'),
      onError: () => toast.error('처리 중 오류가 발생했습니다.'),
    },
  });

  const handleToggleSystem = () => {
    const toSystem = !listItem.isSystem;
    modal.confirm.execute({
      onOk: () => setSystemFlag({ datasetId: listItem.datasetId, toSystem }),
      options: {
        title: toSystem ? '시스템 데이터셋 승격' : '시스템 데이터셋 승격 해제',
        content: toSystem
          ? '시스템 데이터셋으로 승격하면 모든 사용자에게 노출되며, 수정/삭제는 관리자만 가능합니다. 계속하시겠습니까?'
          : '승격을 해제하면 등록 테넌트 소유의 일반 데이터셋으로 복귀합니다. 계속하시겠습니까?',
        okText: '확인',
        cancelText: '취소',
      },
    });
  };

  const units: string[] = Array.isArray(listItem.availableUnits) ? listItem.availableUnits : [];
  const fields = detail?.fields ?? [];

  // 필드 카운트 (CALC / MEASURE / 나머지=차원)
  const calcCount = fields.filter((f) => f.fieldRole === 'CALC').length;
  const msrCount = fields.filter((f) => f.fieldRole === 'MEASURE').length;
  const dimCount = fields.length - calcCount - msrCount;

  const createdBy = detail?.createdByName || detail?.createdBy || (listItem.isSystem ? '시스템' : '-');
  const fmtDate = (v?: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-');

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-bt-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-semibold text-bt-fg truncate">{listItem.datasourceName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSystemAdmin && (
            <Button loading={isFlagPending} onClick={handleToggleSystem}>
              {listItem.isSystem ? '시스템 승격 해제' : '시스템 데이터셋으로 승격'}
            </Button>
          )}
          <Button icon={<Pencil className="size-3.5" />} onClick={onEdit}>
            편집
          </Button>
          {canDelete && (
            <Button danger icon={<Trash2 className="size-3.5" />} onClick={onDelete}>
              삭제
            </Button>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 flex flex-col px-6 py-5">
        {/* 데이터셋 요약 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          <DetailField className="col-span-2 md:col-span-3" label="설명" value={listItem.description || '-'} />
          <DetailField label="데이터셋 ID" value={<span className="font-mono">{listItem.datasetId}</span>} />
          <DetailField
            label="상태"
            value={
              listItem.isActive ? (
                <Tag color="success" className="!mb-0 !mr-0">
                  활성
                </Tag>
              ) : (
                <Tag color="default" className="!mb-0 !mr-0">
                  비활성
                </Tag>
              )
            }
          />
          <DetailField
            label="유형"
            value={
              listItem.isSystem ? (
                <Tag color="purple" className="!mb-0 !mr-0">
                  시스템
                </Tag>
              ) : (
                <Tag color="default" className="!mb-0 !mr-0">
                  사용자
                </Tag>
              )
            }
          />
          <DetailField label="DB 뷰 Prefix" value={<span className="font-mono">{listItem.dbViewPrefix || '-'}</span>} />
          <DetailField
            label="지원 단위"
            value={
              units.length ? (
                <span className="flex flex-wrap gap-1">
                  {units.map((u) => (
                    <span key={u} className="rounded border border-bt-border bg-bt-bg-muted px-2 py-0.5 text-xs font-mono text-bt-fg-muted">
                      {UNIT_LABEL[u] ?? u}
                    </span>
                  ))}
                </span>
              ) : (
                '-'
              )
            }
          />
          <DetailField label="생성자" value={createdBy} />
          <DetailField label="생성일" value={fmtDate(detail?.createdAt)} />
          <DetailField label="수정일" value={fmtDate(detail?.updatedAt)} />
        </div>

        {/* 태그 — 필드 구성 위 */}
        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-bt-fg-muted mb-2 flex items-center gap-1.5">
            <Tags className="size-3.5" />
            태그
          </div>
          {tags.length ? (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="rounded border border-bt-border bg-bt-bg-muted px-2 py-0.5 text-xs text-bt-fg-muted">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-bt-fg-muted">-</span>
          )}
        </div>

        {/* 필드 메타 */}
        <div className="mt-7 flex-1 min-h-0 flex flex-col">
          <div className="flex items-baseline gap-2 mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-bt-fg">필드 구성</h3>
            {fields.length > 0 && (
              <span className="text-xs text-bt-fg-muted">
                총 {fields.length} · 차원 {dimCount} · 측정값 {msrCount} · 계산 {calcCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 bg-white bt-shadow">
            <AgGridReact<FieldMetaItem>
              {...gridOptions}
              rowData={fields}
              columnDefs={FIELD_COLUMN_DEFS}
              getRowId={(p) => String(p.data.id ?? p.data.fieldName)}
              loading={isLoading}
              pagination={false}
              statusBar={undefined}
              sideBar={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 상태·유형 칩 셀렉트 (as-is 솔루션/도메인 패턴: 트리거 칩 + 팝오버 내부 칩)
function ChipSelect({
  open,
  onOpenChange,
  label,
  valueLabel,
  active,
  content,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  valueLabel: string;
  active: boolean;
  content: ReactNode;
}) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger="click"
      placement="bottomLeft"
      content={<div className="flex w-[160px] flex-wrap gap-1.5 max-h-[220px] overflow-auto">{content}</div>}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs transition ${
          active
            ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]'
            : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]'
        }`}
      >
        <span>
          {label}: {valueLabel}
        </span>
        <ChevronDown className="size-3.5" />
      </button>
    </Popover>
  );
}

function ChipOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] transition ${
        active
          ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

function DetailField({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-bt-fg-muted mb-1">{label}</div>
      <div className="text-sm text-bt-fg">{value}</div>
    </div>
  );
}
