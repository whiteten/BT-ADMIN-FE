/**
 * IPT 조직 트리 (좌측 패널) — AgentGroupTree 패턴.
 *
 * - 공통 트리(useTreeView + TreeView 프리미티브): depth 들여쓰기, 토글/펼침, 선택, 키보드 a11y
 * - hover 액션: 하위 조직 추가 / 수정 / 삭제 (콜백 미전달 시 read-only — 사용자관리 화면이 필터 용도로 재사용)
 * - 노드 우측에 소속 사용자수(하위 합산) 배지, 비활성 조직 회색 처리
 */
import { useState } from 'react';
import { Input, Tooltip } from 'antd';
import { Building2, ChevronsDownUp, ChevronsUpDown, FolderClosed, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { fuzzyScore } from '@/shared-util';
import type { IptOrgTreeNode } from '../types';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

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

interface IptOrgTreeProps {
  tree: IptOrgTreeNode[];
  selectedOrgId: number | null;
  /** 운영자 전체 모드에서 보기필터로 선택된 테넌트(합성 노드 하이라이트용) */
  selectedTenantId?: number | null;
  onSelectOrg: (dnGroupId: number | null) => void;
  /** 운영자 전체 모드의 합성 테넌트 노드 클릭 — 보기필터만 좁힘 (agent-master 패턴) */
  onSelectTenant?: (tenantId: number) => void;
  /** "전체" 행 숨김 (조직도관리처럼 조직 선택이 필수인 화면) */
  hideAllRow?: boolean;
  onCreateChild?: (parent: IptOrgTreeNode | null) => void; // null = 최상위 추가
  onEditOrg?: (org: IptOrgTreeNode) => void;
  onDeleteOrg?: (org: IptOrgTreeNode) => void;
}

export default function IptOrgTree({
  tree,
  selectedOrgId,
  selectedTenantId,
  onSelectOrg,
  onSelectTenant,
  hideAllRow = false,
  onCreateChild,
  onEditOrg,
  onDeleteOrg,
}: IptOrgTreeProps) {
  // 액션 콜백 미전달 시 read-only — 액션 아이콘 자체를 렌더하지 않음 (사용자관리 좌측 필터 트리)
  const readOnly = !onCreateChild && !onEditOrg && !onDeleteOrg;
  const [searchText, setSearchText] = useState('');

  const { items, rootProps, allExpanded, toggleAll } = useTreeView<IptOrgTreeNode>({
    data: tree,
    getId: (n) => String(n.dnGroupId),
    getChildren: (n) => n.children,
    getName: (n) => n.dnGrpName,
    searchText,
    matchesSearch: (n, kw) => fuzzyScore(kw, n.dnGrpName) >= 0,
    ariaLabel: 'IPT 조직 트리',
  });

  const totalUserCount = tree.reduce((s, n) => s + (n.userCount ?? 0), 0);
  const allRowSelected = selectedOrgId === null;

  const renderRow = (item: TreeViewItem<IptOrgTreeNode>) => {
    const node = item.node;
    const isScope = node._scopeKind === 'tenant'; // 운영자 전체 모드의 합성 테넌트 노드
    const isSelected = isScope ? selectedTenantId === node.tenantId : selectedOrgId === node.dnGroupId;
    const inactive = !isScope && node.activateYn === 0;

    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => (isScope ? onSelectTenant?.(node.tenantId) : onSelectOrg(node.dnGroupId))}>
        <TreeCaret item={item} />
        {isScope ? <Building2 className="size-3.5 flex-shrink-0 text-amber-600" /> : <TreeFolderIcon item={item} selected={isSelected} />}
        <TreeLabel selected={isSelected} title={node.dnGrpName}>
          <span className={isScope ? 'font-semibold text-amber-800' : inactive ? 'text-gray-400' : undefined}>{node.dnGrpName}</span>
          {inactive && <span className="ml-1 text-[10px] text-gray-400">(비활성)</span>}
        </TreeLabel>

        {/* 소속 사용자수 (하위 합산) — 맨 우측 상시 표시 */}
        <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{node.userCount.toLocaleString()}</span>

        {!readOnly && !isScope && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Tooltip title="하위 조직 추가" {...TOOLTIP_PROPS}>
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
            <Tooltip title="조직 수정" {...TOOLTIP_PROPS}>
              <button
                type="button"
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditOrg?.(node);
                }}
              >
                <Pencil className="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip title="조직 삭제" {...TOOLTIP_PROPS}>
              <button
                type="button"
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOrg?.(node);
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
          placeholder="조직 검색"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="small"
        />
      </div>
      <div className="flex-1 overflow-auto py-1">
        {!hideAllRow && (
          <div
            className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none border-l-[3px] transition ${
              allRowSelected ? 'bg-[var(--color-bt-primary-soft)] border-[var(--color-bt-primary)]' : 'border-transparent hover:bg-gray-50'
            }`}
            onClick={() => onSelectOrg(null)}
          >
            <FolderClosed className={`size-3.5 flex-shrink-0 ${allRowSelected ? 'text-[var(--color-bt-primary)]' : 'text-gray-500'}`} />
            <span className={`flex-1 text-[12.5px] truncate ${allRowSelected ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-gray-700'}`}>전체</span>
            <span className="h-5 inline-flex items-center text-[11px] text-gray-400 flex-shrink-0">{totalUserCount.toLocaleString()}</span>
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
        )}
        {hideAllRow && (
          <div className="flex items-center justify-end px-3 py-1">
            <Tooltip title={allExpanded ? '모두 접기' : '모두 펼치기'} {...TOOLTIP_PROPS}>
              <button
                type="button"
                onClick={toggleAll}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)] transition"
              >
                {allExpanded ? <ChevronsDownUp className="size-3.5" /> : <ChevronsUpDown className="size-3.5" />}
              </button>
            </Tooltip>
          </div>
        )}
        <div {...rootProps}>{items.map(renderRow)}</div>
      </div>
    </div>
  );
}
