import { useEffect, useRef } from 'react';
import { Tree, type TreeDataNode } from 'antd';
import { useGetRetryReqTree } from '../hooks/useRetryReqQueries';
import type { RetryReqTreeItem } from '../types';

function buildTreeData(items: RetryReqTreeItem[]): TreeDataNode[] {
  const yearItems = items.filter((i) => i.treeDepth === 1);
  const monthItems = items.filter((i) => i.treeDepth === 2);

  return yearItems.map((year) => ({
    key: year.treeId,
    title: year.treeName,
    children: monthItems.filter((m) => m.parentId === year.treeId).map((month) => ({ key: month.treeId, title: month.treeName, isLeaf: true })),
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

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-sm font-semibold text-[#495057]">재처리 일정</span>
      {treeData.length > 0 && (
        <Tree
          treeData={treeData}
          selectedKeys={selectedKey ? [selectedKey] : []}
          onSelect={(keys) => {
            const key = keys[0] as string | undefined;
            if (key) onSelect(key);
          }}
          defaultExpandAll
          showLine={{ showLeafIcon: false }}
          blockNode
        />
      )}
    </div>
  );
}
