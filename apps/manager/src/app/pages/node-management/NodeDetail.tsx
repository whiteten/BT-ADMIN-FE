import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, pointerWithin, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Button, Descriptions, Tag } from 'antd';
import { GripVertical, Plus, X } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { nodeQueryKeys, useGetNode } from '../../features/node-management/hooks/useNodeQueries';
import {
  tenantAllocQueryKeys,
  useCreateTenantAlloc,
  useDeleteTenantAlloc,
  useGetClusterConfig,
  useGetTenantAllocDetail,
  useGetTenantAllocs,
} from '../../features/node-management/hooks/useTenantAllocQueries';
import { LICENSE_KIND_LABELS, MCS_ROUTE_METHOD_LABELS, NAT_OPTION_LABELS, type TenantAllocItem, WORKTIME_OPT_LABELS } from '../../features/node-management/types';
import { useGetTenants } from '../../features/tenant-management/hooks/useTenantQueries';
import type { TenantListItem } from '../../features/tenant-management/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

/** 할당된 테넌트 드래그 카드 */
function AllocatedTenantCard({ alloc, isSelected, onClick }: { alloc: TenantAllocItem; isSelected: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `alloc-${alloc.tenantId}`,
    data: { type: 'allocated', tenantId: alloc.tenantId, tenantName: alloc.tenantName },
  });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-3 transition-colors cursor-pointer ${
        isSelected
          ? 'border-[var(--color-bt-primary)] bg-blue-50/30'
          : isDragging
            ? 'border-[var(--color-bt-primary)] shadow-lg'
            : 'border-[#e9ecef] hover:border-[var(--color-bt-primary)]'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500" {...listeners} {...attributes}>
          <GripVertical className="w-4 h-4" />
        </span>
        <Badge status="success" />
        <span className="font-semibold text-sm">{alloc.tenantName ?? `테넌트 ${alloc.tenantId}`}</span>
      </div>
      {alloc.licenses.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-8">
          {alloc.licenses.map((lic) => (
            <Tag key={lic.licenseKind} className="!m-0 !text-xs">
              {LICENSE_KIND_LABELS[lic.licenseKind] ?? `L${lic.licenseKind}`}: {lic.licenseAmt}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
}

/** 미할당 테넌트 드래그 카드 */
function UnallocatedTenantCard({ tenant }: { tenant: TenantListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `unalloc-${tenant.tenantId}`,
    data: { type: 'unallocated', tenantId: tenant.tenantId, tenantName: tenant.tenantName },
  });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg px-3 py-2 transition-colors ${isDragging ? 'border-[var(--color-bt-primary)] shadow-lg' : 'border-[#e9ecef] hover:border-[var(--color-bt-primary)]'}`}
    >
      <div className="flex items-center gap-2">
        <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500" {...listeners} {...attributes}>
          <GripVertical className="w-4 h-4" />
        </span>
        <span className="text-sm font-medium text-gray-700">{tenant.tenantName}</span>
        <span className="text-xs text-gray-400">({tenant.tenantId})</span>
      </div>
    </div>
  );
}

/** 할당 영역 드롭존 */
function AllocatedDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'allocated-zone', data: { action: 'allocate' } });

  return (
    <div ref={setNodeRef} className={`flex-1 min-h-[200px] rounded-lg p-4 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-[var(--color-bt-primary)] ring-dashed' : ''}`}>
      {isEmpty && !isOver ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow rounded-lg">
          <NoData message="할당된 테넌트가 없습니다. 아래에서 드래그하여 할당하세요." iconSize={50} fontSize="text-base" gap={2} />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">{children}</div>
      )}
    </div>
  );
}

/** 미할당 영역 드롭존 */
function UnallocatedDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unallocated-zone', data: { action: 'deallocate' } });

  return (
    <div ref={setNodeRef} className={`min-h-[100px] rounded-lg p-4 transition-colors ${isOver ? 'bg-red-50 ring-2 ring-red-400 ring-dashed' : 'bg-[#f8f9fa]'}`}>
      {isEmpty && !isOver ? (
        <div className="text-sm text-[#ced4da] py-4 text-center">모든 테넌트가 할당되었습니다.</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">{children}</div>
      )}
    </div>
  );
}

