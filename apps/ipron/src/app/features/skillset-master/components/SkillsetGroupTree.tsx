/**
 * 스킬셋 좌측 업무그룹 트리.
 *
 * - 공통 트리(useTreeView + TreeView 프리미티브) 기반: depth 들여쓰기, 토글/펼침, 선택, 검색, 키보드 a11y
 * - 구조: "전체" + "미배정" 칩 + 그룹 트리 (선택된 테넌트의 그룹만, 평탄 — 테넌트 grouping X)
 *  - 카드 슬라이더에서 테넌트 선택 시 그 테넌트의 그룹만 표시
 *  - "전체" 테넌트 선택 시 모든 테넌트의 그룹 표시 (각 노드 명에 테넌트는 표기 X — 사용자 결정)
 *
 * 트리 인터랙션:
 *  - 호버 시 [↑ ↓ + ✎ 🗑] 액션
 *  - ag-Grid 행 드래그 → 노드 드롭하면 onSkillsetDrop(targetTreeId, skillsetIds)
 *  - 트리 검색
 */
import { useState } from 'react';
import { Input, Tooltip } from 'antd';
import { ArrowDown, ArrowUp, ChevronsDownUp, ChevronsUpDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { SkillsetGroupResponse } from '../types';
import { SKILLSET_DRAG_MIME } from './SkillsetTable';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

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
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [unassignedDropOver, setUnassignedDropOver] = useState(false);

  const { items, rootProps, allExpanded, toggleAll } = useTreeView<SkillsetGroupResponse>({
    data: groups,
    getId: (n) => String(n.treeId),
    getChildren: (n) => n.children,
    getName: (n) => n.treeName,
    searchText,
    ariaLabel: '업무그룹 트리',
  });

  // 형제 내 위치(첫/마지막) — onMove 버튼 비활성 판단용. 전체 데이터 기준.
  const siblingPos = new Map<number, { isFirst: boolean; isLast: boolean }>();
  const walkSibling = (list: SkillsetGroupResponse[]) => {
    list.forEach((n, i) => {
      siblingPos.set(n.treeId, { isFirst: i === 0, isLast: i === list.length - 1 });
      if ((n.children ?? []).length) walkSibling(n.children);
    });
  };
  walkSibling(groups);

  const hasExpandable = groups.some((n) => (n.children ?? []).length > 0);

  const renderRow = (item: TreeViewItem<SkillsetGroupResponse>) => {
    const node = item.node;
    const isSelected = selectedTreeId === node.treeId;
    const isDropTarget = dropTargetId === node.treeId;
    const pos = siblingPos.get(node.treeId);

    return (
      <TreeRow
        key={item.id}
        item={item}
        selected={isSelected}
        className={isDropTarget ? 'bg-emerald-50 border-emerald-500 outline outline-2 outline-dashed outline-emerald-500 -outline-offset-2' : undefined}
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
        <TreeCaret item={item} />

        <TreeFolderIcon item={item} selected={isSelected} />

        <TreeLabel selected={isSelected} title={selectedTenantId === null && node.tenantName ? `${node.treeName} · 테넌트: ${node.tenantName}` : node.treeName}>
          {node.treeName}
        </TreeLabel>

        {isDropTarget && <span className="text-[10px] text-emerald-600 font-medium">↓ 여기로 배정</span>}

        {/* 테넌트명 — 전체(admin) 보기에서 동일이름 그룹 구분용. 카운트 왼쪽에 칩(pill) 스타일로 표기해
            숫자와 시각적으로 구분하고, hover 시 카운트와 함께 숨겨 액션 버튼에 자리를 내준다.
            단일테넌트 선택 시엔 중복이라 생략. */}
        {selectedTenantId === null && node.tenantName && (
          <span className="h-5 inline-flex items-center flex-shrink-0">
            <span className="px-1.5 py-px rounded-full bg-gray-100 text-[10px] leading-4 text-gray-500 max-w-[120px] truncate">{node.tenantName}</span>
          </span>
        )}

        {/* 카운트 — 맨 우측에 상시 표시 */}
        <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{node.skillsetCount.toLocaleString()}</span>

        {/* 액션 — 상시 표시 */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onMove && (
            <>
              <Tooltip title="위로 이동" {...TOOLTIP_PROPS}>
                <button
                  type="button"
                  disabled={pos?.isFirst}
                  className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!pos?.isFirst) onMove(node, true);
                  }}
                >
                  <ArrowUp className="size-3.5" />
                </button>
              </Tooltip>
              <Tooltip title="아래로 이동" {...TOOLTIP_PROPS}>
                <button
                  type="button"
                  disabled={pos?.isLast}
                  className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!pos?.isLast) onMove(node, false);
                  }}
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </Tooltip>
            </>
          )}
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
          title={`전체 ${totalSkillsetCount.toLocaleString()}건`}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition ${
            isAllSelected
              ? 'border-[var(--color-bt-primary)] bg-[var(--color-bt-primary)] text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-[var(--color-bt-primary)]/40 hover:text-[var(--color-bt-primary)]'
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
      </div>

      {/* 순수 그룹 트리 */}
      <div className="flex-1 overflow-auto py-1">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-gray-400">{selectedTenantId === null ? '상단 카드에서 테넌트를 선택하세요' : '등록된 업무그룹이 없습니다'}</div>
        ) : (
          <div {...rootProps}>{items.map(renderRow)}</div>
        )}
      </div>
    </div>
  );
}
