import { Tree, type TreeDataNode } from 'antd';
import type { RecogGroupItem } from '../types';

const ENGINE_LIST = [
  { label: 'ENGINE#0', code: 'ENGINE0' },
  { label: 'ENGINE#1', code: 'ENGINE1' },
  { label: 'ENGINE#2', code: 'ENGINE2' },
];

export type RecogTreeSelection = { type: 'engine'; engineCode: string } | { type: 'group'; group: RecogGroupItem };

interface RecogGroupTreeProps {
  groupList: RecogGroupItem[];
  selection: RecogTreeSelection | null;
  onSelectEngine: (engineCode: string) => void;
  onSelectGroup: (group: RecogGroupItem) => void;
}

export default function RecogGroupTree({ groupList, selection, onSelectEngine, onSelectGroup }: RecogGroupTreeProps) {
  const treeData: TreeDataNode[] = ENGINE_LIST.map((engine) => ({
    title: engine.label,
    key: `engine-${engine.code}`,
    children: groupList
      .filter((g) => g.engineCode === engine.code)
      .map((g) => ({
        title: g.groupName,
        key: `group-${g.groupCode}`,
        isLeaf: true,
      })),
  }));

  const selectedKey = selection?.type === 'engine' ? `engine-${selection.engineCode}` : selection?.type === 'group' ? `group-${selection.group.groupCode}` : undefined;

  const handleSelect = (keys: React.Key[]) => {
    const key = keys[0] as string;
    if (!key) return;
    if (key.startsWith('engine-')) {
      onSelectEngine(key.replace('engine-', ''));
    } else if (key.startsWith('group-')) {
      const groupCode = key.replace('group-', '');
      const group = groupList.find((g) => g.groupCode === groupCode);
      if (group) onSelectGroup(group);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-sm font-semibold text-[#495057]">정답지 그룹 관리</span>
      <Tree treeData={treeData} selectedKeys={selectedKey ? [selectedKey] : []} onSelect={handleSelect} defaultExpandAll showLine={{ showLeafIcon: false }} blockNode />
    </div>
  );
}
