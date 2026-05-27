/**
 * 상담그룹 트리 (좌측 패널).
 *
 * - 재귀 노드: depth 들여쓰기, 토글/펼침, 선택, 호버 [⋮] 메뉴
 * - 컨텍스트 메뉴: 하위 그룹 추가 / 그룹 수정 / 그룹 삭제
 * - 드롭 타겟: 외부에서 상담사 행 드래그 → 그룹에 드롭 → onAgentDrop(agentIds, targetGroupId)
 */
import { useMemo, useState } from 'react';
import { Input } from 'antd';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, FolderClosed, FolderOpen, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { AgentGroupNode, AgentGroupReorderPosition } from '../types';
import { AGENT_DRAG_MIME } from './AgentMasterTable';

/** 그룹 노드 D&D 채널 — 노드 자체를 드래그할 때 사용. */
export const GROUP_DRAG_MIME = 'application/x-bt-group-id';

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
}

function filterTree(nodes: AgentGroupNode[], kw: string): AgentGroupNode[] {
  if (!kw) return nodes;
  const lower = kw.toLowerCase();
  const walk = (list: AgentGroupNode[]): AgentGroupNode[] => {
    const out: AgentGroupNode[] = [];
    for (const n of list) {
      const matched = n.groupName.toLowerCase().includes(lower);
      const childMatched = walk(n.children ?? []);
      if (matched || childMatched.length > 0) {
        out.push({ ...n, children: matched ? n.children : childMatched });
      }
    }
    return out;
  };
  return walk(nodes);
}

