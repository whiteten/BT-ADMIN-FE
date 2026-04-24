import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tree, type TreeDataNode } from 'antd';
import { Pencil, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetEngines } from '../hooks/useCommonQueries';
import { recogQueryKeys, useDeleteRecogGroup, useGetRecogGroupList } from '../hooks/useRecogQueries';
import type { RecogGroupItem } from '../types';
import RecogGroupEditModal from './RecogGroupEditModal';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export type RecogTreeSelection = { type: 'engine'; engineCode: string } | { type: 'group'; group: RecogGroupItem };

interface RecogGroupTreeProps {
  selection: RecogTreeSelection | null;
  onSelectEngine: (engineCode: string) => void;
  onSelectGroup: (group: RecogGroupItem) => void;
  onGroupDeleted: (groupCode: string) => void;
  onGroupUpdated: (group: RecogGroupItem) => void;
}

interface GroupNodeTitleProps {
  group: RecogGroupItem;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function GroupNodeTitle({ group, onEdit, onDelete }: GroupNodeTitleProps) {
  return (
    <div className="flex items-center justify-between w-full group/node">
      <span>{group.groupName}</span>
      <span className="flex items-center gap-0.5 invisible group-hover/node:visible">
        <button className="p-0.5 rounded text-[#495057] hover:text-blue-500" onClick={onEdit}>
          <Pencil size={12} />
        </button>
        <button className="p-0.5 rounded text-[#495057] hover:text-red-500" onClick={onDelete}>
          <X size={12} />
        </button>
      </span>
    </div>
  );
}

export default function RecogGroupTree({ selection, onSelectEngine, onSelectGroup, onGroupDeleted, onGroupUpdated }: RecogGroupTreeProps) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const { data: engines = [], isLoading: isEnginesLoading } = useGetEngines();
  const { data: groupList = [], isLoading: isGroupLoading } = useGetRecogGroupList();
  const [editTarget, setEditTarget] = useState<RecogGroupItem | null>(null);

  const isLoading = isEnginesLoading || isGroupLoading;

  const { mutate: deleteGroup } = useDeleteRecogGroup({
    mutationOptions: {
      onSuccess: (_, groupCode) => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList.queryKey });
        onGroupDeleted(groupCode);
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleEditClick = (e: React.MouseEvent, group: RecogGroupItem) => {
    e.stopPropagation();
    setEditTarget(group);
  };

  const handleDeleteClick = (e: React.MouseEvent, group: RecogGroupItem) => {
    e.stopPropagation();
    modal.confirm.delete({ onOk: () => deleteGroup(group.groupCode) });
  };

  const treeData: TreeDataNode[] = engines.map((engine) => ({
    title: engine.value,
    key: `engine-${engine.code}`,
    children: groupList
      .filter((g) => g.engineCode === engine.code)
      .map((g) => ({
        title: <GroupNodeTitle group={g} onEdit={(e) => handleEditClick(e, g)} onDelete={(e) => handleDeleteClick(e, g)} />,
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
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : (
        <Tree treeData={treeData} selectedKeys={selectedKey ? [selectedKey] : []} onSelect={handleSelect} defaultExpandAll showLine={{ showLeafIcon: false }} blockNode />
      )}
      {editTarget && (
        <RecogGroupEditModal
          open
          group={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setEditTarget(null);
            onGroupUpdated(updated);
          }}
        />
      )}
    </div>
  );
}
