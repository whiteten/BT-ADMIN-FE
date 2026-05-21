import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { Button, Input } from 'antd';
import { Network, Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ClusterGroupDialog, { type ClusterGroupDialogRef } from '../../features/node-management/components/ClusterGroupDialog';
import DroppableClusterGroup from '../../features/node-management/components/DroppableClusterGroup';
import NodeCard from '../../features/node-management/components/NodeCard';
import {
  clusterGroupQueryKeys,
  useCreateClusterGroup,
  useDeleteClusterGroup,
  useGetClusterGroups,
  useUpdateClusterGroup,
} from '../../features/node-management/hooks/useClusterGroupQueries';
import { nodeQueryKeys, useDeleteNode, useGetNodes, useMoveNodeCluster } from '../../features/node-management/hooks/useNodeQueries';
import type { ClusterGroup, NodeListItem } from '../../features/node-management/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconMoreVertical } from '@/components/custom/Icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '시스템' }, { title: '자원관리' }, { title: '클러스터 관리' }];

export default function NodeList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const clusterGroupDialogRef = useRef<ClusterGroupDialogRef>(null);
  const [searchValue, setSearchValue] = useState('');
  const [activeNode, setActiveNode] = useState<NodeListItem | null>(null);
  const [optimisticNodes, setOptimisticNodes] = useState<NodeListItem[] | null>(null);

  const { data: nodeList, isFetching: isNodesFetching } = useGetNodes();
  const { data: clusterGroups, isFetching: isGroupsFetching } = useGetClusterGroups();

  const isFetching = isNodesFetching || isGroupsFetching;

  // 노드 삭제
  const { mutate: deleteNode } = useDeleteNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('노드가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNodes().queryKey });
      },
    },
  });

  // 노드 클러스터 이동
  const { mutate: moveCluster } = useMoveNodeCluster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클러스터 그룹이 변경되었습니다.');
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNodes().queryKey });
        queryClient.invalidateQueries({ queryKey: clusterGroupQueryKeys.getClusterGroups().queryKey });
      },
    },
  });

  // 클러스터 그룹 CUD
  const { mutate: createGroup, isPending: isCreatingGroup } = useCreateClusterGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클러스터 그룹이 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: clusterGroupQueryKeys.getClusterGroups().queryKey });
      },
    },
  });
  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateClusterGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클러스터 그룹이 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: clusterGroupQueryKeys.getClusterGroups().queryKey });
      },
    },
  });
  const { mutate: deleteGroup } = useDeleteClusterGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클러스터 그룹이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: clusterGroupQueryKeys.getClusterGroups().queryKey });
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNodes().queryKey });
      },
    },
  });

  // optimisticNodes가 있으면 우선 사용 (드래그 중 로컬 상태)
  const displayNodes = optimisticNodes ?? nodeList;

  // 검색 필터
  const filteredNodes = useMemo(() => {
    if (!displayNodes) return [];
    if (!searchValue.trim()) return displayNodes;
    const keyword = searchValue.toLowerCase();
    return displayNodes.filter((n) => n.nodeName.toLowerCase().includes(keyword) || n.nodeAlias.toLowerCase().includes(keyword) || String(n.nodeId).includes(keyword));
  }, [displayNodes, searchValue]);

  // 클러스터별 노드 그룹핑
  const groupedNodes = useMemo(() => {
    const groups: Record<number, NodeListItem[]> = {};
    for (const node of filteredNodes) {
      const grpId = node.clusterGrpId ?? 0;
      if (!groups[grpId]) groups[grpId] = [];
      groups[grpId].push(node);
    }
    return groups;
  }, [filteredNodes]);

  // 핸들러
  const handleDetail = (nodeId: number) => navigate(`../${nodeId}`);
  const handleSettings = (nodeId: number) => navigate(`../${nodeId}/settings`);
  const handleClusterConfig = (nodeId: number) => navigate(`../${nodeId}/cluster-config`);

  const handleMoveCluster = (nodeId: number, clusterGrpId: number | null, clusterGrpName: string) => {
    const node = nodeList?.find((n) => n.nodeId === nodeId);
    const fromName = node?.clusterGrpName ?? '-';

    // 옵티미스틱 이동
    if (clusterGrpId != null) {
      const moved = (nodeList ?? []).map((n) => (n.nodeId === nodeId ? { ...n, clusterGrpId, clusterGrpName } : n));
      setOptimisticNodes(moved);
    }

    modal.confirm.execute({
      options: {
        title: '그룹 이동',
        content: `"${node?.nodeName}" 노드를 "${fromName}" → "${clusterGrpName}"(으)로 이동하시겠습니까?`,
      },
      onOk: () => {
        moveCluster({ id: nodeId, data: { clusterGrpId } });
        setOptimisticNodes(null);
      },
      onCancel: () => {
        setOptimisticNodes(null);
      },
    });
  };

  const handleDeleteNode = (nodeId: number, nodeName: string) => {
    modal.confirm.delete({
      options: {
        title: '노드 삭제',
        content: `'${nodeName}' 노드를 삭제하시겠습니까?`,
      },
      onOk: () => deleteNode({ id: nodeId }),
    });
  };

  const handleDeleteGroup = (group: ClusterGroup) => {
    modal.confirm.delete({
      options: {
        title: '클러스터 그룹 삭제',
        content: `'${group.clusterGrpName}' 클러스터를 삭제하시겠습니까?\n\n해당 클러스터에 라이선스가 할당되어 있을 경우, 삭제 시 클러스터의 라이선스가 회수됩니다.`,
      },
      onOk: () => deleteGroup({ id: group.clusterGrpId }),
    });
  };

  const handleGroupDialogSubmit = (mode: 'create' | 'edit', values: { clusterGrpId?: number; clusterGrpName: string }) => {
    if (mode === 'create') {
      createGroup({ clusterGrpName: values.clusterGrpName });
    } else if (values.clusterGrpId) {
      updateGroup({ id: values.clusterGrpId, data: { clusterGrpName: values.clusterGrpName } });
    }
  };

  // DnD 핸들러
  const handleDragStart = (event: DragStartEvent) => {
    const draggedNodeId = event.active.data.current?.nodeId as number;
    const node = nodeList?.find((n) => n.nodeId === draggedNodeId) ?? null;
    setActiveNode(node);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveNode(null);
    const { active, over } = event;
    if (!over) return;

    const draggedNodeId = active.data.current?.nodeId as number;
    const fromClusterGrpId = active.data.current?.clusterGrpId as number;
    const toClusterGrpId = over.data.current?.clusterGrpId as number;

    if (!toClusterGrpId || fromClusterGrpId === toClusterGrpId) return;

    const node = nodeList?.find((n) => n.nodeId === draggedNodeId);
    const toGroup = clusterGroups?.find((g) => g.clusterGrpId === toClusterGrpId);
    if (!node || !toGroup) return;

    // 옵티미스틱: 로컬에서 즉시 이동
    const moved = (nodeList ?? []).map((n) => (n.nodeId === draggedNodeId ? { ...n, clusterGrpId: toClusterGrpId, clusterGrpName: toGroup.clusterGrpName } : n));
    setOptimisticNodes(moved);

    modal.confirm.execute({
      options: {
        title: '그룹 이동',
        content: `"${node.nodeName}" 노드를 "${node.clusterGrpName}" → "${toGroup.clusterGrpName}"(으)로 이동하시겠습니까?`,
      },
      onOk: () => {
        moveCluster({ id: draggedNodeId, data: { clusterGrpId: toClusterGrpId } });
        setOptimisticNodes(null); // API 성공 후 서버 데이터로 복원
      },
      onCancel: () => {
        setOptimisticNodes(null); // 원복
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="노드명, 약칭, ID로 검색" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => clusterGroupDialogRef.current?.open('create')}>
            <Plus className="w-4 h-4 mr-1" />
            클러스터 그룹 추가
          </Button>
          <Button type="primary" onClick={() => navigate('../create')}>
            <Plus className="w-4 h-4 mr-1" />
            노드 추가
          </Button>
        </div>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : (
        <DndContext collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {(clusterGroups ?? []).map((group) => {
              const groupNodes = groupedNodes[group.clusterGrpId] ?? [];
              return (
                <DroppableClusterGroup key={group.clusterGrpId} clusterGrpId={group.clusterGrpId}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Network className="w-5 h-5 text-[var(--color-bt-primary)]" />
                      <span className="text-base font-semibold text-gray-800">{group.clusterGrpName}</span>
                      <span className="text-sm text-[#868e96]">({groupNodes.length}/8)</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-6 h-6 flex items-center justify-center hover:cursor-pointer hover:bg-gray-100 rounded">
                          <IconMoreVertical />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="dark" align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            clusterGroupDialogRef.current?.open('edit', {
                              clusterGrpId: group.clusterGrpId,
                              clusterGrpName: group.clusterGrpName,
                            })
                          }
                          className="hover:cursor-pointer"
                        >
                          그룹명 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteGroup(group)} className="hover:cursor-pointer text-red-500">
                          그룹 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {groupNodes.length > 0 ? (
                    <div className="grid grid-cols-[repeat(4,minmax(250px,1fr))] gap-3">
                      {groupNodes.map((node) => (
                        <NodeCard
                          key={node.nodeId}
                          {...node}
                          clusterGroups={clusterGroups}
                          onDetail={handleDetail}
                          onSettings={handleSettings}
                          onClusterConfig={handleClusterConfig}
                          onMoveCluster={handleMoveCluster}
                          onDelete={handleDeleteNode}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[#ced4da] py-4 text-center">소속 노드가 없습니다.</div>
                  )}
                </DroppableClusterGroup>
              );
            })}
          </div>

          {/* 드래그 중 오버레이 */}
          <DragOverlay>
            {activeNode ? (
              <div className="bg-white border-2 border-[var(--color-bt-primary)] rounded-lg p-4 shadow-xl opacity-90 w-[280px]">
                <div className="font-semibold text-[15px] text-gray-800">{activeNode.nodeName}</div>
                <div className="text-[13px] text-[#868e96]">{activeNode.nodeAlias}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <ClusterGroupDialog ref={clusterGroupDialogRef} onSubmit={handleGroupDialogSubmit} isPending={isCreatingGroup || isUpdatingGroup} />
    </div>
  );
}
