/**
 * CTI 큐 좌측 업무그룹 트리 (스킬셋 관리 SkillsetGroupTree 와 동형).
 *
 * - 공통 트리(useTreeView + TreeView 프리미티브) 기반: depth 들여쓰기, 토글/펼침, 선택, 검색, 키보드 a11y
 * - 구조: "전체" + "미배정" 칩 + 그룹 트리 (선택된 테넌트의 그룹만)
 *  - 카드 슬라이더에서 테넌트 선택 시 그 테넌트의 그룹만 표시
 *  - "전체" 테넌트 선택 시 모든 테넌트의 그룹 표시 (테넌트 섹션 헤더로 구분)
 *
 * 트리 인터랙션:
 *  - 호버 시 [grip + ✎ 🗑] 액션
 *  - ag-Grid 행 드래그 → 노드 드롭하면 onCtiQueueDrop(targetTreeId, ctiqIds)
 *  - 그룹 노드 D&D 재배치: BEFORE/INSIDE/AFTER 히트테스트 (AgentGroupTree 패턴 동일)
 *  - 트리 검색
 *
 * (2) 테넌트 섹션 그룹핑:
 *  - selectedTenantId===null 일 때 테넌트별 섹션 헤더(── 테넌트명 ──)로 묶어 렌더
 *  - 노드 옆 테넌트명 pill 제거
 *  - DnD 는 같은 테넌트 섹션 안에서만 허용 (BE 가 타 테넌트 INSIDE 거부)
 *  - 특정 테넌트 선택 시엔 기존과 동일(섹션 없음)
 */
