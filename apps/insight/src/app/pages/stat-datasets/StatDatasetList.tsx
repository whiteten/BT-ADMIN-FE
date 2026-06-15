import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Popover, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { datasetKeys, useDeleteDataset, useGetDataset, useGetDatasets } from '../../features/dataset/hooks/useDatasetQueries';
import type { DatasetListItem, FieldMetaItem } from '../../features/dataset/types';
import { DOMAIN_DESCRIPTIONS, DOMAIN_LABELS, DOMAIN_TAG_COLOR } from '../../features/report/constants/reportIconConstants';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Highlight } from '@/components/custom/Highlight';
import NoData from '@/components/custom/NoData';
import { TreeCaret, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

// ─── 대분류(상위 그룹) 정의 ─────────────────────────────────────────────────────
// 현재는 프론트 상수. 향후 API 제공 시 이 두 매핑만 동적 로드로 교체.
const MAJOR_DEFS: { code: string; label: string; productCodes: string[] }[] = [{ code: 'IPRON', label: 'IPRON', productCodes: ['IE', 'IC', 'IR'] }];
const PRODUCT_CODE_MAJOR: Record<string, string> = { IE: 'IPRON', IC: 'IPRON', IR: 'IPRON' };
// 소분류(productCode) 표시 순서 — 미등록 코드는 뒤에 자동 추가
const MINOR_ORDER = ['IE', 'IC', 'IR'];

// 소분류 액센트 색상 (트리 leaf 점) — antd Tag(DOMAIN_TAG_COLOR)와 톤 일치, 미등록은 primary 폴백
const ACCENT_HEX: Record<string, string> = { IE: '#1677ff', IC: '#52c41a', IR: '#fa8c16' };
const DEFAULT_ACCENT = 'var(--color-bt-primary)';

const UNIT_LABEL: Record<string, string> = { MI: '10분', HH: '시간', DD: '일', MM: '월', YY: '연' };

const majorOfCode = (code: string) => PRODUCT_CODE_MAJOR[code] ?? 'ETC';

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

// 트리 액션 버튼 툴팁 — 공통 컴팩트 규격 (add-tree 스킬 / AgentGroupTree 참조)
const TOOLTIP_PROPS = {
  mouseEnterDelay: 0.5,
  styles: { container: { minHeight: 'auto', fontSize: 12, lineHeight: '16px', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
} as const;

// 트리 노드 — key 는 grp:/ds: prefix 로 그룹/데이터셋을 구분
interface DsTreeNode {
  key: string;
  label: string;
  code?: string; // 그룹 노드의 productCode
  data?: DatasetListItem; // leaf 데이터셋
  children: DsTreeNode[];
}

export default function StatDatasetList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  // 시스템 데이터셋은 시스템 관리자만 삭제 가능
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  const [search, setSearch] = useState('');
  const [majorSel, setMajorSel] = useState<string | null>(null); // null = 전체
  const [minorSel, setMinorSel] = useState<string | null>(null);
  const [majorPopOpen, setMajorPopOpen] = useState(false);
  const [minorPopOpen, setMinorPopOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setBreadcrumb([{ title: '데이터셋', path: '/insight/statistics/datasets' }]);
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

  // 데이터에 존재하는 소분류 코드 — 지정 순서 우선 + 미등록 코드 자동 추가
  const presentCodes = [...new Set(datasets.map((d) => d.productCode ?? '').filter(Boolean))];
  const allCodes = [...MINOR_ORDER.filter((c) => presentCodes.includes(c)), ...presentCodes.filter((c) => !MINOR_ORDER.includes(c))];

  // 대분류/소분류 셀렉트로 노출할 소분류 코드
  const visibleCodes = allCodes.filter((code) => (!majorSel || majorOfCode(code) === majorSel) && (!minorSel || code === minorSel));

  // 트리 데이터 — 소분류 그룹 > 데이터셋
  const treeData: DsTreeNode[] = visibleCodes.map((code) => ({
    key: `grp:${code}`,
    label: DOMAIN_LABELS[code] ?? code,
    code,
    children: datasets.filter((d) => d.productCode === code).map((d) => ({ key: `ds:${d.datasetId}`, label: d.datasourceName, data: d, children: [] })),
  }));

  const { items, rootProps } = useTreeView<DsTreeNode>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    searchText: search,
    matchesSearch: (n, kw) => {
      const k = kw.toLowerCase();
      if (n.data) return n.data.datasourceName.toLowerCase().includes(k) || (n.data.dbViewPrefix ?? '').toLowerCase().includes(k);
      return n.label.toLowerCase().includes(k);
    },
    defaultExpandAll: true,
    ariaLabel: '데이터셋 트리',
  });

  const selectedKey = selectedId != null ? `ds:${selectedId}` : null;
  const selected = selectedId != null ? (datasets.find((d) => d.datasetId === selectedId) ?? null) : null;

  const handleSelectNode = (node: DsTreeNode) => {
    if (node.data) setSelectedId(node.data.datasetId);
  };

  const handleCreate = () => navigate('/insight/statistics/datasets/new');
  const handleEditDataset = (d: DatasetListItem) => navigate(`/insight/statistics/datasets/${d.datasetId}/edit`);
  const handleDeleteDataset = (d: DatasetListItem) => modal.confirm.delete({ onOk: () => deleteDataset(d.datasetId) });

  const handlePickMajor = (code: string | null) => {
    setMajorSel(code);
    // 선택한 소분류가 새 대분류에 속하지 않으면 해제
    if (minorSel && code && majorOfCode(minorSel) !== code) setMinorSel(null);
    setMajorPopOpen(false);
  };
  const handlePickMinor = (code: string | null) => {
    setMinorSel(code);
    setMinorPopOpen(false);
  };

  const majorLabel = majorSel ? (MAJOR_DEFS.find((m) => m.code === majorSel)?.label ?? majorSel) : '전체';
  const minorLabel = minorSel ? (DOMAIN_LABELS[minorSel] ?? minorSel) : '전체';

  const renderRow = (item: TreeViewItem<DsTreeNode>) => {
    const node = item.node;
    const isGroup = !!node.code;
    const isSelected = node.key === selectedKey;
    const count = isGroup ? datasets.filter((d) => d.productCode === node.code).length : 0;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => handleSelectNode(node)} className={isGroup ? 'cursor-default' : undefined}>
        <TreeCaret item={item} />
        {isGroup ? (
          <Tag color={DOMAIN_TAG_COLOR[node.code!]} className="!mb-0 !mr-0 font-bold">
            {node.code}
          </Tag>
        ) : (
          <span className="size-1.5 rounded-full flex-shrink-0" style={{ background: ACCENT_HEX[node.data!.productCode] ?? DEFAULT_ACCENT }} />
        )}
        <TreeLabel selected={isSelected}>
          <Highlight text={node.label} query={search} />
        </TreeLabel>
        {isGroup ? (
          <span className="ml-auto h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{count}</span>
        ) : (
          <span className="ml-auto flex items-center h-5 flex-shrink-0">
            {/* 뱃지 — hover 시 숨김 (카드와 동일 명칭) */}
            <span className="h-5 inline-flex items-center gap-1 group-hover:hidden">
              {node.data!.isSystem && (
                <Tag color="blue" className="!mb-0 !mr-0 !text-[10px] !px-1 !py-0 !leading-4">
                  시스템
                </Tag>
              )}
              {!node.data!.isActive && (
                <Tag color="default" className="!mb-0 !mr-0 !text-[10px] !px-1 !py-0 !leading-4">
                  비활성
                </Tag>
              )}
            </span>
            {/* 액션 — hover 시 노출 (카드 아이콘 기능 그대로) */}
            <span className="hidden group-hover:flex items-center gap-0.5">
              <Tooltip title="편집" {...TOOLTIP_PROPS}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditDataset(node.data!);
                  }}
                  className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] transition"
                >
                  <Pencil className="size-3.5" />
                </button>
              </Tooltip>
              {(!node.data!.isSystem || isSystemAdmin) && (
                <Tooltip title="삭제" {...TOOLTIP_PROPS}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDataset(node.data!);
                    }}
                    className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Tooltip>
              )}
            </span>
          </span>
        )}
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: 검색 + 대분류/소분류 셀렉트 + 트리 */}
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

          {/* 대분류·소분류 칩 셀렉트 (메뉴 설정 화면과 동일 패턴) */}
          <div className="flex flex-wrap gap-2">
            <ChipSelect
              open={majorPopOpen}
              onOpenChange={setMajorPopOpen}
              label="대분류"
              valueLabel={majorLabel}
              active={majorSel !== null}
              content={
                <>
                  <ChipOption active={majorSel === null} onClick={() => handlePickMajor(null)}>
                    전체 <span className="opacity-70">{datasets.length}</span>
                  </ChipOption>
                  {MAJOR_DEFS.map((m) => {
                    const cnt = datasets.filter((d) => majorOfCode(d.productCode ?? '') === m.code).length;
                    return (
                      <ChipOption key={m.code} active={majorSel === m.code} onClick={() => handlePickMajor(m.code)}>
                        {m.label} <span className="opacity-70">{cnt}</span>
                      </ChipOption>
                    );
                  })}
                </>
              }
            />
            <ChipSelect
              open={minorPopOpen}
              onOpenChange={setMinorPopOpen}
              label="소분류"
              valueLabel={minorLabel}
              active={minorSel !== null}
              content={
                <>
                  <ChipOption active={minorSel === null} onClick={() => handlePickMinor(null)}>
                    전체
                  </ChipOption>
                  {allCodes
                    .filter((code) => !majorSel || majorOfCode(code) === majorSel)
                    .map((code) => (
                      <ChipOption key={code} active={minorSel === code} onClick={() => handlePickMinor(code)}>
                        <span className="size-1.5 rounded-full" style={{ background: ACCENT_HEX[code] ?? DEFAULT_ACCENT }} />
                        {DOMAIN_LABELS[code] ?? code} <span className="opacity-70">{datasets.filter((d) => d.productCode === code).length}</span>
                      </ChipOption>
                    ))}
                </>
              }
            />
          </div>

          <div className="border-t border-gray-200" />

          <div className="flex-1 overflow-auto -mx-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <FallbackSpinner size={36} />
              </div>
            ) : treeData.length > 0 ? (
              <div {...rootProps}>{items.map(renderRow)}</div>
            ) : (
              <div className="px-3 py-6 text-center text-[11px] text-gray-400">{search ? '검색 결과 없음' : '등록된 데이터셋이 없습니다.'}</div>
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div className="flex-1 min-h-0 bg-white bt-shadow flex flex-col">
          {selected ? (
            <DatasetDetailPanel
              key={selected.datasetId}
              listItem={selected}
              onEdit={() => navigate(`/insight/statistics/datasets/${selected.datasetId}/edit`)}
              onDelete={() => modal.confirm.delete({ onOk: () => deleteDataset(selected.datasetId) })}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <NoData message="좌측 트리에서 데이터셋을 선택해주세요" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 칩 셀렉트 (메뉴 설정 화면 패턴: 트리거 칩 + 팝오버 내부 칩) ──────────────────

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
  const isSystemAdmin = useAuthStore((s) => s.userInfo?.isSystemAdmin ?? false);
  const canDelete = !listItem.isSystem || isSystemAdmin;
  const { gridOptions } = useAggridOptions();

  const { data: detail, isLoading } = useGetDataset({ params: { datasetId: listItem.datasetId } });

  const code = listItem.productCode;
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
          <Tag color={DOMAIN_TAG_COLOR[code]} className="!mb-0 !mr-0 font-bold">
            {code}
          </Tag>
          <span className="text-sm font-semibold text-bt-fg truncate">{DOMAIN_LABELS[code] ?? code}</span>
          {DOMAIN_DESCRIPTIONS[code] && <span className="text-xs text-bt-fg-muted truncate hidden xl:block">{DOMAIN_DESCRIPTIONS[code]}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-semibold text-bt-fg">{listItem.datasourceName}</span>
          {listItem.isSystem && (
            <Tag color="blue" className="!mb-0 !mr-0">
              시스템
            </Tag>
          )}
          {!listItem.isActive && (
            <Tag color="default" className="!mb-0 !mr-0">
              비활성
            </Tag>
          )}
        </div>
        <p className="mt-1 text-sm text-bt-fg-muted">{listItem.description || '설명 없음'}</p>

        {/* 데이터셋 요약 — 필드 구성 표 윗쪽 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          <DetailField label="데이터셋 ID" value={<span className="font-mono">{listItem.datasetId}</span>} />
          <DetailField label="카테고리" value={`${DOMAIN_LABELS[code] ?? code} (${code})`} />
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
          <DetailField label="유형" value={listItem.isSystem ? '시스템' : '사용자'} />
          <DetailField label="DB 뷰 Prefix" value={<span className="font-mono">{listItem.dbViewPrefix || '-'}</span>} />
          <DetailField
            label="지원 단위"
            value={
              units.length ? (
                <span className="flex flex-wrap gap-1">
                  {units.map((u) => (
                    <span key={u} className="rounded border border-bt-border bg-bt-bg-muted px-1.5 py-0.5 text-[10px] font-mono text-bt-fg-muted">
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-bt-fg-muted mb-1">{label}</div>
      <div className="text-sm text-bt-fg">{value}</div>
    </div>
  );
}
