import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Popover, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { fuzzyScore, toast } from '@/shared-util';
import { monitoringDatasetKeys, useDeleteMonitoringDataset, useGetMonitoringDataset, useGetMonitoringDatasets } from '../../features/monitoring/hooks/useDatasetQueries';
import type { CalcField, DatasetField, DatasetListItem } from '../../features/monitoring/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Highlight } from '@/components/custom/Highlight';
import { TreeRow } from '@/components/custom/TreeView';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

// 필드 역할 뱃지 — 편집화면(WizardStepB) 기준 명칭
const FIELD_ROLE_META: Record<string, { label: string; color: string }> = {
  DIM: { label: '차원', color: 'purple' },
  MSR: { label: '측정값', color: 'volcano' },
  CALC: { label: '계산필드', color: 'green' },
};
// columnFormat → 서식 명칭 (역할 색상과 겹치지 않게 분리)
const FIELD_FORMAT_META: Record<string, { label: string; color: string }> = {
  Number: { label: 'Number', color: 'blue' },
  Decimal: { label: 'Decimal', color: 'lime' },
  Rate: { label: 'Rate', color: 'gold' },
  Date: { label: 'Date', color: 'cyan' },
  Time: { label: 'Time', color: 'geekblue' },
  String: { label: 'String', color: 'default' },
};

