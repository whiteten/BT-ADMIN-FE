/**
 * 상담그룹 트리 (좌측 패널).
 *
 * - 공통 트리(useTreeView + TreeView 프리미티브) 기반: depth 들여쓰기, 토글/펼침, 선택, 키보드 a11y
 * - 컨텍스트 메뉴: 하위 그룹 추가 / 그룹 수정 / 그룹 삭제 (hover 액션)
 * - 드롭 타겟: 외부에서 상담사 행 드래그 → 그룹에 드롭 → onAgentDrop(targetGroupId, agentIds)
 * - 그룹 노드 자체 reorder: BEFORE/INSIDE/AFTER 히트테스트
 */
import { useState } from 'react';
import { Input, Tooltip } from 'antd';
import { Building2, ChevronsDownUp, ChevronsUpDown, FolderClosed, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { AgentGroupNode, AgentGroupReorderPosition } from '../types';
import { AGENT_DRAG_MIME } from './AgentMasterTable';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

/** 그룹 노드 D&D 채널 — 노드 자체를 드래그할 때 사용. */
export const GROUP_DRAG_MIME = 'application/x-bt-group-id';

/**
 * 트리 액션 버튼 공통 Tooltip 옵션 — 각 Tooltip 에 {...TOOLTIP_PROPS} 로 일괄 적용.
 * - styles.container: SubHeader 툴팁(shadcn, text-xs)에 맞춘 컴팩트 크기(antd v6 inner 키는 `container`).
 *   minHeight:auto 로 antd 기본 min-height(32px)를 제거해 글자높이에 맞추고, flex 로 중앙 정렬.
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

interface AgentGroupTreeProps {
  tree: AgentGroupNode[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number | null) => void;
  onCreateChild?: (parent: AgentGroupNode | null) => void; // null = root 추가
  onEditGroup?: (group: AgentGroupNode) => void;
  onDeleteGroup?: (group: AgentGroupNode) => void;
  onAgentDrop?: (targetGroupId: number, agentIds: number[]) => void;
  /** 그룹 노드 D&D 재배치. position 은 referenceGroupId(드롭 받은 노드) 기준. */
  onGroupReorder?: (movedGroupId: number, position: AgentGroupReorderPosition, referenceGroupId: number) => void;
  /** 운영자 전체 모드의 합성 테넌트 노드 클릭 — 그 테넌트로 대행 전환(드릴다운). */
  onSelectTenant?: (tenantId: number) => void;
}

