/**
 * PA 그룹 선택 트리.
 * 공통 트리(useTreeView + TreeView 프리미티브) 기반 — antd Tree 에서 이관.
 * 구조: "PA 그룹" 루트 폴더 + leaf 그룹 목록 (2-depth 고정).
 */
import { useEffect, useRef } from 'react';
import { PA_GROUP_OPTIONS } from '../constants/sttCodeConstants';
import type { CodeItem } from '../types';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

interface PaGroupTreeProps {
  selectedGroupId: string | null;
  onSelect: (groupId: string | null, group: CodeItem | null) => void;
}

/** 트리 렌더용 노드 — 루트('__root__')와 leaf 그룹을 한 타입으로. */
interface PaTreeNode {
  key: string;
  label: string;
  group: CodeItem | null;
  children?: PaTreeNode[];
}

function buildTreeData(groups: CodeItem[]): PaTreeNode[] {
  return [
    {
      key: '__pa_root__',
      label: 'PA 그룹',
      group: null,
      children: groups.map((g) => ({ key: g.code, label: g.value, group: g })),
    },
  ];
}

export default function PaGroupTree({ selectedGroupId, onSelect }: PaGroupTreeProps) {
  const groups = PA_GROUP_OPTIONS;
  const initialized = useRef(false);

  useEffect(() => {
    if (groups.length > 0 && !initialized.current) {
      initialized.current = true;
      onSelect(groups[0].code, groups[0]);
    }
  }, [groups, onSelect]);

  const treeData = buildTreeData(groups);

  const { items, rootProps } = useTreeView<PaTreeNode>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    defaultExpandAll: true,
    ariaLabel: 'PA 그룹 트리',
  });

  const handleSelectNode = (node: PaTreeNode) => {
    if (!node.group) {
      onSelect(null, null);
      return;
    }
    onSelect(node.group.code, node.group);
  };

  const renderRow = (item: TreeViewItem<PaTreeNode>) => {
    const node = item.node;
    const isSelected = node.group != null && node.group.code === selectedGroupId;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => handleSelectNode(node)}>
        <TreeCaret item={item} />
        {item.isFolder && <TreeFolderIcon item={item} selected={isSelected} />}
        <TreeLabel selected={isSelected} title={node.label}>
          {node.label}
        </TreeLabel>
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <span className="text-sm font-semibold text-[#495057]">PA 그룹 관리</span>
      <div className="flex-1 overflow-auto">
        <div {...rootProps}>{items.map(renderRow)}</div>
      </div>
    </div>
  );
}
