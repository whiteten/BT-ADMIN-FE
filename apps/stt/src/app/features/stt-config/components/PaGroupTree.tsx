import { Tree, type TreeDataNode } from 'antd';
import { useGetCodes } from '../hooks/useCommonQueries';
import type { CodeItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface PaGroupTreeProps {
  selectedGroupId: string | null;
  onSelect: (groupId: string | null, group: CodeItem | null) => void;
}

function buildTreeData(groups: CodeItem[]): TreeDataNode[] {
  return [
    {
      key: '__root__',
      title: 'PA 그룹',
      children: groups.map((g) => ({
        key: g.code,
        title: g.value,
        isLeaf: true,
      })),
    },
  ];
}

export default function PaGroupTree({ selectedGroupId, onSelect }: PaGroupTreeProps) {
  const { data: groups = [], isLoading } = useGetCodes({ params: { classCd: 'PA_GROUP' } });

  const treeData = buildTreeData(groups);

  const handleSelect = (keys: React.Key[]) => {
    const key = keys[0] as string | undefined;
    if (!key || key === '__root__') {
      onSelect(null, null);
      return;
    }
    const group = groups.find((g) => g.code === key) ?? null;
    onSelect(key, group);
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-sm font-semibold text-[#495057]">PA 그룹 관리</span>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : (
        <Tree treeData={treeData} selectedKeys={selectedGroupId ? [selectedGroupId] : []} onSelect={handleSelect} defaultExpandAll showLine={{ showLeafIcon: false }} blockNode />
      )}
    </div>
  );
}
