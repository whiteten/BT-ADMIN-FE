/**
 * 스킬셋 좌측 업무그룹 트리.
 *
 * 구조: "전체" + "미배정" + 그룹 트리 (선택된 테넌트의 그룹만, 평탄 — 테넌트 grouping X)
 *  - 카드 슬라이더에서 테넌트 선택 시 그 테넌트의 그룹만 표시
 *  - "전체" 테넌트 선택 시 모든 테넌트의 그룹 표시 (각 노드 명에 테넌트는 표기 X — 사용자 결정)
 *
 * 트리 인터랙션:
 *  - 호버 시 [+ ✎ 🗑] 액션
 *  - ag-Grid 행 드래그 → 노드 드롭하면 onSkillsetDrop(targetTreeId, skillsetIds)
 *  - 트리 검색
 */
import { useMemo, useState } from 'react';
import { Input } from 'antd';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, FolderClosed, FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { SkillsetGroupResponse } from '../types';
import { SKILLSET_DRAG_MIME } from './SkillsetTable';

interface Props {
  groups: SkillsetGroupResponse[]; // BE getGroups (테넌트 필터 적용된 결과)
  totalSkillsetCount: number;
  totalUnassignedCount: number;
  selectedTreeId: number | null; // null=전체, 0=미배정, n=실제 트리
  selectedTenantId: number | null; // null=전체 테넌트
  onSelect: (treeId: number | null) => void;
  onCreateChild: (parent: SkillsetGroupResponse | null) => void;
  onEdit: (group: SkillsetGroupResponse) => void;
  onDelete: (group: SkillsetGroupResponse) => void;
  /** 형제 노드 간 순서 이동 (up=위로). */
  onMove?: (group: SkillsetGroupResponse, up: boolean) => void;
  /** D&D 드롭 핸들러 — node 객체 전달 (테넌트 검증용). targetTreeId=0 이면 미배정. */
  onSkillsetDrop: (target: { treeId: number; tenantId: number | null }, skillsetIds: number[]) => void;
}

function filterTree(nodes: SkillsetGroupResponse[], kw: string): SkillsetGroupResponse[] {
  if (!kw) return nodes;
  const lower = kw.toLowerCase();
  const walk = (list: SkillsetGroupResponse[]): SkillsetGroupResponse[] => {
    const out: SkillsetGroupResponse[] = [];
    for (const n of list) {
      const matched = n.treeName.toLowerCase().includes(lower);
      const childMatched = walk(n.children ?? []);
      if (matched || childMatched.length > 0) {
        out.push({ ...n, children: matched ? n.children : childMatched });
      }
    }
    return out;
  };
  return walk(nodes);
}