export default function AgentGroupTree({ tree, selectedGroupId, onSelectGroup, onCreateChild, onEditGroup, onDeleteGroup, onAgentDrop, onGroupReorder }: AgentGroupTreeProps) {
  const [searchText, setSearchText] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  /** 그룹 D&D 시각 가이드 — 노드 ID + 드롭 위치 (위/아래/안쪽). */
  const [groupDropHint, setGroupDropHint] = useState<{ id: number; pos: AgentGroupReorderPosition } | null>(null);

  /**
   * 마우스 Y 좌표 기준 드롭 위치 계산.
   * - 상단 25%: BEFORE
   * - 중간 50%: INSIDE
   * - 하단 25%: AFTER
   */
  const computeDropPos = (e: React.DragEvent): AgentGroupReorderPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    if (ratio < 0.25) return 'BEFORE';
    if (ratio > 0.75) return 'AFTER';
    return 'INSIDE';
  };

  const filtered = useMemo(() => filterTree(tree, searchText.trim()), [tree, searchText]);
  const totalAgentCount = useMemo(() => tree.reduce((s, n) => s + (n.agentCount ?? 0), 0), [tree]);

  // 검색어 있으면 매칭 노드 모두 펼침
  const effectiveExpanded = useMemo(() => {
    if (!searchText.trim()) return expanded;
    const all = new Set<number>();
    const walk = (list: AgentGroupNode[]) => {
      for (const n of list) {
        all.add(n.groupId);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(filtered);
    return all;
  }, [expanded, filtered, searchText]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /** 트리에 자식이 있는 모든 노드 ID. "모두 펼치기" 토글에 사용. */
  const allExpandableIds = useMemo(() => {
    const ids: number[] = [];
    const walk = (list: AgentGroupNode[]) => {
      for (const n of list) {
        if (n.children?.length) {
          ids.push(n.groupId);
          walk(n.children);
        }
      }
    };
    walk(tree);
    return ids;
  }, [tree]);

  const allExpanded = allExpandableIds.length > 0 && allExpandableIds.every((id) => expanded.has(id));

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(allExpandableIds));
    }
  };

  const renderNode = (node: AgentGroupNode, depth: number): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = effectiveExpanded.has(node.groupId);
    const isSelected = selectedGroupId === node.groupId;
    const isDropTarget = dropTargetId === node.groupId;
    const groupHint = groupDropHint?.id === node.groupId ? groupDropHint.pos : null;

    return (
      <div key={node.groupId}>
        <div
          draggable={!!onGroupReorder}
          onDragStart={(e) => {
            if (!onGroupReorder) return;
            e.dataTransfer.setData(GROUP_DRAG_MIME, JSON.stringify({ groupId: node.groupId }));
            e.dataTransfer.effectAllowed = 'move';
            e.stopPropagation();
          }}
          className={`group relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none border-l-[3px] transition ${
            isDropTarget
              ? 'bg-emerald-50 border-emerald-500 outline outline-2 outline-dashed outline-emerald-500 -outline-offset-2'
              : groupHint === 'INSIDE'
                ? 'bg-blue-50 border-blue-500'
                : isSelected
                  ? 'bg-[#eef0f7] border-[#405189]'
                  : 'border-transparent hover:bg-gray-50'
          }`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => onSelectGroup(node.groupId)}
          onDragOver={(e) => {
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
          {/* 토글 */}
          <button
            type="button"
            className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggle(node.groupId);
            }}
          >
            {hasChildren ? isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" /> : null}
          </button>

          {/* drag handle hint — 항상 옅게, hover 시 진해짐 */}
          {onGroupReorder && <GripVertical className="size-3 flex-shrink-0 text-gray-300 group-hover:text-gray-500 transition cursor-grab" aria-hidden />}

          {/* 아이콘 — 자식 유무와 펼침 상태에 따라 폴더 아이콘 통일 */}
          {hasChildren && isOpen ? (
            <FolderOpen className={`size-3.5 flex-shrink-0 ${isSelected ? 'text-[#405189]' : 'text-gray-500'}`} />
          ) : (
            <FolderClosed className={`size-3.5 flex-shrink-0 ${isSelected ? 'text-[#405189]' : 'text-gray-500'}`} />
          )}

          <span className={`flex-1 text-[12.5px] truncate ${isSelected ? 'text-[#405189] font-semibold' : 'text-gray-700'}`} title={node.groupName}>
            {node.groupName}
          </span>

          {isDropTarget && <span className="text-[10px] text-emerald-600 font-medium">↓ 여기로 이동</span>}

          {/* 카운트 — 선택/hover 시 액션 아이콘에 자리를 양보 */}
          <span className={`text-[11px] text-gray-400 flex-shrink-0 ${isSelected ? 'hidden' : 'group-hover:hidden'}`}>{node.agentCount.toLocaleString()}</span>

          {/* 액션 — 선택된 그룹은 항상 표시, 외에는 hover 시 표시 */}
          <div className={`flex items-center gap-0.5 flex-shrink-0 transition ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[#eef0f7] hover:text-[#405189]"
              title="하위 그룹 추가"
              onClick={(e) => {
                e.stopPropagation();
                onCreateChild?.(node);
              }}
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[#eef0f7] hover:text-[#405189]"
              title="그룹 수정"
              onClick={(e) => {
                e.stopPropagation();
                onEditGroup?.(node);
              }}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="그룹 삭제"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup?.(node);
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {hasChildren && isOpen && <div>{node.children!.map((child) => renderNode(child, depth + 1))}</div>}
      </div>
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
            selectedGroupId === null ? 'bg-[#eef0f7] border-[#405189]' : 'border-transparent hover:bg-gray-50'
          }`}
          onClick={() => onSelectGroup(null)}
        >
          {/* grip 자리 placeholder — 그룹 노드와 좌측 정렬 맞춤 */}
          {onGroupReorder && <span className="size-3 flex-shrink-0" aria-hidden />}
          <FolderClosed className={`size-3.5 flex-shrink-0 ${selectedGroupId === null ? 'text-[#405189]' : 'text-gray-500'}`} />
          <span className={`flex-1 text-[12.5px] truncate ${selectedGroupId === null ? 'text-[#405189] font-semibold' : 'text-gray-700'}`}>전체</span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">{totalAgentCount.toLocaleString()}</span>
          {/* "전체" row 의 액션 자리 — 모두 펼치기/접기 토글 + 우측 정렬 폭 맞춤 */}
          <div className="flex items-center gap-0.5 flex-shrink-0 w-[64px] justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleAll();
              }}
              title={allExpanded ? '모두 접기' : '모두 펼치기'}
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[#eef0f7] hover:text-[#405189] transition"
            >
              {allExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
            </button>
          </div>
        </div>
        {filtered.map((root) => renderNode(root, 0))}
      </div>
    </div>
  );
}
