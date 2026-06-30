import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Input, Popover, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Hash, Plus, Search, SquarePen, TableProperties, Tags, Trash2, X } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { BaseTagChip, isBaseTag } from '../../components/statTag';
import { datasetKeys, useDeleteDataset, useGetDataset, useGetDatasets, useSetDatasetSystemFlag, useUpdateDataset } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem, FieldMetaItem } from '../../features/dataset/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const UNIT_LABEL: Record<string, string> = { MI: '10분', HH: '시간', DD: '일', MM: '월', YY: '연' };

// 상세 패널 — 역할/타입(서식) 뱃지 명칭은 편집화면(WizardStepB) 기준
const FIELD_ROLE_META: Record<string, { label: string; color: string }> = {
  DIMENSION: { label: '디멘션', color: 'purple' },
  TIMESTAMP: { label: '디멘션', color: 'purple' },
  MEASURE: { label: '측정값', color: 'volcano' },
  CALC: { label: '계산필드', color: 'green' },
};
const FIELD_FORMAT_META: Record<string, { label: string; color: string }> = {
  NUMBER: { label: 'Number', color: 'blue' },
  DECIMAL: { label: 'Decimal', color: 'lime' },
  PERCENT: { label: 'Rate', color: 'gold' },
  DATETIME: { label: 'Date', color: 'cyan' },
  DURATION: { label: 'Time', color: 'geekblue' },
  NONE: { label: 'String', color: 'default' },
};

