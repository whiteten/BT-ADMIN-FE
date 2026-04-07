/**
 * SIP 헤더 관리 페이지
 * 좌측(280px): 헤더 그룹 목록 + 더보기 메뉴 (수정/삭제) + [그룹 추가]
 * 우측: ag-Grid 릴레이 목록 + 체크박스로 그룹 배정 관리
 *   - 체크/언체크 → updateGroupMembers API 호출 (replace 패턴)
 *   - headerType=1인 사용자 추가 릴레이만 삭제 가능
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty } from 'antd';
import { Edit3, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import SipHeaderGroupDrawer, { type SipHeaderGroupDrawerRef } from '../components/SipHeaderGroupDrawer';
import SipHeaderRelayDrawer, { type SipHeaderRelayDrawerRef } from '../components/SipHeaderRelayDrawer';
import {
  sipProfileQueryKeys,
  useCreateSipHeaderGroup,
  useCreateSipHeaderRelay,
  useDeleteSipHeaderGroup,
  useDeleteSipHeaderRelay,
  useGetSipHeaderGroups,
  useGetSipHeaderRelays,
  useUpdateSipGroupMembers,
  useUpdateSipHeaderGroup,
} from '../hooks/useSipProfileQueries';
import type { SipHeaderGroup, SipHeaderRelay } from '../types/sipProfile.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '프로파일 관리', path: '/ipron/profile/sip-profile' },
  { title: 'SIP 프로파일', path: '/ipron/profile/sip-profile' },
  { title: '헤더 관리' },
];

export default function SipHeaderManagePage() {
  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const groupDrawerRef = useRef<SipHeaderGroupDrawerRef>(null);
  const relayDrawerRef = useRef<SipHeaderRelayDrawerRef>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: headerGroups = [] } = useGetSipHeaderGroups();
  const { data: headerRelays = [], isLoading: isRelaysLoading } = useGetSipHeaderRelays({
    params: selectedGroupId ? { groupId: selectedGroupId } : undefined,
    queryOptions: {
      enabled: !!selectedGroupId,
    },
  });

  // ─── Auto-select first group ──────────────────────────────────────────────
  useMemo(() => {
    if (headerGroups.length > 0 && selectedGroupId === null) {
      setSelectedGroupId(headerGroups[0].sipHeaderGrpId);
    }
  }, [headerGroups, selectedGroupId]);

  // ─── Invalidate helpers ─────────────────────────────────────────────────
  const invalidateGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: sipProfileQueryKeys.getHeaderGroups.queryKey });
  }, [queryClient]);

  const invalidateRelays = useCallback(() => {
    if (selectedGroupId) {
      queryClient.invalidateQueries({
        queryKey: sipProfileQueryKeys.getHeaderRelays({ groupId: selectedGroupId }).queryKey,
      });
    }
  }, [queryClient, selectedGroupId]);

  const invalidateAll = useCallback(() => {
    invalidateGroups();
    invalidateRelays();
  }, [invalidateGroups, invalidateRelays]);

  // ─── Group Mutations ──────────────────────────────────────────────────────
  const { mutate: createGroup, isPending: isCreatingGroup } = useCreateSipHeaderGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('헤더 그룹이 등록되었습니다.');
        groupDrawerRef.current?.close();
        invalidateGroups();
      },
    },
  });

  const { mutate: updateGroup, isPending: isUpdatingGroup } = useUpdateSipHeaderGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('헤더 그룹이 수정되었습니다.');
        groupDrawerRef.current?.close();
        invalidateGroups();
      },
    },
  });

  const { mutate: deleteGroup } = useDeleteSipHeaderGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('헤더 그룹이 삭제되었습니다.');
        setSelectedGroupId(null);
        invalidateGroups();
      },
    },
  });

  // ─── Relay Mutations ──────────────────────────────────────────────────────
  const { mutate: createRelay, isPending: isCreatingRelay } = useCreateSipHeaderRelay({
    mutationOptions: {
      onSuccess: () => {
        toast.success('헤더 릴레이가 등록되었습니다.');
        relayDrawerRef.current?.close();
        invalidateRelays();
      },
    },
  });

  const { mutate: deleteRelay } = useDeleteSipHeaderRelay({
    mutationOptions: {
      onSuccess: () => {
        toast.success('헤더 릴레이가 삭제되었습니다.');
        invalidateAll();
      },
    },
  });

  // ─── Group Member Mutation ────────────────────────────────────────────────
  const { mutate: updateGroupMembers } = useUpdateSipGroupMembers({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹 멤버가 업데이트되었습니다.');
        invalidateAll();
      },
    },
  });

  // ─── Selected group info ──────────────────────────────────────────────────
  const selectedGroup = useMemo(() => headerGroups.find((g) => g.sipHeaderGrpId === selectedGroupId) ?? null, [headerGroups, selectedGroupId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleGroupCreate = () => {
    groupDrawerRef.current?.open();
  };

  const handleGroupEdit = (group: SipHeaderGroup) => {
    groupDrawerRef.current?.open(group);
  };

  const handleGroupDelete = (group: SipHeaderGroup) => {
    modal.confirm.execute({
      onOk: () => deleteGroup({ id: group.sipHeaderGrpId }),
      options: {
        title: '헤더 그룹 삭제',
        content: `"${group.sipHeaderGrpName}" 그룹을 삭제하시겠습니까?`,
      },
    });
  };

  const handleRelayCreate = () => {
    relayDrawerRef.current?.open();
  };

  const handleRelayDelete = (relay: SipHeaderRelay) => {
    modal.confirm.execute({
      onOk: () => deleteRelay({ id: relay.sipHeaderId }),
      options: {
        title: '헤더 릴레이 삭제',
        content: `"${relay.sipHeader}" 릴레이를 삭제하시겠습니까?`,
      },
    });
  };

  /**
   * 체크박스 토글 시 그룹 멤버 일괄 업데이트 (replace 패턴)
   * 현재 체크된 릴레이 ID 목록을 모두 전송
   */
  const handleRelayCheckToggle = (relay: SipHeaderRelay, checked: boolean) => {
    if (!selectedGroupId) return;

    const currentAssignedIds = headerRelays.filter((r) => r.assigned).map((r) => r.sipHeaderId);

    let newIds: number[];
    if (checked) {
      newIds = [...currentAssignedIds, relay.sipHeaderId];
    } else {
      newIds = currentAssignedIds.filter((id) => id !== relay.sipHeaderId);
    }

    updateGroupMembers({
      groupId: selectedGroupId,
      data: { sipHeaderIds: newIds },
    });
  };

  // ─── Group dropdown menu ──────────────────────────────────────────────────
  const getGroupMenuItems = (group: SipHeaderGroup) => [
    {
      key: 'edit',
      label: '수정',
      icon: <Edit3 className="size-4" />,
      onClick: () => handleGroupEdit(group),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleGroupDelete(group),
    },
  ];

  // ─── ag-Grid columns ──────────────────────────────────────────────────────
  const columnDefs: ColDef<SipHeaderRelay>[] = [
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<SipHeaderRelay>) => {
        const { data } = params;
        if (!data) return null;
        return (
          <input type="checkbox" checked={data.assigned} onChange={(e) => handleRelayCheckToggle(data, e.target.checked)} className="w-4 h-4 accent-[#405189] cursor-pointer" />
        );
      },
    },
    {
      headerName: '헤더명',
      field: 'sipHeader',
      flex: 1,
      sortable: true,
    },
    {
      headerName: '유형',
      field: 'headerType',
      maxWidth: 120,
      cellRenderer: (params: ICellRendererParams<SipHeaderRelay>) => {
        const { data } = params;
        if (!data) return null;
        return data.headerType === 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200">기초</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-200">사용자</span>
        );
      },
    },
    {
      headerName: '',
      maxWidth: 60,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<SipHeaderRelay>) => {
        const { data } = params;
        if (!data || data.headerType === 0) return null; // 기초데이터 삭제 불가
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRelayDelete(data);
            }}
          >
            <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
          </button>
        );
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Split container: Left Groups + Right Relays Grid */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: Header Groups (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-700">헤더 그룹</span>
            <Button size="small" onClick={handleGroupCreate}>
              그룹 추가
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {headerGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 그룹이 없습니다</span>
              </div>
            ) : (
              headerGroups.map((group) => {
                const isSelected = selectedGroupId === group.sipHeaderGrpId;
                return (
                  <div
                    key={group.sipHeaderGrpId}
                    className={`group flex items-center gap-2 px-4 py-2 cursor-pointer text-[13px] transition-all border-l-[3px] ${
                      isSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedGroupId(group.sipHeaderGrpId)}
                  >
                    <span className="truncate flex-1">{group.sipHeaderGrpName}</span>
                    <span className="text-[11px] text-gray-400 mr-1">{group.memberCount}</span>

                    <Dropdown menu={{ items: getGroupMenuItems(group) }} trigger={['click']} placement="bottomRight">
                      <button type="button" className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="size-4 text-gray-500" />
                      </button>
                    </Dropdown>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===== Right Panel: Relay Grid ===== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white bt-shadow rounded-md border border-gray-200">
          {selectedGroup ? (
            <>
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-[15px] font-semibold text-gray-800">헤더 릴레이 목록</span>
                  <span className="text-[13px] text-gray-500">
                    그룹: <b className="text-gray-700 font-medium">{selectedGroup.sipHeaderGrpName}</b>
                  </span>
                </div>
                <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleRelayCreate}>
                  릴레이 추가
                </Button>
              </div>

              <div className="flex-1">
                <AgGridReact<SipHeaderRelay>
                  rowData={headerRelays}
                  columnDefs={columnDefs}
                  gridOptions={gridOptions}
                  loading={isRelaysLoading}
                  getRowId={(params) => String(params.data.sipHeaderId)}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 헤더 그룹을 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <SipHeaderGroupDrawer
        ref={groupDrawerRef}
        onCreate={(data) => createGroup(data)}
        onUpdate={(id, data) => updateGroup({ id, data })}
        isLoading={isCreatingGroup || isUpdatingGroup}
      />

      <SipHeaderRelayDrawer ref={relayDrawerRef} onCreate={(data) => createRelay(data)} isLoading={isCreatingRelay} />
    </div>
  );
}