export default function NodeDetail() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [selectedTenant, setSelectedTenant] = useState<TenantAllocItem | null>(null);
  const [sidebarMode, setSidebarMode] = useState<'node' | 'cluster' | null>(null);
  const [dragInfo, setDragInfo] = useState<{ type: string; tenantName: string } | null>(null);

  const { data: node, isFetching: isNodeFetching } = useGetNode({ params: { nodeId } });
  const { data: tenantAllocs, isFetching: isAllocsFetching } = useGetTenantAllocs({
    params: { nodeId },
    queryOptions: { enabled: !!nodeId },
  });
  const { data: allTenants } = useGetTenants();
  const { data: tenantDetail, isFetching: isDetailFetching } = useGetTenantAllocDetail({
    params: { nodeId, tenantId: selectedTenant?.tenantId },
    queryOptions: {
      enabled: !!selectedTenant && sidebarMode === null,
      placeholderData: (prev: any) => prev, // 이전 데이터 유지하여 깜빡임 방지
    },
  });
  const { data: clusterConfig } = useGetClusterConfig({
    params: { nodeId },
    queryOptions: { enabled: sidebarMode === 'cluster' && !!node?.clusterGrpId },
  });

  const isFetching = isNodeFetching || isAllocsFetching;

  const unallocatedTenants = useMemo(() => {
    if (!allTenants || !tenantAllocs) return [];
    const allocatedIds = new Set(tenantAllocs.map((a) => a.tenantId));
    return allTenants.filter((t) => !allocatedIds.has(t.tenantId));
  }, [allTenants, tenantAllocs]);

  const { mutate: createTenantAlloc } = useCreateTenantAlloc({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트가 할당되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantAllocQueryKeys.getTenantAllocs({ nodeId }).queryKey });
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNodes().queryKey });
      },
    },
  });

  const { mutate: deleteTenantAlloc } = useDeleteTenantAlloc({
    mutationOptions: {
      onSuccess: () => {
        toast.success('테넌트 할당이 해제되었습니다.');
        setSelectedTenant(null);
        queryClient.invalidateQueries({ queryKey: tenantAllocQueryKeys.getTenantAllocs({ nodeId }).queryKey });
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNodes().queryKey });
      },
    },
  });

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb([{ title: '시스템' }, { title: '자원관리' }, { title: '클러스터 관리', href: '../list' }, { title: ':nodeName' }], { nodeName: node?.nodeName ?? '-' });
    return () => clearBreadcrumb();
  }, [node?.nodeName, setBreadcrumb, clearBreadcrumb]);

  const handleDeleteAlloc = (alloc: TenantAllocItem) => {
    modal.confirm.execute({
      options: { title: '할당 해제', content: `'${alloc.tenantName}' 할당을 해제하시겠습니까?` },
      onOk: () => deleteTenantAlloc({ nodeId, tenantId: alloc.tenantId }),
    });
  };

  // DnD
  const handleDragStart = (event: DragStartEvent) => {
    const { type, tenantName } = event.active.data.current as { type: string; tenantName: string };
    setDragInfo({ type, tenantName });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragInfo(null);
    const { active, over } = event;
    if (!over) return;

    const sourceType = active.data.current?.type as string;
    const targetAction = over.data.current?.action as string;
    const tenantId = active.data.current?.tenantId as number;
    const tenantName = active.data.current?.tenantName as string;

    if (sourceType === 'unallocated' && targetAction === 'allocate') {
      modal.confirm.execute({
        options: {
          title: '테넌트 할당',
          content: `'${tenantName}' 테넌트를 할당합니다.\n상세 설정 후 할당하시겠습니까?`,
          okText: '상세 설정',
          cancelText: '바로 할당',
        },
        onOk: () => {
          // 상세 설정 페이지로 이동
          navigate(`alloc/new?tenantId=${tenantId}`);
        },
        onCancel: () => {
          // 기본값으로 바로 할당
          createTenantAlloc({
            nodeId: Number(nodeId),
            data: {
              tenantId,
              validExtDigits: 7,
              acwDuration: 0,
              inviteMd5Auth: 0,
              unregInviteNoresp: 1,
              deviceUaCheck: 0,
              regFailChkCnt: 0,
              regFailBlockMin: 0,
              callChkParam1: 0,
              callChkParam2: 0,
              callChkParam3: 1,
              callChkParam4: 0,
            },
          });
        },
      });
    }

    if (sourceType === 'allocated' && targetAction === 'deallocate') {
      modal.confirm.execute({
        options: { title: '할당 해제', content: `'${tenantName}' 할당을 해제하시겠습니까?` },
        onOk: () => deleteTenantAlloc({ nodeId, tenantId }),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <FallbackSpinner />
        </div>
      ) : (
        <DndContext collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* 클러스터 > 노드 계층 바 */}
          <div className="bg-white bt-shadow px-7 py-3 flex items-center">
            <div className="flex items-center gap-1 text-sm">
              <span
                className={`cursor-pointer px-3 py-1.5 rounded-md border transition-colors ${
                  sidebarMode === 'cluster'
                    ? 'border-[var(--color-bt-primary)] bg-blue-50 text-[var(--color-bt-primary)]'
                    : 'border-gray-200 hover:border-[var(--color-bt-primary)] hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSidebarMode('cluster');
                  setSelectedTenant(null);
                }}
              >
                <span className="text-gray-400 text-xs mr-1">클러스터</span>
                <span className="font-semibold">{node?.clusterGrpName ?? '-'}</span>
              </span>

              <span className="text-gray-300 mx-1">&gt;</span>

              <span
                className={`cursor-pointer px-3 py-1.5 rounded-md border transition-colors ${
                  sidebarMode === 'node'
                    ? 'border-[var(--color-bt-primary)] bg-blue-50 text-[var(--color-bt-primary)]'
                    : 'border-gray-200 hover:border-[var(--color-bt-primary)] hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSidebarMode('node');
                  setSelectedTenant(null);
                }}
              >
                <span className="text-gray-400 text-xs mr-1">노드</span>
                <span className="font-semibold">{node?.nodeName}</span>
              </span>
            </div>
          </div>

          {/* 할당된 테넌트 */}
          <div className="flex flex-1 min-h-0 gap-4">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
              <div className="bg-white bt-shadow rounded-lg">
                <div className="px-5 pt-4 pb-2">
                  <span className="text-sm font-semibold text-gray-600">할당된 테넌트</span>
                  <span className="text-sm text-gray-400 ml-1">({tenantAllocs?.length ?? 0})</span>
                </div>
                <AllocatedDropZone isEmpty={!tenantAllocs || tenantAllocs.length === 0}>
                  {tenantAllocs?.map((alloc) => (
                    <AllocatedTenantCard
                      key={alloc.tenantId}
                      alloc={alloc}
                      isSelected={selectedTenant?.tenantId === alloc.tenantId}
                      onClick={() => {
                        setSelectedTenant(alloc);
                        setSidebarMode(null);
                      }}
                    />
                  ))}
                </AllocatedDropZone>
              </div>

              {/* 미할당 테넌트 */}
              <div className="bg-white bt-shadow rounded-lg">
                <div className="px-5 pt-4 pb-2">
                  <span className="text-sm font-semibold text-gray-500">미할당 테넌트</span>
                  <span className="text-sm text-gray-400 ml-1">({unallocatedTenants.length})</span>
                </div>
                <UnallocatedDropZone isEmpty={unallocatedTenants.length === 0}>
                  {unallocatedTenants.map((tenant) => (
                    <UnallocatedTenantCard key={tenant.tenantId} tenant={tenant} />
                  ))}
                </UnallocatedDropZone>
              </div>
            </div>

            {/* 우측 사이드바 — 노드 상세 */}
            {sidebarMode === 'node' && node && (
              <div className="w-[380px] min-w-[380px] h-full min-h-0 bg-white bt-shadow flex flex-col">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 shrink-0">
                  <span className="text-base font-semibold text-gray-800">{node.nodeName}</span>
                  <button onClick={() => setSidebarMode(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                  <div className="space-y-3 text-sm">
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-1">기본정보</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">노드 ID</span>
                      <span>{node.nodeId}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">약칭</span>
                      <span>{node.nodeAlias}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">지역번호</span>
                      <span>{node.regionNum ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">클러스터</span>
                      <span>{node.clusterGrpName ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">주요 업무</span>
                      <span>{node.mainJob ?? '-'}</span>
                    </div>

                    <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">중개 NAT</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">RTP 중개</span>
                      <span>{NAT_OPTION_LABELS[node.natOption ?? 0]}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">확장 NAT</span>
                      <span>{node.enatOption ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">외부 IP</span>
                      <span className="break-all">{node.externalIpAddr ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">MS 그룹</span>
                      <span>{node.msGroupName ?? (node.msGroupId ? `ID:${node.msGroupId}` : '-')}</span>
                    </div>

                    <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">MCS 설정</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">백업 MCS 노드</span>
                      <span>{node.mcsBkNodeId ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">A Side IP</span>
                      <span>{node.mcsBkGsaIpv4Address ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">B Side IP</span>
                      <span>{node.mcsBkGsbIpv4Address ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">분배방식</span>
                      <span>{MCS_ROUTE_METHOD_LABELS[node.mcsBkRouteMethod ?? 0] ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">비율</span>
                      <span>{node.mcsBkRouteRatio ?? 0}%</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">IC 우회</span>
                      <span>{node.mcsIcdownUseYn === 1 ? '사용' : '미사용'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">IE 우회</span>
                      <span>{node.mcsIedownUseYn === 1 ? '사용' : '미사용'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-gray-200 shrink-0">
                  <Button onClick={() => navigate('settings')} className="flex-1">
                    노드 설정
                  </Button>
                </div>
              </div>
            )}

            {/* 우측 사이드바 — 클러스터 상세 */}
            {sidebarMode === 'cluster' && node?.clusterGrpId && (
              <div className="w-[380px] min-w-[380px] h-full min-h-0 bg-white bt-shadow flex flex-col">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 shrink-0">
                  <span className="text-base font-semibold text-gray-800">{node.clusterGrpName}</span>
                  <button onClick={() => setSidebarMode(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                  <div className="space-y-3 text-sm">
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-1">IE 설정</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">서비스 IP</span>
                      <span>{clusterConfig?.ieSvcIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">A Side IP</span>
                      <span>{clusterConfig?.ieAsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">B Side IP</span>
                      <span>{clusterConfig?.ieBsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">강제 DR</span>
                      <span>{clusterConfig?.ieForceDr === 1 ? '활성' : '비활성'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">수동 DR</span>
                      <span>{clusterConfig?.iePassiveDr === 1 ? '활성' : '비활성'}</span>
                    </div>

                    <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">IC 설정</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">A Side IP</span>
                      <span>{clusterConfig?.icAsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">B Side IP</span>
                      <span>{clusterConfig?.icBsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">강제 DR</span>
                      <span>{clusterConfig?.icForceDr === 1 ? '활성' : '비활성'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">수동 DR</span>
                      <span>{clusterConfig?.icPassiveDr === 1 ? '활성' : '비활성'}</span>
                    </div>

                    <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">GS 서버</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Primary A</span>
                      <span>{clusterConfig?.gsPrimaryAsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Primary B</span>
                      <span>{clusterConfig?.gsPrimaryBsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Second A</span>
                      <span>{clusterConfig?.gsSecondAsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Second B</span>
                      <span>{clusterConfig?.gsSecondBsideIp ?? '-'}</span>
                    </div>

                    <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">DI 서버</div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Primary A</span>
                      <span>{clusterConfig?.diPrimaryAsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Primary B</span>
                      <span>{clusterConfig?.diPrimaryBsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Second A</span>
                      <span>{clusterConfig?.diSecondAsideIp ?? '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-[130px] text-gray-500">Second B</span>
                      <span>{clusterConfig?.diSecondBsideIp ?? '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-gray-200 shrink-0">
                  <Button onClick={() => navigate('cluster-config')} className="flex-1">
                    클러스터 설정
                  </Button>
                </div>
              </div>
            )}

            {/* 우측 사이드바 — 테넌트 상세 */}
            {selectedTenant && sidebarMode === null && (
              <div className="w-[380px] min-w-[380px] h-full min-h-0 bg-white bt-shadow flex flex-col">
                {isDetailFetching && !tenantDetail ? (
                  <div className="flex items-center justify-center flex-1">
                    <FallbackSpinner />
                  </div>
                ) : (
                  <>
                    {/* 타이틀 고정 */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 shrink-0">
                      <span className="text-base font-semibold text-gray-800">{tenantDetail?.tenantName ?? selectedTenant.tenantName}</span>
                      <button onClick={() => setSelectedTenant(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* 스크롤 영역 */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                      <div className="space-y-3 text-sm">
                        <div className="text-xs font-semibold text-gray-400 uppercase mb-1">기본정보</div>
                        <div className="flex">
                          <span className="w-[130px] text-gray-500">테넌트 ID</span>
                          <span>{selectedTenant.tenantId}</span>
                        </div>
                        <div className="flex">
                          <span className="w-[130px] text-gray-500">자동 아웃바운드</span>
                          <span>{selectedTenant.autoObYn === 1 ? '사용' : '미사용'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-[130px] text-gray-500">내선 자릿수</span>
                          <span>{selectedTenant.validExtDigits ?? '-'}</span>
                        </div>
                        <div className="flex">
                          <span className="w-[130px] text-gray-500">후처리시간</span>
                          <span>{selectedTenant.acwDuration != null ? `${selectedTenant.acwDuration}초` : '-'}</span>
                        </div>

                        {tenantDetail && (
                          <>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">내선 Prefix</span>
                              <span>{tenantDetail.extPrefix ?? '-'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">과금 DNIS</span>
                              <span>{tenantDetail.redirectTelno ?? '-'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">업무시간 옵션</span>
                              <span>{WORKTIME_OPT_LABELS[tenantDetail.worktimeOpt ?? 1] ?? '-'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">전환 DNIS</span>
                              <span>{tenantDetail.transNum ?? '-'}</span>
                            </div>

                            <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">라이선스</div>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { kind: 10, amt: tenantDetail.lic10 },
                                { kind: 11, amt: tenantDetail.lic11 },
                                { kind: 12, amt: tenantDetail.lic12 },
                                { kind: 15, amt: tenantDetail.lic15 },
                                { kind: 16, amt: tenantDetail.lic16 },
                                { kind: 20, amt: tenantDetail.lic20 },
                                { kind: 40, amt: tenantDetail.lic40 },
                                { kind: 50, amt: tenantDetail.lic50 },
                              ]
                                .filter((l) => (l.amt ?? 0) > 0)
                                .map((l) => (
                                  <Tag key={l.kind} className="!m-0 !text-xs">
                                    {LICENSE_KIND_LABELS[l.kind] ?? `L${l.kind}`}: {l.amt}
                                  </Tag>
                                ))}
                              {[10, 11, 12, 15, 16, 20, 40, 50].every((k) => !(tenantDetail as any)[`lic${k}`]) && <span className="text-gray-300">할당 없음</span>}
                            </div>

                            <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">보안설정</div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">SIP MD5 인증</span>
                              <span>{tenantDetail.inviteMd5Auth === 1 ? '사용' : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">미등록 무응답</span>
                              <span>{tenantDetail.unregInviteNoresp === 1 ? '사용' : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">단말 UA 체크</span>
                              <span>{tenantDetail.deviceUaCheck === 1 ? '사용' : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">등록실패 횟수</span>
                              <span>{tenantDetail.regFailChkCnt ?? 0}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">등록실패 차단(분)</span>
                              <span>{tenantDetail.regFailBlockMin ?? 0}</span>
                            </div>

                            <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-1">감시설정</div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">미등록 장비</span>
                              <span>{tenantDetail.unregCheck === 1 ? `${tenantDetail.unregSec}초/${tenantDetail.unregNum}건` : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">강제 해제</span>
                              <span>{tenantDetail.forceUnregCheck === 1 ? `${tenantDetail.forceUnregSec}초/${tenantDetail.forceUnregNum}건` : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">장기 대기</span>
                              <span>{tenantDetail.longWaitCheck === 1 ? `${tenantDetail.longWaitSec}초` : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">CTI 미모니터링</span>
                              <span>{tenantDetail.ctiUnmoniCheck === 1 ? `${tenantDetail.ctiUnmoniSec}초/${tenantDetail.ctiUnmoniNum}건` : '미사용'}</span>
                            </div>
                            <div className="flex">
                              <span className="w-[130px] text-gray-500">CTI 로그아웃</span>
                              <span>{tenantDetail.ctiLogoutCheck === 1 ? `${tenantDetail.ctiLogoutSec}초/${tenantDetail.ctiLogoutNum}건` : '미사용'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {/* 하단 버튼 고정 */}
                    <div className="flex gap-2 px-5 py-4 border-t border-gray-200 shrink-0">
                      <Button onClick={() => navigate(`alloc/${selectedTenant.tenantId}`)} className="flex-1">
                        수정
                      </Button>
                      <Button color="red" variant="solid" onClick={() => handleDeleteAlloc(selectedTenant)} className="flex-1">
                        할당 해제
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DragOverlay>
            {dragInfo ? (
              <div
                className={`rounded-lg px-4 py-2 shadow-xl opacity-90 w-[240px] border-2 ${
                  dragInfo.type === 'unallocated' ? 'bg-blue-50 border-[var(--color-bt-primary)]' : 'bg-red-50 border-red-400'
                }`}
              >
                <span className="font-semibold text-sm">
                  {dragInfo.type === 'unallocated' ? '할당: ' : '해제: '}
                  {dragInfo.tenantName}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
