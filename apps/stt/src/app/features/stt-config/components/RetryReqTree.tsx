/**
 * 재처리 일정 선택 트리.
 * 공통 트리(useTreeView + TreeView 프리미티브) 기반 — antd Tree 에서 이관.
 * 구조: 연도(폴더) → 월(leaf) 2-depth 고정.
 */
import { useEffect, useRef } from 'react';
import { useGetRetryReqTree } from '../hooks/useRetryReqQueries';
import type { RetryReqTreeItem } from '../types';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

/** 트리 렌더용 노드 — 연도/월을 한 타입으로. */
interface RetryTreeNode {
  key: string;
  label: string;
  children?: RetryTreeNode[];
}

function buildTreeData(items: RetryReqTreeItem[]): RetryTreeNode[] {
  const yearItems = items.filter((i) => i.treeDepth === 1);
  const monthItems = items.filter((i) => i.treeDepth === 2);

  return yearItems.map((year) => ({
    key: year.treeId,
    label: year.treeName,
    children: monthItems.filter((m) => m.parentId === year.treeId).map((month) => ({ key: month.treeId, label: month.treeName })),
  }));
}

function getLastLeafKey(items: RetryReqTreeItem[]): string | null {
  const leaves = items.filter((i) => i.treeDepth === 2);
  if (leaves.length === 0) return null;
  return [...leaves].sort((a, b) => b.treeId.localeCompare(a.treeId))[0].treeId;
}

interface RetryReqTreeProps {
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export default function RetryReqTree({ selectedKey, onSelect }: RetryReqTreeProps) {
  const initialized = useRef(false);
  const { data: treeItems = [] } = useGetRetryReqTree();
  const treeData = buildTreeData(treeItems);

  useEffect(() => {
    if (treeItems.length > 0 && !initialized.current) {
      initialized.current = true;
      const lastLeaf = getLastLeafKey(treeItems);
      if (lastLeaf) onSelect(lastLeaf);
    }
  }, [treeItems, onSelect]);

  const { items, rootProps } = useTreeView<RetryTreeNode>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    defaultExpandAll: true,
    ariaLabel: '재처리 일정 트리',
  });

  const renderRow = (item: TreeViewItem<RetryTreeNode>) => {
    const node = item.node;
    const isSelected = node.key === selectedKey;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => onSelect(node.key)}>
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
      <span className="text-sm font-semibold text-[#495057]">재처리 일정</span>
      {items.length > 0 && (
        <div className="flex-1 overflow-auto">
          <div {...rootProps}>{items.map(renderRow)}</div>
        </div>
      )}
    </div>
  );
}