const FIELD_COLUMN_DEFS: ColDef<FieldMetaItem>[] = [
  {
    field: 'isVisible',
    headerName: '사용',
    maxWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    cellRenderer: (p: { value?: boolean }) => (
      <Tag color={p.value === false ? 'default' : 'success'} className="!mr-0">
        {p.value === false ? '미사용' : '사용'}
      </Tag>
    ),
  },
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

const TOOLTIP_PROPS = {
  mouseEnterDelay: 0.5,
  styles: { container: { minHeight: 'auto', fontSize: 12, lineHeight: '16px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
} as const;

type StatusFilter = 'all' | 'active' | 'inactive';
type TypeFilter = 'all' | 'system' | 'user';

const STATUS_OPTS: [StatusFilter, string][] = [
  ['all', '전체'],
  ['active', '활성'],
  ['inactive', '비활성'],
];
const TYPE_OPTS: [TypeFilter, string][] = [
  ['all', '전체'],
  ['system', '시스템'],
  ['user', '사용자'],
];

const grayChip = (t: string) => (
  <span key={t} className="shrink-0 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
    {t}
  </span>
);

export default function StatDatasetList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusPopOpen, setStatusPopOpen] = useState(false);
  const [typePopOpen, setTypePopOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);

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

  // 태그 집계 (내림차순 빈도)
  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    datasets.forEach((d) => (d.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [datasets]);

  // 등록된 태그가 있으면 필터를 최초 1회 자동 펼침 (이후 수동 토글 존중)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenedRef.current && sortedTags.length > 0) {
      autoOpenedRef.current = true;
      setFilterOpen(true);
    }
  }, [sortedTags]);

  const kw = search.trim().toLowerCase();
  const isFiltering = selectedTags.size > 0;

  // 가시 목록 (태그 AND + 상태 + 유형 + 검색)
  const visible = useMemo(
    () =>
      datasets.filter((d) => {
        const tags = d.tags ?? [];
        if (selectedTags.size && ![...selectedTags].every((t) => tags.includes(t))) return false;
        if (statusFilter !== 'all' && (statusFilter === 'active' ? !d.isActive : d.isActive)) return false;
        if (typeFilter !== 'all' && (typeFilter === 'system' ? !d.isSystem : d.isSystem)) return false;
        if (kw) {
          const hay = `${d.datasourceName} ${d.dbViewPrefix ?? ''} ${tags.join(' ')}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      }),
    [datasets, selectedTags, statusFilter, typeFilter, kw],
  );

  // 선택 항목이 가시목록에서 빠지면 첫 항목으로 보정
  useEffect(() => {
    if (selectedId != null && !visible.some((d) => d.datasetId === selectedId)) {
      setSelectedId(visible[0]?.datasetId ?? null);
    }
  }, [visible, selectedId]);

  const selected = selectedId != null ? (datasets.find((d) => d.datasetId === selectedId) ?? null) : null;

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const orderTags = (tags: string[]) => [...tags].sort((a, b) => (selectedTags.has(a) ? 0 : 1) - (selectedTags.has(b) ? 0 : 1));

  const handleCreate = () => navigate('/insight/statistics/datasets/new');
  const handleEditFields = (d: DatasetListItem) => navigate(`/insight/statistics/datasets/${d.datasetId}/edit`);
  const handleDelete = (d: DatasetListItem) => modal.confirm.delete({ onOk: () => deleteDataset(d.datasetId) });

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* ───────── 좌측: 검색 + 태그필터 + 칩 + 목록 ───────── */}
        <div className="w-[340px] shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="데이터셋 이름·뷰·태그 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
              추가
            </Button>
          </div>

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

          {/* 상태·유형 칩 셀렉트 */}
          <div className="flex flex-wrap gap-2">
            <ChipSelect
              open={statusPopOpen}
              onOpenChange={setStatusPopOpen}
              label="상태"
              valueLabel={STATUS_OPTS.find(([v]) => v === statusFilter)![1]}
              active={statusFilter !== 'all'}
              content={STATUS_OPTS.map(([v, l]) => (
                <ChipOption
                  key={v}
                  active={statusFilter === v}
                  onClick={() => {
                    setStatusFilter(v);
                    setStatusPopOpen(false);
                  }}
                >
                  {l}
                </ChipOption>
              ))}
            />
            <ChipSelect
              open={typePopOpen}
              onOpenChange={setTypePopOpen}
              label="유형"
              valueLabel={TYPE_OPTS.find(([v]) => v === typeFilter)![1]}
              active={typeFilter !== 'all'}
              content={TYPE_OPTS.map(([v, l]) => (
                <ChipOption
                  key={v}
                  active={typeFilter === v}
                  onClick={() => {
                    setTypeFilter(v);
                    setTypePopOpen(false);
                  }}
                >
                  {l}
                </ChipOption>
              ))}
            />
          </div>

          <div className="border-t border-gray-200" />

          {/* 목록 헤더 */}
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-[12.5px] font-semibold text-gray-700">데이터셋</span>
            <span className="text-[11px] text-gray-400">{visible.length}</span>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-auto -mx-1">
            {isLoading ? (
              <FallbackSpinner />
            ) : visible.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-gray-400">{kw || isFiltering ? '검색 결과 없음' : '등록된 데이터셋이 없습니다.'}</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {visible.map((d) => {
                  const on = d.datasetId === selectedId;
                  return (
                    <div
                      key={d.datasetId}
                      onClick={() => setSelectedId((prev) => (prev === d.datasetId ? null : d.datasetId))}
                      className={`group flex cursor-pointer flex-col gap-1 rounded-md border-l-[3px] px-3 py-2 transition ${
                        on ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)]' : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 min-w-0 truncate text-[13px] ${on ? 'font-medium text-[var(--color-bt-primary)]' : 'text-gray-800'}`}>{d.datasourceName}</span>
                        {/* 뱃지 — hover 시 숨김 */}
                        <span className="inline-flex shrink-0 items-center gap-1 group-hover:hidden">
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
                        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                          <RowAction
                            title="정보수정"
                            onClick={() => {
                              setSelectedId(d.datasetId);
                              setDrawerId(d.datasetId);
                            }}
                          >
                            <SquarePen className="size-3.5" />
                          </RowAction>
                          <RowAction title="필드편집" onClick={() => handleEditFields(d)}>
                            <TableProperties className="size-3.5" />
                          </RowAction>
                          {(!d.isSystem || isSystemAdmin) && (
                            <RowAction title="삭제" danger onClick={() => handleDelete(d)}>
                              <Trash2 className="size-3.5" />
                            </RowAction>
                          )}
                        </span>
                      </div>
                      {/* 태그 필터링 중일 때만 태그 행 노출 (선택 태그 우선 정렬) */}
                      {isFiltering && (d.tags?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 overflow-hidden" style={{ maxHeight: 22 }}>
                          {orderTags(d.tags ?? []).map((t) =>
                            isBaseTag(t) ? (
                              <BaseTagChip key={t} tag={t} />
                            ) : (
                              <span
                                key={t}
                                className={`shrink-0 rounded border px-1.5 leading-5 text-[10px] ${
                                  selectedTags.has(t)
                                    ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]'
                                    : 'border-gray-200 bg-gray-50 text-gray-500'
                                }`}
                              >
                                {t}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ───────── 우측: 상세 ───────── */}
        <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col">
          {selected ? (
            <DatasetDetailPanel
              key={selected.datasetId}
              listItem={selected}
              onInfoEdit={() => setDrawerId(selected.datasetId)}
              onFieldEdit={() => handleEditFields(selected)}
              onDelete={() => modal.confirm.delete({ onOk: () => deleteDataset(selected.datasetId) })}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
              <Tags className="size-10 opacity-40" />
              <div className="text-sm">좌측에서 데이터셋을 선택해주세요</div>
            </div>
          )}
        </div>
      </div>

      {/* ───────── 정보수정 Drawer ───────── */}
      <InfoDrawer datasetId={drawerId} dataset={datasets.find((d) => d.datasetId === drawerId) ?? null} onClose={() => setDrawerId(null)} />
    </div>
  );
}

// ─── 행 액션 버튼 ────────────────────────────────────────────────────────────
function RowAction({ title, danger, onClick, children }: { title: string; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip title={title} {...TOOLTIP_PROPS}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 transition ${
          danger ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

// ─── 칩 셀렉트 ───────────────────────────────────────────────────────────────
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
    <Popover open={open} onOpenChange={onOpenChange} trigger="click" placement="bottomLeft" content={<div className="flex w-[140px] flex-wrap gap-1.5">{content}</div>}>
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

// ─── 상세 패널 ───────────────────────────────────────────────────────────────
function DatasetDetailPanel({ listItem, onInfoEdit, onFieldEdit, onDelete }: { listItem: DatasetListItem; onInfoEdit: () => void; onFieldEdit: () => void; onDelete: () => void }) {
  const modal = useModal();
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const canDelete = !listItem.isSystem || isSystemAdmin;
  const { gridOptions } = useAggridOptions();

  const { data: detail, isLoading } = useGetDataset({ params: { datasetId: listItem.datasetId } });

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
  // 편집화면(WizardStepB)과 동일 정렬 — 사용(isVisible) 컬럼을 sortOrder대로 위에, 미사용은 맨 아래로
  const sortedFields = [...fields].sort((a, b) => {
    if (a.isVisible !== b.isVisible) return a.isVisible ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  const tags = detail?.tags ?? listItem.tags ?? [];

  const calcCount = fields.filter((f) => f.fieldRole === 'CALC').length;
  const msrCount = fields.filter((f) => f.fieldRole === 'MEASURE').length;
  const dimCount = fields.length - calcCount - msrCount;

  const createdBy = detail?.createdByName || detail?.createdBy || (listItem.isSystem ? '시스템' : '-');
  const fmtDate = (v?: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-');

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-bt-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-bt-fg">{listItem.datasourceName}</h2>
            {listItem.isActive ? (
              <Tag color="success" className="!mb-0 !mr-0">
                활성
              </Tag>
            ) : (
              <Tag color="default" className="!mb-0 !mr-0">
                비활성
              </Tag>
            )}
            {listItem.isSystem ? (
              <Tag color="purple" className="!mb-0 !mr-0">
                시스템
              </Tag>
            ) : (
              <Tag color="default" className="!mb-0 !mr-0">
                사용자
              </Tag>
            )}
          </div>
          {listItem.description && <p className="mt-1 text-sm text-gray-500">{listItem.description}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isSystemAdmin && (
            <Button loading={isFlagPending} onClick={handleToggleSystem}>
              {listItem.isSystem ? '시스템 승격 해제' : '시스템 데이터셋으로 승격'}
            </Button>
          )}
          <Button icon={<SquarePen className="size-3.5" />} onClick={onInfoEdit}>
            정보수정
          </Button>
          <Button icon={<TableProperties className="size-3.5" />} onClick={onFieldEdit}>
            필드편집
          </Button>
          {canDelete && (
            <Button danger icon={<Trash2 className="size-3.5" />} onClick={onDelete}>
              삭제
            </Button>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          <DetailField label="데이터셋 ID" value={<span className="font-mono">{listItem.datasetId}</span>} />
          <DetailField label="상태" value={listItem.isActive ? '활성' : '비활성'} />
          <DetailField label="유형" value={listItem.isSystem ? '시스템' : '사용자'} />
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
          <DetailField label="필드 수" value={fields.length} />
          <DetailField label="생성자" value={createdBy} />
          <DetailField label="생성일" value={fmtDate(detail?.createdAt)} />
          <DetailField label="수정일" value={fmtDate(detail?.updatedAt)} />
        </div>

        {/* 태그 */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-bt-fg-muted">
            <Tags className="size-3.5" />
            태그
          </div>
          {tags.length ? (
            <div className="flex flex-wrap items-center gap-1.5">{tags.map((t) => (isBaseTag(t) ? <BaseTagChip key={t} tag={t} /> : grayChip(t)))}</div>
          ) : (
            <span className="text-sm text-gray-400">등록된 태그 없음</span>
          )}
        </div>

        {/* 필드 구성 */}
        <div className="flex-1 min-h-0 flex flex-col">
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
              rowData={sortedFields}
              columnDefs={FIELD_COLUMN_DEFS}
              getRowId={(p) => String(p.data.id ?? p.data.fieldName)}
              getRowClass={(p) => (p.data?.isVisible === false ? 'opacity-40' : undefined)}
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

function DetailField({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-bt-fg-muted mb-1">{label}</div>
      <div className="text-sm text-bt-fg">{value}</div>
    </div>
  );
}

// ─── 정보수정 Drawer (이름·설명·태그) ────────────────────────────────────────
const MAX_TAGS = 5;

function InfoDrawer({ datasetId, dataset, onClose }: { datasetId: number | null; dataset: DatasetListItem | null; onClose: () => void }) {
  const open = datasetId != null;
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const { detail } = useDrawerDetail(datasetId);

  // 드로어 오픈 시 값 초기화 (상세 로드되면 태그/설명 보강)
  useEffect(() => {
    if (!open) return;
    setName(dataset?.datasourceName ?? '');
    setDesc(detail?.description ?? dataset?.description ?? '');
    setTags(detail?.tags ?? dataset?.tags ?? []);
    setTagInput('');
    // dataset/detail 변화 반영
  }, [open, dataset, detail]);

  const { mutate: updateDataset, isPending } = useUpdateDataset({
    mutationOptions: {
      onSuccess: () => {
        toast.success('데이터셋 정보가 수정되었습니다.');
        onClose();
      },
      onError: () => toast.error('저장 중 오류가 발생했습니다.'),
    },
  });

  const addTag = () => {
    const v = tagInput.trim().replace(/,$/, '').trim();
    if (v && !tags.includes(v) && tags.length < MAX_TAGS) setTags((p) => [...p, v]);
    setTagInput('');
  };

  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((p) => p.slice(0, -1));
    }
  };

  const handleSave = () => {
    if (datasetId == null) return;
    if (!name.trim()) {
      toast.error('데이터셋 이름을 입력하세요.');
      return;
    }
    updateDataset({
      datasetId,
      // dbViewPrefix는 @NotBlank(생성/수정 공용 DTO) — 정보수정 시에도 기존 값 전송 (백엔드는 동일 prefix면 재검출 안 함)
      data: { datasourceName: name.trim(), description: desc.trim(), tags, dbViewPrefix: detail?.dbViewPrefix ?? dataset?.dbViewPrefix },
    });
  };

  return (
    <Drawer
      title="데이터셋 정보 수정"
      width={440}
      open={open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isPending} onClick={handleSave}>
            저장
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> 데이터셋 이름
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="데이터셋 이름" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">설명</label>
          <Input.TextArea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={500} placeholder="데이터셋 설명 (목록·상세에 표시)" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">태그</label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 p-1.5 focus-within:border-[var(--color-bt-primary)]">
            {tags.map((t, i) => (
              <span key={t} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600">
                {t}
                <X className="size-3 cursor-pointer text-gray-400 hover:text-gray-700" onClick={() => setTags((p) => p.filter((_, idx) => idx !== i))} />
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                className="min-w-[100px] flex-1 px-1 text-sm outline-none"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={addTag}
                placeholder="태그 입력 (Enter·쉼표로 추가)"
              />
            )}
          </div>
          <span className="text-xs text-gray-400">
            Enter 또는 쉼표로 추가, 칩의 ×로 삭제 — 최대 {MAX_TAGS}개 ({tags.length}/{MAX_TAGS})
          </span>
        </div>
      </div>
    </Drawer>
  );
}

// 드로어 전용 상세 로드 (태그·설명 최신값)
function useDrawerDetail(datasetId: number | null) {
  const { data: detail } = useGetDataset({
    params: { datasetId: datasetId ?? 0 },
    queryOptions: { enabled: datasetId != null },
  });
  return { detail };
}