const TOOLTIP_PROPS = {
  mouseEnterDelay: 0.5,
  styles: { container: { minHeight: 'auto', fontSize: 12, lineHeight: '16px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
} as const;

// 상세 패널 — 필드 구성 그리드 row 모델 (fields + calcFields 통합)
interface FieldRow {
  id: string;
  name: string;
  display: string;
  role: 'DIM' | 'MSR' | 'CALC';
  format: string;
  virtual?: boolean;
}

const FIELD_COLUMN_DEFS: ColDef<FieldRow>[] = [
  {
    field: 'name',
    headerName: '필드명',
    maxWidth: 300,
    cellClass: 'font-mono',
    cellRenderer: (p: { data?: FieldRow; value?: string }) => (
      <span className="inline-flex items-center gap-1">
        {p.value}
        {p.data?.virtual && (
          <Tag color="geekblue" className="!mr-0 !text-[10px] !px-1 !py-0 !leading-4">
            가상
          </Tag>
        )}
      </span>
    ),
  },
  { field: 'display', headerName: '표시명', flex: 1 },
  {
    field: 'role',
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
    field: 'format',
    headerName: '타입',
    maxWidth: 150,
    cellStyle: { display: 'flex', alignItems: 'center' },
    cellRenderer: (p: { value?: string }) => {
      const m = FIELD_FORMAT_META[p.value ?? 'String'] ?? FIELD_FORMAT_META.String;
      return (
        <Tag color={m.color} className="!mr-0">
          {m.label}
        </Tag>
      );
    },
  },
];

interface DsTreeNode {
  key: string;
  label: string;
  data: DatasetListItem; // leaf 데이터셋 (도메인 그룹 제거 — 평면 목록)
  children: DsTreeNode[];
}

export default function DatasetCatalog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [search, setSearch] = useState('');
  const [tagSel, setTagSel] = useState<string | null>(null); // null = 전체
  const [tagPopOpen, setTagPopOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setBreadcrumb([
      { title: '모니터링', path: '/insight/monitoring' },
      { title: '데이터셋', path: '/insight/monitoring/datasets' },
    ]);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: datasets = [], isLoading } = useGetMonitoringDatasets();

  const { mutate: deleteDataset } = useDeleteMonitoringDataset({
    mutationOptions: {
      onSuccess: (_, deletedId) => {
        queryClient.invalidateQueries({ queryKey: monitoringDatasetKeys.list().queryKey });
        if (selectedId === deletedId) setSelectedId(null);
        toast.success('데이터셋이 삭제되었습니다.');
      },
    },
  });

  // 데이터에 존재하는 태그 — 사용 빈도 무관, 가나다순
  const allTags = [...new Set(datasets.flatMap((d) => d.tags ?? []))].sort((a, b) => a.localeCompare(b));
  const tagCount = (tag: string) => datasets.filter((d) => (d.tags ?? []).includes(tag)).length;

  // 태그 필터 — 평면 목록 (도메인 그룹 제거)
  const filtered = tagSel ? datasets.filter((d) => (d.tags ?? []).includes(tagSel)) : datasets;
  const treeData: DsTreeNode[] = filtered.map((d) => ({ key: `ds:${d.datasetId}`, label: d.datasetName, data: d, children: [] }));

  const { items, rootProps } = useTreeView<DsTreeNode>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    searchText: search,
    matchesSearch: (n, kw) => fuzzyScore(kw, n.data.datasetName) >= 0 || fuzzyScore(kw, n.data.datasetCode ?? '') >= 0,
    defaultExpandAll: true,
    ariaLabel: '데이터셋 목록',
  });

  const selectedKey = selectedId != null ? `ds:${selectedId}` : null;
  const selected = selectedId != null ? (datasets.find((d) => d.datasetId === selectedId) ?? null) : null;

  const handleSelectNode = (node: DsTreeNode) => {
    const id = node.data.datasetId;
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleCreate = () => navigate('/insight/monitoring/datasets/create');
  const handleEditDataset = (d: DatasetListItem) => navigate(`/insight/monitoring/datasets/${d.datasetId}/edit`);
  const handleDeleteDataset = (d: DatasetListItem) => {
    if (d.usageWidgetCount > 0) {
      toast.warning('사용 중인 위젯이 있어 삭제할 수 없습니다.');
      return;
    }
    modal.confirm.delete({ onOk: () => deleteDataset(d.datasetId) });
  };

  const handlePickTag = (tag: string | null) => {
    setTagSel(tag);
    setTagPopOpen(false);
  };

  const tagLabel = tagSel ?? '전체';

  const renderRow = (item: TreeViewItem<DsTreeNode>) => {
    const node = item.node;
    const isSelected = node.key === selectedKey;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => handleSelectNode(node)}>
        <span className="size-2 rounded-full flex-shrink-0 bg-[var(--color-bt-primary)]" />
        <span className={`flex-1 truncate text-[13px] font-normal ${isSelected ? 'text-[var(--color-bt-primary)]' : 'text-gray-800'}`}>
          <Highlight text={node.label} query={search} />
        </span>
        <span className="ml-auto flex items-center h-5 flex-shrink-0">
          {/* 뱃지 — hover 시 숨김 (baseType) */}
          <span className="h-5 inline-flex items-center gap-1 group-hover:hidden">
            <Tag color="default" className="!mb-0 !mr-0 !text-[10px] !px-1 !py-0 !leading-4 font-mono">
              {node.data.baseType}
            </Tag>
          </span>
          {/* 액션 — hover 시 노출 */}
          <span className="hidden group-hover:flex items-center gap-0.5">
            <Tooltip title="편집" {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditDataset(node.data);
                }}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] transition"
              >
                <Pencil className="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip title="삭제" {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDataset(node.data);
                }}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
              >
                <Trash2 className="size-3.5" />
              </button>
            </Tooltip>
          </span>
        </span>
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 태그 필터 + 목록 */}
        <div className="w-[340px] shrink-0 bg-white bt-shadow p-4 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              prefix={<Search className="size-4 text-gray-400" />}
              placeholder="데이터셋 이름·코드 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="primary" icon={<Plus className="size-4" />} onClick={handleCreate}>
              추가
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <ChipSelect
              open={tagPopOpen}
              onOpenChange={setTagPopOpen}
              label="태그"
              valueLabel={tagLabel}
              active={tagSel !== null}
              content={
                <>
                  <ChipOption active={tagSel === null} onClick={() => handlePickTag(null)}>
                    전체 <span className="opacity-70">{datasets.length}</span>
                  </ChipOption>
                  {allTags.length === 0 ? (
                    <span className="px-1 py-0.5 text-[11px] text-gray-400">등록된 태그 없음</span>
                  ) : (
                    allTags.map((tag) => (
                      <ChipOption key={tag} active={tagSel === tag} onClick={() => handlePickTag(tag)}>
                        {tag} <span className="opacity-70">{tagCount(tag)}</span>
                      </ChipOption>
                    ))
                  )}
                </>
              }
            />
          </div>

          <div className="border-t border-gray-200" />

          <div className="flex-1 overflow-auto -mx-1">
            {isLoading ? (
              <FallbackSpinner />
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 select-none cursor-default">
                  <span className="text-[12.5px] truncate text-gray-700 font-semibold">데이터셋</span>
                  <span className="text-[11px] text-gray-400">{treeData.length}</span>
                </div>

                {treeData.length > 0 ? (
                  <div {...rootProps}>{items.map(renderRow)}</div>
                ) : (
                  <div className="px-3 py-6 text-center text-[11px] text-gray-400">{search || tagSel ? '검색 결과 없음' : '등록된 데이터셋이 없습니다.'}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col">
          {selected ? (
            <DatasetDetailPanel key={selected.datasetId} listItem={selected} onEdit={() => handleEditDataset(selected)} onDelete={() => handleDeleteDataset(selected)} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-8 p-6">
              <div className="text-[18px] font-bold">데이터셋 현황</div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 px-12 py-6 min-w-[160px]">
                <span className="text-[26px] font-bold text-[var(--color-bt-primary)]">
                  {datasets.length}
                  <span className="text-sm font-normal text-gray-500 ml-1">건</span>
                </span>
                <span className="text-sm text-gray-500">전체 데이터셋</span>
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-[480px]">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagSel(tag)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-[var(--color-bt-primary)] hover:text-[var(--color-bt-primary)]"
                    >
                      {tag} <span className="opacity-70">{tagCount(tag)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="text-sm text-gray-400">좌측 목록에서 데이터셋을 선택해주세요</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 칩 셀렉트 (통계 데이터셋과 동일 패턴) ──────────────────────────────────────

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
      content={<div className="flex w-[220px] flex-wrap gap-1.5 max-h-[220px] overflow-auto">{content}</div>}
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

// ─── 상세 패널 (선택 데이터셋 1건 — datasetId 로 remount) ─────────────────────────

function DatasetDetailPanel({ listItem, onEdit, onDelete }: { listItem: DatasetListItem; onEdit: () => void; onDelete: () => void }) {
  const { gridOptions } = useAggridOptions();
  const { data: detail, isLoading } = useGetMonitoringDataset({ params: { datasetId: listItem.datasetId } });

  const tags = detail?.tags ?? listItem.tags ?? [];
  const fields: DatasetField[] = detail?.fields ?? [];
  const calcFields: CalcField[] = detail?.calcFields ?? [];

  // 필드 구성 통합 row (fields + calcFields)
  const fieldRows: FieldRow[] = [
    ...fields.map<FieldRow>((f) => ({
      id: `f:${f.fieldId ?? f.fieldName}`,
      name: f.fieldName,
      display: f.displayName,
      role: f.classification,
      format: f.columnFormat,
      virtual: f.isVirtual,
    })),
    ...calcFields.map<FieldRow>((c) => ({
      id: `c:${c.calcFieldId ?? c.fieldName}`,
      name: c.fieldName,
      display: c.displayName,
      role: 'CALC',
      format: c.columnFormat,
    })),
  ];

  const dimCount = fields.filter((f) => f.classification === 'DIM').length;
  const msrCount = fields.filter((f) => f.classification === 'MSR').length;
  const calcCount = calcFields.length;
  const lookupCount = detail?.lookups?.length ?? listItem.lookupCount;
  const virtualCount = fields.filter((f) => f.isVirtual).length || listItem.virtualFieldCount;

  const fmtDate = (v?: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-');

  const canDelete = listItem.usageWidgetCount === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-bt-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg font-semibold text-bt-fg truncate">{listItem.datasetName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button icon={<Pencil className="size-3.5" />} onClick={onEdit}>
            편집
          </Button>
          <Tooltip title={canDelete ? undefined : '사용 위젯이 있어 삭제 불가'}>
            <Button danger icon={<Trash2 className="size-3.5" />} onClick={onDelete} disabled={!canDelete}>
              삭제
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 flex flex-col px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          <DetailField className="col-span-2 md:col-span-3" label="설명" value={detail?.description || '-'} />
          <DetailField label="데이터셋 ID" value={<span className="font-mono">{listItem.datasetId}</span>} />
          <DetailField label="코드" value={<span className="font-mono">{listItem.datasetCode}</span>} />
          <DetailField
            label="태그"
            value={
              tags.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <Tag key={t} color="blue" className="!mb-0 !mr-0">
                      {t}
                    </Tag>
                  ))}
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )
            }
          />
          <DetailField
            label="베이스 타입"
            value={
              <Tag color={listItem.baseType === 'QUERY' ? 'geekblue' : listItem.baseType === 'EXTERNAL' ? 'default' : 'cyan'} className="!mb-0 !mr-0 font-mono">
                {listItem.baseType}
              </Tag>
            }
          />
          <DetailField label="코드 룩업 / 가상필드" value={lookupCount > 0 ? `룩업 ${lookupCount} · 가상 +${virtualCount}` : '-'} />
          <DetailField label="사용 위젯" value={listItem.usageWidgetCount} />
          <DetailField label="생성일" value={fmtDate(detail?.createdAt)} />
          <DetailField label="수정일" value={fmtDate(detail?.updatedAt ?? listItem.updatedAt)} />
        </div>

        {/* 필드 메타 */}
        <div className="mt-7 flex-1 min-h-0 flex flex-col">
          <div className="flex items-baseline gap-2 mb-2 shrink-0">
            <h3 className="text-sm font-semibold text-bt-fg">필드 구성</h3>
            {fieldRows.length > 0 && (
              <span className="text-xs text-bt-fg-muted">
                총 {fieldRows.length} · 차원 {dimCount} · 측정값 {msrCount} · 계산 {calcCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 bg-white bt-shadow">
            <AgGridReact<FieldRow>
              {...gridOptions}
              rowData={fieldRows}
              columnDefs={FIELD_COLUMN_DEFS}
              getRowId={(p) => p.data.id}
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