export default function SkillsetGroupTree({
  groups,
  totalSkillsetCount,
  totalUnassignedCount,
  selectedTreeId,
  selectedTenantId,
  onSelect,
  onCreateChild,
  onEdit,
  onDelete,
  onMove,
  onSkillsetDrop,
}: Props) {
  const [searchText, setSearchText] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [unassignedDropOver, setUnassignedDropOver] = useState(false);

  const filtered = useMemo(() => filterTree(groups, searchText.trim()), [groups, searchText]);

  const allExpandableIds = useMemo(() => {
    const ids: number[] = [];
    const walk = (list: SkillsetGroupResponse[]) => {
      for (const n of list) {
        if ((n.children ?? []).length > 0) {
          ids.push(n.treeId);
          walk(n.children);
        }
      }
    };
    walk(groups);
    return ids;
  }, [groups]);
  const allExpanded = allExpandableIds.length > 0 && allExpandableIds.every((id) => expanded.has(id));

  const effectiveExpanded = useMemo(() => {
    if (!searchText.trim()) return expanded;
    const all = new Set<number>();
    const walk = (list: SkillsetGroupResponse[]) => {
      for (const n of list) {
        all.add(n.treeId);
        if ((n.children ?? []).length) walk(n.children);
      }
    };
    walk(filtered);
    return all;
  }, [expanded, filtered, searchText]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (allExpanded) setExpanded(new Set());
    else setExpanded(new Set(allExpandableIds));
  };

  const renderNode = (node: SkillsetGroupResponse, depth: number, isFirst: boolean, isLast: boolean): React.ReactNode => {
    const hasChildren = (node.children ?? []).length > 0;
    const isOpen = effectiveExpanded.has(node.treeId);
    const isSelected = selectedTreeId === node.treeId;
    const isDropTarget = dropTargetId === node.treeId;

    return (
      <div key={node.treeId}>
        <div
          className={`group relative flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none border-l-[3px] transition ${
            isDropTarget
              ? 'bg-emerald-50 border-emerald-500 outline outline-2 outline-dashed outline-emerald-500 -outline-offset-2'
              : isSelected
                ? 'bg-[#eef0f7] border-[#405189]'
                : 'border-transparent hover:bg-gray-50'
          }`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => onSelect(node.treeId)}
          onDragOver={(e) => {
            const types = e.dataTransfer.types;
            if (!types.includes(SKILLSET_DRAG_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // 중복 setState 방지 (자식 위로 mouse 이동마다 onDragOver 빈번 발생 → 깜빡임 방지)
            setDropTargetId((prev) => (prev === node.treeId ? prev : node.treeId));
          }}
          onDragLeave={(e) => {
            // 자식 요소(아이콘/버튼)로 hover 이동 시는 leave 무시 (HTML5 D&D 표준 패턴)
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDropTargetId((id) => (id === node.treeId ? null : id));
          }}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData(SKILLSET_DRAG_MIME);
            if (!raw) return;
            e.preventDefault();
            setDropTargetId(null);
            try {
              const ids = JSON.parse(raw) as number[];
              if (Array.isArray(ids) && ids.length > 0) onSkillsetDrop({ treeId: node.treeId, tenantId: node.tenantId }, ids);
            } catch {
              /* ignore */
            }
          }}
        >
          <button
            type="button"
            className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggle(node.treeId);
            }}
          >
            {hasChildren ? isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" /> : null}
          </button>

          {hasChildren && isOpen ? (
            <FolderOpen className={`size-3.5 flex-shrink-0 ${isSelected ? 'text-[#405189]' : 'text-gray-500'}`} />
          ) : (
            <FolderClosed className={`size-3.5 flex-shrink-0 ${isSelected ? 'text-[#405189]' : 'text-gray-500'}`} />
          )}

          <span
            className={`flex-1 text-[12.5px] truncate ${isSelected ? 'text-[#405189] font-semibold' : 'text-gray-700'}`}
            title={selectedTenantId === null && node.tenantName ? `${node.treeName} · 테넌트: ${node.tenantName}` : node.treeName}
          >
            {node.treeName}
            {/* 전체(admin) 보기에서 동일이름 그룹 구분 — 테넌트명 항상 노출. 단일테넌트 선택 시엔 중복이라 생략. */}
            {selectedTenantId === null && node.tenantName && (
              <span className={`ml-1 text-[11px] font-normal ${isSelected ? 'text-[#405189]/70' : 'text-gray-400'}`}>· {node.tenantName}</span>
            )}
          </span>

          {isDropTarget && <span className="text-[10px] text-emerald-600 font-medium">↓ 여기로 배정</span>}

          <span className={`text-[11px] text-gray-400 flex-shrink-0 ${isSelected ? 'hidden' : 'group-hover:hidden'}`}>{node.skillsetCount.toLocaleString()}</span>

          <div className={`flex items-center gap-0.5 flex-shrink-0 transition ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {onMove && (
              <>
                <button
                  type="button"
                  disabled={isFirst}
                  className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[#eef0f7] hover:text-[#405189] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title="위로 이동"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isFirst) onMove(node, true);
                  }}
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[#eef0f7] hover:text-[#405189] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  title="아래로 이동"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLast) onMove(node, false);
                  }}
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[#eef0f7] hover:text-[#405189]"
              title="하위 그룹 추가"
              onClick={(e) => {
                e.stopPropagation();
                onCreateChild(node);
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
                onEdit(node);
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
                onDelete(node);
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        {hasChildren && isOpen && <div>{node.children.map((c, i) => renderNode(c, depth + 1, i === 0, i === node.children.length - 1))}</div>}
      </div>
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
          title={`전체 ${totalSkillsetCount.toLocaleString()}건`}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
            isAllSelected ? 'border-[#405189] bg-[#405189] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
          }`}
        >
          <span className="font-medium">전체</span>
          <span className={isAllSelected ? 'text-white/80' : 'text-gray-400'}>{totalSkillsetCount.toLocaleString()}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect(0)}
          title={`미배정 ${totalUnassignedCount.toLocaleString()}건 (드래그로 배정 해제 가능)`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(SKILLSET_DRAG_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setUnassignedDropOver((prev) => (prev ? prev : true));
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setUnassignedDropOver(false);
          }}
          onDrop={(e) => {
            const raw = e.dataTransfer.getData(SKILLSET_DRAG_MIME);
            if (!raw) return;
            e.preventDefault();
            setUnassignedDropOver(false);
            try {
              const ids = JSON.parse(raw) as number[];
              if (Array.isArray(ids) && ids.length > 0) onSkillsetDrop({ treeId: 0, tenantId: null }, ids);
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
        <button
          type="button"
          onClick={toggleAll}
          title={allExpanded ? '모두 접기' : '모두 펼치기'}
          disabled={allExpandableIds.length === 0}
          className="ml-auto w-6 h-6 inline-flex items-center justify-center rounded text-gray-400 hover:bg-white hover:text-[#405189] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
        </button>
      </div>

      {/* 순수 그룹 트리 */}
      <div className="flex-1 overflow-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-gray-400">{selectedTenantId === null ? '상단 카드에서 테넌트를 선택하세요' : '등록된 업무그룹이 없습니다'}</div>
        ) : (
          filtered.map((node, i) => renderNode(node, 0, i === 0, i === filtered.length - 1))
        )}
      </div>
    </div>
  );
}