export default function AgentGroupTree({
  tree,
  selectedGroupId,
  onSelectGroup,
  onCreateChild,
  onEditGroup,
  onDeleteGroup,
  onAgentDrop,
  onGroupReorder,
  onSelectTenant,
}: AgentGroupTreeProps) {
  // 액션 콜백을 하나도 전달받지 않으면 read-only — 하위그룹 추가/수정/삭제 아이콘 자체를 렌더하지 않음
  // (예: 상담사 ADN 관리 화면이 그룹 트리를 필터 용도로만 재사용하는 경우)
  const readOnly = !onCreateChild && !onEditGroup && !onDeleteGroup;
  const [searchText, setSearchText] = useState('');
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  /** 그룹 D&D 시각 가이드 — 노드 ID + 드롭 위치 (위/아래/안쪽). */
  const [groupDropHint, setGroupDropHint] = useState<{ id: number; pos: AgentGroupReorderPosition } | null>(null);

  const { items, rootProps, allExpanded, toggleAll } = useTreeView<AgentGroupNode>({
    data: tree,
    getId: (n) => String(n.groupId),
    getChildren: (n) => n.children,
    getName: (n) => n.groupName,
    searchText,
    matchesSearch: (n, kw) => n.groupName.toLowerCase().includes(kw.toLowerCase()),
    ariaLabel: '상담그룹 트리',
  });

  const totalAgentCount = tree.reduce((s, n) => s + (n.agentCount ?? 0), 0);

  /**
   * 마우스 Y 좌표 기준 드롭 위치 계산.
   * - 상단 25%: BEFORE / 중간 50%: INSIDE / 하단 25%: AFTER
   */
  const computeDropPos = (e: React.DragEvent): AgentGroupReorderPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    if (ratio < 0.25) return 'BEFORE';
    if (ratio > 0.75) return 'AFTER';
    return 'INSIDE';
  };

  const renderRow = (item: TreeViewItem<AgentGroupNode>) => {
    const node = item.node;
    const isScope = node._scopeKind === 'tenant'; // 운영자 전체 모드의 합성 테넌트 노드
    const isSelected = selectedGroupId === node.groupId;
    const isDropTarget = dropTargetId === node.groupId;
    const groupHint = groupDropHint?.id === node.groupId ? groupDropHint.pos : null;
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
        draggable={!isScope && !!onGroupReorder}
        onClick={() => (isScope ? onSelectTenant?.(node.tenantId) : onSelectGroup(node.groupId))}
        onDragStart={(e) => {
          if (isScope || !onGroupReorder) return;
          e.dataTransfer.setData(GROUP_DRAG_MIME, JSON.stringify({ groupId: node.groupId }));
          e.dataTransfer.effectAllowed = 'move';
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          if (isScope) return; // 합성 테넌트 노드는 드롭 대상 아님
          const types = e.dataTransfer.types;
          if (types.includes(AGENT_DRAG_MIME) && onAgentDrop) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTargetId(node.groupId);
            return;
          }
          if (types.includes(GROUP_DRAG_MIME) && onGroupReorder) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setGroupDropHint({ id: node.groupId, pos: computeDropPos(e) });
          }
        }}
        onDragLeave={() => {
          setDropTargetId((id) => (id === node.groupId ? null : id));
          setGroupDropHint((h) => (h?.id === node.groupId ? null : h));
        }}
        onDrop={(e) => {
          if (isScope) return; // 합성 테넌트 노드는 드롭 대상 아님
          // 상담사 페이로드 우선
          const agentRaw = e.dataTransfer.getData(AGENT_DRAG_MIME);
          if (agentRaw && onAgentDrop) {
            e.preventDefault();
            setDropTargetId(null);
            try {
              const ids = JSON.parse(agentRaw) as number[];
              if (Array.isArray(ids) && ids.length > 0) {
                onAgentDrop(node.groupId, ids);
              }
            } catch {
              /* ignore */
            }
            return;
          }
          // 그룹 노드 페이로드
          const groupRaw = e.dataTransfer.getData(GROUP_DRAG_MIME);
          if (groupRaw && onGroupReorder) {
            e.preventDefault();
            const pos = groupDropHint?.id === node.groupId ? groupDropHint.pos : computeDropPos(e);
            setGroupDropHint(null);
            try {
              const { groupId } = JSON.parse(groupRaw) as { groupId: number };
              if (groupId !== node.groupId) {
                onGroupReorder(groupId, pos, node.groupId);
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

        {/* drag handle hint — 항상 옅게, hover 시 진해짐 (합성 테넌트 노드는 제외) */}
        {onGroupReorder && !isScope && <GripVertical className="size-3 flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition cursor-grab" aria-hidden />}

        {isScope ? <Building2 className="size-3.5 flex-shrink-0 text-amber-600" /> : <TreeFolderIcon item={item} selected={isSelected} />}

        <TreeLabel selected={isSelected} title={node.groupName}>
          <span className={isScope ? 'font-semibold text-amber-800' : undefined}>{node.groupName}</span>
        </TreeLabel>

        {isDropTarget && <span className="text-[10px] text-emerald-600 font-medium">↓ 여기로 이동</span>}

        {/* 카운트 — 맨 우측에 상시 표시 */}
        <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{node.agentCount.toLocaleString()}</span>

        {/* 액션 — read-only 모드 또는 합성 테넌트 노드에서는 통째 생략 */}
        {!readOnly && !isScope && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Tooltip title="하위 그룹 추가" {...TOOLTIP_PROPS}>
              <button
                type="button"
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChild?.(node);
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
                  onEditGroup?.(node);
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
                  onDeleteGroup?.(node);
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-gray-100">
        <Input
          allowClear
          prefix={<Search className="size-3.5 text-gray-400" />}
          placeholder="그룹 검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </div>
      <div className="flex-1 overflow-auto py-1">
        {/* 전체 (그룹 필터 해제) — 그룹 노드 row 와 같은 구조로 카운트 정렬 맞춤
            (grip 자리 size-3 + gap, folder, name, count, actions 폭 자리) */}
        <div
          className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none border-l-[3px] transition ${
            selectedGroupId === null ? 'bg-[var(--color-bt-primary-soft)] border-[var(--color-bt-primary)]' : 'border-transparent hover:bg-gray-50'
          }`}
          onClick={() => onSelectGroup(null)}
        >
          {/* grip 자리 placeholder — 그룹 노드와 좌측 정렬 맞춤 */}
          {onGroupReorder && <span className="size-3 flex-shrink-0" aria-hidden />}
          <FolderClosed className={`size-3.5 flex-shrink-0 ${selectedGroupId === null ? 'text-[var(--color-bt-primary)]' : 'text-gray-500'}`} />
          <span className={`flex-1 text-[12.5px] truncate ${selectedGroupId === null ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-gray-700'}`}>전체</span>
          {/* 카운트 — 맨 우측에 상시 표시 */}
          <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{totalAgentCount.toLocaleString()}</span>
          {/* 모두 펼치기/접기 토글 — 상시 표시 */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Tooltip title={allExpanded ? '모두 접기' : '모두 펼치기'} {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAll();
                }}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] transition"
              >
                {allExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
              </button>
            </Tooltip>
          </div>
        </div>
        <div {...rootProps}>{items.map(renderRow)}</div>
      </div>
    </div>
  );
}