import { useMemo, useState } from 'react';
import { Input, Tooltip } from 'antd';
import { ChevronsDownUp, ChevronsUpDown, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { CtiQueueGroupReorderPosition, CtiQueueGroupResponse } from '../types';
import { CTI_QUEUE_DRAG_MIME } from './CtiQueueTable';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

/** 그룹 노드 D&D 채널 — 노드 자체를 드래그할 때 사용 (AgentGroupTree 패턴 동일). */
export const CTI_QUEUE_GROUP_DRAG_MIME = 'application/x-bt-ctiq-group-id';

/**
 * 트리 액션 버튼 공통 Tooltip 옵션 — AgentGroupTree 와 동일 컴팩트 규격.
 * styles.container: antd v6 inner 키. minHeight:auto 로 기본 min-height(32px) 제거 + flex 중앙정렬.
 */
const TOOLTIP_PROPS = {
  mouseEnterDelay: 0.5,
  styles: {
    container: {
      minHeight: 'auto',
      fontSize: 12,
      lineHeight: '16px',
      padding: '4px 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
} as const;

interface Props {
  groups: CtiQueueGroupResponse[]; // BE getGroups (테넌트 필터 적용된 결과)
  totalCtiqCount: number;
  totalUnassignedCount: number;
  /** 트리 노드별 배지 카운트 — 현재 그리드 범위(rowsInTab) 기준. BE node.ctiqCount(전 스코프 고정) 대신 사용. */
  scopedCount: Map<number, number>;
  selectedTreeId: number | null; // null=전체, 0=미배정, n=실제 트리
  selectedTenantId: number | null; // null=전체 테넌트
  onSelect: (treeId: number | null) => void;
  onCreateChild: (parent: CtiQueueGroupResponse | null) => void;
  onEdit: (group: CtiQueueGroupResponse) => void;
  onDelete: (group: CtiQueueGroupResponse) => void;
  /** D&D 드롭 핸들러 — node 객체 전달 (테넌트 검증용). targetTreeId=0 이면 미배정. */
  onCtiQueueDrop: (target: { treeId: number; tenantId: number | null }, ctiqIds: number[]) => void;
  /** 그룹 노드 D&D 재배치. position 은 referenceTreeId(드롭 받은 노드) 기준. */
  onGroupReorder?: (movedTreeId: number, position: CtiQueueGroupReorderPosition, referenceTreeId: number) => void;
}

/** 전체 트리에서 treeId → tenantId 역방향 맵 (재배치 시 크로스 테넌트 방지용). */
function buildTenantMap(groups: CtiQueueGroupResponse[], out = new Map<number, number>()): Map<number, number> {
  for (const n of groups) {
    out.set(n.treeId, n.tenantId);
    if ((n.children ?? []).length) buildTenantMap(n.children, out);
  }
  return out;
}

/** 그룹 목록을 테넌트별로 분리 (루트 노드 기준 — 자식은 부모와 같은 테넌트). */
function groupByTenant(groups: CtiQueueGroupResponse[]): { tenantId: number; tenantName: string; nodes: CtiQueueGroupResponse[] }[] {
  const map = new Map<number, { tenantId: number; tenantName: string; nodes: CtiQueueGroupResponse[] }>();
  for (const n of groups) {
    const tid = n.tenantId;
    if (!map.has(tid)) map.set(tid, { tenantId: tid, tenantName: n.tenantName ?? `테넌트 ${tid}`, nodes: [] });
    map.get(tid)!.nodes.push(n);
  }
  return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
}

/** 단일 테넌트 섹션의 트리 렌더 (useTreeView 로 평탄화 후 renderRow). */
function TenantSection({
  tenantId,
  tenantName,
  nodes,
  scopedCount,
  selectedTreeId,
  onSelect,
  onCreateChild,
  onEdit,
  onDelete,
  onCtiQueueDrop,
  onGroupReorder,
  tenantMap,
  searchText,
}: {
  tenantId: number;
  tenantName: string;
  nodes: CtiQueueGroupResponse[];
  scopedCount: Map<number, number>;
  selectedTreeId: number | null;
  onSelect: (treeId: number | null) => void;
  onCreateChild: (parent: CtiQueueGroupResponse | null) => void;
  onEdit: (group: CtiQueueGroupResponse) => void;
  onDelete: (group: CtiQueueGroupResponse) => void;
  onCtiQueueDrop: (target: { treeId: number; tenantId: number | null }, ctiqIds: number[]) => void;
  onGroupReorder?: (movedTreeId: number, position: CtiQueueGroupReorderPosition, referenceTreeId: number) => void;
  tenantMap: Map<number, number>;
  searchText: string;
}) {
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [groupDropHint, setGroupDropHint] = useState<{ id: number; pos: CtiQueueGroupReorderPosition } | null>(null);

  const { items, rootProps } = useTreeView<CtiQueueGroupResponse>({
    data: nodes,
    getId: (n) => String(n.treeId),
    getChildren: (n) => n.children,
    getName: (n) => n.treeName,
    searchText,
    ariaLabel: `업무그룹 트리 - ${tenantName}`,
  });

  const computeDropPos = (e: React.DragEvent): CtiQueueGroupReorderPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    if (ratio < 0.25) return 'BEFORE';
    if (ratio > 0.75) return 'AFTER';
    return 'INSIDE';
  };

  const renderRow = (item: TreeViewItem<CtiQueueGroupResponse>) => {
    const node = item.node;
    const isSelected = selectedTreeId === node.treeId;
    const isDropTarget = dropTargetId === node.treeId;
    const groupHint = groupDropHint?.id === node.treeId ? groupDropHint.pos : null;
    const dropClass = isDropTarget
      ? 'bg-emerald-50 border-emerald-500 outline outline-2 outline-dashed outline-emerald-500 -outline-offset-2'
      : groupHint === 'INSIDE'
        ? 'bg-blue-50 border-blue-500'
        : undefined;

    return (
      <TreeRow
        key={item.id}
        item={item}
        selected={isSelected}
        className={dropClass}
        draggable={!!onGroupReorder}
        onClick={() => onSelect(node.treeId)}
        onDragStart={(e) => {
          if (!onGroupReorder) return;
          e.dataTransfer.setData(CTI_QUEUE_GROUP_DRAG_MIME, JSON.stringify({ treeId: node.treeId, tenantId: node.tenantId }));
          e.dataTransfer.effectAllowed = 'move';
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          const types = e.dataTransfer.types;
          if (types.includes(CTI_QUEUE_DRAG_MIME) && !types.includes(CTI_QUEUE_GROUP_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTargetId(node.treeId);
            return;
          }
          if (types.includes(CTI_QUEUE_GROUP_DRAG_MIME) && onGroupReorder) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setGroupDropHint({ id: node.treeId, pos: computeDropPos(e) });
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDropTargetId((id) => (id === node.treeId ? null : id));
          setGroupDropHint((h) => (h?.id === node.treeId ? null : h));
        }}
        onDrop={(e) => {
          // CTI큐 페이로드 우선
          if (e.dataTransfer.types.includes(CTI_QUEUE_DRAG_MIME) && !e.dataTransfer.types.includes(CTI_QUEUE_GROUP_DRAG_MIME)) {
            const raw = e.dataTransfer.getData(CTI_QUEUE_DRAG_MIME);
            if (raw) {
              e.preventDefault();
              setDropTargetId(null);
              try {
                const ids = JSON.parse(raw) as number[];
                if (Array.isArray(ids) && ids.length > 0) onCtiQueueDrop({ treeId: node.treeId, tenantId: node.tenantId }, ids);
              } catch {
                /* ignore */
              }
              return;
            }
          }
          // 그룹 노드 재배치 페이로드
          const groupRaw = e.dataTransfer.getData(CTI_QUEUE_GROUP_DRAG_MIME);
          if (groupRaw && onGroupReorder) {
            e.preventDefault();
            const pos = groupDropHint?.id === node.treeId ? groupDropHint.pos : computeDropPos(e);
            setGroupDropHint(null);
            try {
              const { treeId: movedId, tenantId: movedTenant } = JSON.parse(groupRaw) as { treeId: number; tenantId: number };
              // 크로스 테넌트 이동 차단 (섹션 내부 DnD만 허용)
              if (movedId !== node.treeId && movedTenant === tenantId) {
                onGroupReorder(movedId, pos, node.treeId);
              }
            } catch {
              /* ignore */
            }
          }
        }}
      >
        {groupHint === 'BEFORE' && <span className="pointer-events-none absolute left-0 right-0 -top-px h-[2px] bg-blue-500" />}
        {groupHint === 'AFTER' && <span className="pointer-events-none absolute left-0 right-0 -bottom-px h-[2px] bg-blue-500" />}

        <TreeCaret item={item} />

        {/* drag handle — 항상 옅게, hover 시 진해짐 */}
        {onGroupReorder && <GripVertical className="size-3 flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition cursor-grab" aria-hidden />}

        <TreeFolderIcon item={item} selected={isSelected} />

        <TreeLabel selected={isSelected} title={node.treeName}>
          {node.treeName}
        </TreeLabel>

        {isDropTarget && <span className="text-[10px] text-emerald-600 font-medium">↓ 여기로 배정</span>}

        {/* 카운트 — 항상 표시 */}
        <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{(scopedCount.get(node.treeId) ?? 0).toLocaleString()}</span>

        {/* 액션 — 상시 노출 */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Tooltip title="하위 그룹 추가" {...TOOLTIP_PROPS}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
              onClick={(e) => {
                e.stopPropagation();
                onCreateChild(node);
              }}
            >
              <Plus className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip title="그룹 수정" {...TOOLTIP_PROPS}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
            >
              <Pencil className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip title="그룹 삭제" {...TOOLTIP_PROPS}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </TreeRow>
    );
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* 테넌트 섹션 헤더 */}
      <div className="flex items-center gap-2 px-3 py-1 mt-1 first:mt-0">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] font-semibold text-gray-400 flex-shrink-0 select-none">{tenantName}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div {...rootProps}>{items.map(renderRow)}</div>
    </>
  );
}

export default function CtiQueueGroupTree({
  groups,
  totalCtiqCount,
  totalUnassignedCount,
  scopedCount,
  selectedTreeId,
  selectedTenantId,
  onSelect,
  onCreateChild,
  onEdit,
  onDelete,
  onCtiQueueDrop,
  onGroupReorder,
}: Props) {
  const [searchText, setSearchText] = useState('');
  const [unassignedDropOver, setUnassignedDropOver] = useState(false);

  // 단일 테넌트 모드용 (기존 구현 유지)
  const { items, rootProps, allExpanded, toggleAll } = useTreeView<CtiQueueGroupResponse>({
    data: selectedTenantId !== null ? groups : [],
    getId: (n) => String(n.treeId),
    getChildren: (n) => n.children,
    getName: (n) => n.treeName,
    searchText,
    ariaLabel: '업무그룹 트리',
  });

  const hasExpandable = groups.some((n) => (n.children ?? []).length > 0);

  // 테넌트 섹션 그룹핑 (전체 선택 시)
  const tenantSections = useMemo(() => (selectedTenantId === null ? groupByTenant(groups) : []), [groups, selectedTenantId]);

  // treeId → tenantId 역방향 맵 (크로스 테넌트 DnD 방지)
  const tenantMap = useMemo(() => buildTenantMap(groups), [groups]);

  // 단일 테넌트 모드 드롭 상태
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [groupDropHint, setGroupDropHint] = useState<{ id: number; pos: CtiQueueGroupReorderPosition } | null>(null);

  const computeDropPos = (e: React.DragEvent): CtiQueueGroupReorderPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    if (ratio < 0.25) return 'BEFORE';
    if (ratio > 0.75) return 'AFTER';
    return 'INSIDE';
  };

  // 단일 테넌트 모드 renderRow
  const renderSingleTenantRow = (item: TreeViewItem<CtiQueueGroupResponse>) => {
    const node = item.node;
    const isSelected = selectedTreeId === node.treeId;
    const isDropTarget = dropTargetId === node.treeId;
    const groupHint = groupDropHint?.id === node.treeId ? groupDropHint.pos : null;
    const dropClass = isDropTarget
      ? 'bg-emerald-50 border-emerald-500 outline outline-2 outline-dashed outline-emerald-500 -outline-offset-2'
      : groupHint === 'INSIDE'
        ? 'bg-blue-50 border-blue-500'
        : undefined;

    return (
      <TreeRow
        key={item.id}
        item={item}
        selected={isSelected}
        className={dropClass}
        draggable={!!onGroupReorder}
        onClick={() => onSelect(node.treeId)}
        onDragStart={(e) => {
          if (!onGroupReorder) return;
          e.dataTransfer.setData(CTI_QUEUE_GROUP_DRAG_MIME, JSON.stringify({ treeId: node.treeId, tenantId: node.tenantId }));
          e.dataTransfer.effectAllowed = 'move';
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          const types = e.dataTransfer.types;
          if (types.includes(CTI_QUEUE_DRAG_MIME) && !types.includes(CTI_QUEUE_GROUP_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTargetId((prev) => (prev === node.treeId ? prev : node.treeId));
            return;
          }
          if (types.includes(CTI_QUEUE_GROUP_DRAG_MIME) && onGroupReorder) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setGroupDropHint({ id: node.treeId, pos: computeDropPos(e) });
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDropTargetId((id) => (id === node.treeId ? null : id));
          setGroupDropHint((h) => (h?.id === node.treeId ? null : h));
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes(CTI_QUEUE_DRAG_MIME) && !e.dataTransfer.types.includes(CTI_QUEUE_GROUP_DRAG_MIME)) {
            const raw = e.dataTransfer.getData(CTI_QUEUE_DRAG_MIME);
            if (raw) {
              e.preventDefault();
              setDropTargetId(null);
              try {
                const ids = JSON.parse(raw) as number[];
                if (Array.isArray(ids) && ids.length > 0) onCtiQueueDrop({ treeId: node.treeId, tenantId: node.tenantId }, ids);
              } catch {
                /* ignore */
              }
              return;
            }
          }
          const groupRaw = e.dataTransfer.getData(CTI_QUEUE_GROUP_DRAG_MIME);
          if (groupRaw && onGroupReorder) {
            e.preventDefault();
            const pos = groupDropHint?.id === node.treeId ? groupDropHint.pos : computeDropPos(e);
            setGroupDropHint(null);
            try {
              const { treeId: movedId } = JSON.parse(groupRaw) as { treeId: number; tenantId: number };
              if (movedId !== node.treeId) {
                onGroupReorder(movedId, pos, node.treeId);
              }
            } catch {
              /* ignore */
            }
          }
        }}
      >
        {groupHint === 'BEFORE' && <span className="pointer-events-none absolute left-0 right-0 -top-px h-[2px] bg-blue-500" />}
        {groupHint === 'AFTER' && <span className="pointer-events-none absolute left-0 right-0 -bottom-px h-[2px] bg-blue-500" />}

        <TreeCaret item={item} />

        {onGroupReorder && <GripVertical className="size-3 flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition cursor-grab" aria-hidden />}

        <TreeFolderIcon item={item} selected={isSelected} />

        <TreeLabel selected={isSelected} title={node.treeName}>
          {node.treeName}
        </TreeLabel>

        {isDropTarget && <span className="text-[10px] text-emerald-600 font-medium">↓ 여기로 배정</span>}

        <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{(scopedCount.get(node.treeId) ?? 0).toLocaleString()}</span>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Tooltip title="하위 그룹 추가" {...TOOLTIP_PROPS}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
              onClick={(e) => {
                e.stopPropagation();
                onCreateChild(node);
              }}
            >
              <Plus className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip title="그룹 수정" {...TOOLTIP_PROPS}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
            >
              <Pencil className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip title="그룹 삭제" {...TOOLTIP_PROPS}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </TreeRow>
    );
  };

  const isAllSelected = selectedTreeId === null;
  const isUnassignedSelected = selectedTreeId === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 검색 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <Input
          allowClear
          prefix={<Search className="size-3.5 text-gray-400" />}
          placeholder="업무그룹 검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </div>

      {/* 시스템 필터 영역 (전체 / 미배정) — 트리와 분리 */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onSelect(null)}
          title={`전체 ${totalCtiqCount.toLocaleString()}건`}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
            isAllSelected
              ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-[var(--color-bt-primary)]/40 hover:text-[var(--color-bt-primary)]'
          }`}
        >
          <span className="font-medium">전체</span>
          <span className={isAllSelected ? 'text-white/80' : 'text-gray-400'}>{totalCtiqCount.toLocaleString()}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect(0)}
          title={`미배정 ${totalUnassignedCount.toLocaleString()}건 (드래그로 배정 해제 가능)`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(CTI_QUEUE_DRAG_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setUnassignedDropOver((prev) => (prev ? prev : true));
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setUnassignedDropOver(false);
          }}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData(CTI_QUEUE_DRAG_MIME);
            if (!raw) return;
            e.preventDefault();
            setUnassignedDropOver(false);
            try {
              const ids = JSON.parse(raw) as number[];
              if (Array.isArray(ids) && ids.length > 0) onCtiQueueDrop({ treeId: 0, tenantId: null }, ids);
            } catch {
              /* ignore */
            }
          }}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
            unassignedDropOver
              ? 'border-amber-500 bg-amber-50 text-amber-700 outline outline-2 outline-dashed outline-amber-500 -outline-offset-2'
              : isUnassignedSelected
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-amber-200 bg-white text-amber-600 hover:border-amber-400'
          }`}
        >
          <span className="font-medium">미배정</span>
          <span className={isUnassignedSelected ? 'text-white/80' : 'text-amber-500'}>{totalUnassignedCount.toLocaleString()}</span>
        </button>
        {/* 모두 펼치기/접기 — 단일 테넌트 모드에서만 */}
        {selectedTenantId !== null && (
          <Tooltip title={allExpanded ? '모두 접기' : '모두 펼치기'} {...TOOLTIP_PROPS}>
            <button
              type="button"
              onClick={toggleAll}
              disabled={!hasExpandable}
              className="ml-auto w-6 h-6 inline-flex items-center justify-center rounded text-gray-400 hover:bg-white hover:text-[var(--color-bt-primary)] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
            </button>
          </Tooltip>
        )}
      </div>

      {/* 순수 그룹 트리 */}
      <div className="flex-1 overflow-auto py-1">
        {groups.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-gray-400">{selectedTenantId === null ? '상단 카드에서 테넌트를 선택하세요' : '등록된 업무그룹이 없습니다'}</div>
        ) : selectedTenantId !== null ? (
          // 단일 테넌트 모드 — 기존 구현 유지
          <div {...rootProps}>{items.map(renderSingleTenantRow)}</div>
        ) : (
          // 전체 테넌트 모드 — 테넌트 섹션 그룹핑
          tenantSections.map((section) => (
            <TenantSection
              key={section.tenantId}
              tenantId={section.tenantId}
              tenantName={section.tenantName}
              nodes={section.nodes}
              scopedCount={scopedCount}
              selectedTreeId={selectedTreeId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onCtiQueueDrop={onCtiQueueDrop}
              onGroupReorder={onGroupReorder}
              tenantMap={tenantMap}
              searchText={searchText}
            />
          ))
        )}
      </div>
    </div>
  );
}
