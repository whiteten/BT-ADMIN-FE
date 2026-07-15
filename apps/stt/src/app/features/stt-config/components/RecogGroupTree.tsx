/**
 * 정답지(인식) 그룹 선택 트리.
 * 공통 트리(useTreeView + TreeView 프리미티브) 기반 — antd Tree 에서 이관.
 * 구조: 엔진(폴더) → 인식 그룹(leaf, hover 시 수정/삭제 액션) 2-depth 고정.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { ENGINE_KIND_OPTIONS } from '../constants/sttCodeConstants';
import { recogQueryKeys, useDeleteRecogGroup, useGetRecogGroupList } from '../hooks/useRecogQueries';
import type { RecogGroupItem } from '../types';
import RecogGroupEditModal, { type RecogGroupEditModalRef } from './RecogGroupEditModal';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { TreeCaret, TreeFolderIcon, TreeLabel, TreeRow } from '@/components/custom/TreeView';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';
import useTreeView, { type TreeViewItem } from '@/libs/shared-ui/src/hooks/useTreeView';

export type RecogTreeSelection = { type: 'engine'; engineCode: string } | { type: 'group'; group: RecogGroupItem };

interface RecogGroupTreeProps {
  selection: RecogTreeSelection | null;
  onSelectEngine: (engineCode: string) => void;
  onSelectGroup: (group: RecogGroupItem) => void;
  onGroupDeleted: (groupCode: string) => void;
  onGroupUpdated: (group: RecogGroupItem) => void;
}

/** 트리 렌더용 노드 — 엔진(폴더)과 그룹(leaf)을 한 타입으로. */
interface RecogTreeNode {
  key: string;
  label: string;
  engineCode?: string;
  group?: RecogGroupItem;
  children?: RecogTreeNode[];
}

export default function RecogGroupTree({ selection, onSelectEngine, onSelectGroup, onGroupDeleted, onGroupUpdated }: RecogGroupTreeProps) {
  const queryClient = useQueryClient();
  const modal = useModal();
  const engines = ENGINE_KIND_OPTIONS;
  const { data: groupList = [], isLoading: isGroupLoading } = useGetRecogGroupList();
  const editModalRef = useRef<RecogGroupEditModalRef>(null);
  const initialized = useRef(false);

  const isLoading = isGroupLoading;

  useEffect(() => {
    if (isLoading || initialized.current) return;
    const firstGroup = groupList.find((g) => g.engineCode === engines[0]?.code);
    if (firstGroup) {
      initialized.current = true;
      onSelectGroup(firstGroup);
    }
  }, [isLoading, engines, groupList, onSelectGroup]);

  const { mutate: deleteGroup } = useDeleteRecogGroup({
    mutationOptions: {
      onSuccess: (_, groupCode) => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: recogQueryKeys.getRecogGroupList._def });
        onGroupDeleted(groupCode);
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleEditClick = (e: React.MouseEvent, group: RecogGroupItem) => {
    e.stopPropagation();
    editModalRef.current?.open(group);
  };

  const handleDeleteClick = (e: React.MouseEvent, group: RecogGroupItem) => {
    e.stopPropagation();
    modal.confirm.delete({ onOk: () => deleteGroup(group.groupCode) });
  };

  const treeData: RecogTreeNode[] = engines.map((engine) => ({
    key: `engine-${engine.code}`,
    label: engine.value,
    engineCode: engine.code,
    children: groupList.filter((g) => g.engineCode === engine.code).map((g) => ({ key: `group-${g.groupCode}`, label: g.groupName, group: g })),
  }));

  const selectedKey = selection?.type === 'engine' ? `engine-${selection.engineCode}` : selection?.type === 'group' ? `group-${selection.group.groupCode}` : null;

  const { items, rootProps } = useTreeView<RecogTreeNode>({
    data: treeData,
    getId: (n) => n.key,
    getChildren: (n) => n.children,
    getName: (n) => n.label,
    defaultExpandAll: true,
    ariaLabel: '인식 그룹 트리',
  });

  const handleSelectNode = (node: RecogTreeNode) => {
    if (node.group) {
      onSelectGroup(node.group);
    } else if (node.engineCode) {
      onSelectEngine(node.engineCode);
    }
  };

  const renderRow = (item: TreeViewItem<RecogTreeNode>) => {
    const node = item.node;
    const group = node.group;
    const isSelected = node.key === selectedKey;
    return (
      <TreeRow key={item.id} item={item} selected={isSelected} onClick={() => handleSelectNode(node)}>
        <TreeCaret item={item} />
        {item.isFolder && <TreeFolderIcon item={item} selected={isSelected} />}
        <TreeLabel selected={isSelected} title={node.label}>
          {node.label}
        </TreeLabel>
        {/* 우측 액션 슬롯 — 모든 행에 h-5 고정으로 상시 존재시켜 hover 시 행 높이가 흔들리지 않게 한다(MenuTree 와 동일 패턴).
            그룹 leaf 만 hover 시 수정/삭제 버튼 노출. 버튼 스타일은 AgentGroupTree 규격
            (툴팁은 원본에 없던 요소라 미적용 — 사용자 결정) */}
        <div className="flex items-center gap-0.5 h-5 flex-shrink-0">
          {group && (
            <>
              <button
                type="button"
                className="hidden group-hover:inline-flex w-5 h-5 items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
                onClick={(e) => handleEditClick(e, group)}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                className="hidden group-hover:inline-flex w-5 h-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={(e) => handleDeleteClick(e, group)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </TreeRow>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <span className="text-sm font-semibold text-[#495057]">정답지 그룹 관리</span>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div {...rootProps}>{items.map(renderRow)}</div>
        </div>
      )}
      <RecogGroupEditModal ref={editModalRef} onUpdated={onGroupUpdated} />
    </div>
  );
}
