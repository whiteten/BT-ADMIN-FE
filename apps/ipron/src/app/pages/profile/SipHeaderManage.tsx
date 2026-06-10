/**
 * SIP 헤더 관리 페이지
 * 상단: 카드 슬라이더 (헤더 그룹 목록) + 더보기 메뉴 (수정/삭제) + [그룹 추가]
 * 하단: ag-Grid 릴레이 목록 + 체크박스로 그룹 배정 관리
 *   - 체크/언체크 → updateGroupMembers API 호출 (replace 패턴)
 *   - headerType=1인 사용자 추가 릴레이만 삭제 가능
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty } from 'antd';
import { ChevronLeft, ChevronRight, Edit3, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import SipHeaderGroupDrawer, { type SipHeaderGroupDrawerRef } from '../../features/sip-profile/components/SipHeaderGroupDrawer';
import SipHeaderRelayDrawer, { type SipHeaderRelayDrawerRef } from '../../features/sip-profile/components/SipHeaderRelayDrawer';
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
  useUpdateSipHeaderRelay,
} from '../../features/sip-profile/hooks/useSipProfileQueries';
import type { SipHeaderGroup, SipHeaderRelay } from '../../features/sip-profile/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: '번호자원관리', path: '/ipron/numbering' },
  { title: '프로파일', path: '/ipron/profile' },
  { title: 'SIP 프로파일', path: '/ipron/profile/sip-profile' },
  { title: '헤더 관리' },
];

export default function SipHeaderManage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [cardCollapsed, setCardCollapsed] = useState(true);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const groupDrawerRef = useRef<SipHeaderGroupDrawerRef>(null);
  const relayDrawerRef = useRef<SipHeaderRelayDrawerRef>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

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

  const { mutate: updateRelay, isPending: isUpdatingRelay } = useUpdateSipHeaderRelay({
    mutationOptions: {
      onSuccess: () => {
        toast.success('헤더 릴레이가 수정되었습니다.');
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

  const handleCardSelect = (group: SipHeaderGroup) => {
    setSelectedGroupId(group.sipHeaderGrpId);
  };

  const handleRelayCreate = () => {
    relayDrawerRef.current?.open();
  };

  const handleRelayEdit = (relay: SipHeaderRelay) => {
    relayDrawerRef.current?.open(relay);
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
      maxWidth: 90,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams<SipHeaderRelay>) => {
        const { data } = params;
        if (!data) return null;
        if (data.headerType === 0) {
          // 기초 릴레이: 삭제 불가 안내 (비활성 버튼 + 툴팁)
          return (
            <button type="button" disabled title="기초 릴레이는 삭제할 수 없습니다" className="cursor-not-allowed opacity-30" onClick={(e) => e.stopPropagation()}>
              <IconTrash className="size-5 text-gray-400" />
            </button>
          );
        }
        return (
          <button
            type="button"
            title="릴레이 삭제"
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
      {/* ===== 헤더 박스 (그룹 타이틀 + 추가 버튼) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        <div className="px-5 h-[56px] flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">헤더 그룹 ({headerGroups.length}건)</span>
          <Button icon={<Plus className="size-3.5" />} onClick={handleGroupCreate}>
            등록
          </Button>
        </div>
      </div>

      {/* ===== 카드 슬라이더 박스 (Header Groups) ===== */}
      <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
        {/* 접기/펼치기 헤더 */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100 transition-colors"
          onClick={() => setCardCollapsed((c) => !c)}
        >
          <span>헤더 그룹 카드</span>
          <span>{cardCollapsed ? '펼치기' : '접기'}</span>
        </button>
        {!cardCollapsed && (
          <div className="flex items-center px-4 py-3">
            {headerGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-4 text-gray-400 gap-3">
                <Empty description={false} />
                <span className="text-sm">등록된 그룹이 없습니다</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {headerGroups.map((group) => {
                    const isCardSelected = selectedGroupId === group.sipHeaderGrpId;
                    return (
                      <div
                        key={group.sipHeaderGrpId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] flex-shrink-0 ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={() => handleCardSelect(group)}
                        onDoubleClick={() => handleGroupEdit(group)}
                      >
                        {/* Card header: 그룹명 + 더보기 */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{group.sipHeaderGrpName}</span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Dropdown menu={{ items: getGroupMenuItems(group) }} trigger={['click']} placement="bottomRight">
                              <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                                <MoreVertical className="size-4 text-gray-400" />
                              </button>
                            </Dropdown>
                          </div>
                        </div>

                        {/* Card info */}
                        <div className="text-xs text-gray-500">
                          <div>할당 릴레이: {group.memberCount ?? 0}건</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Bottom: Relay Grid ===== */}
      <div className="bg-white bt-shadow flex-1 flex flex-col min-h-0 overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-gray-800">
                {selectedGroup.sipHeaderGrpName} 헤더 릴레이 ({headerRelays.length}건)
              </span>
              <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleRelayCreate}>
                등록
              </Button>
            </div>

            <div className="flex-1">
              <AgGridReact<SipHeaderRelay>
                rowData={headerRelays}
                columnDefs={columnDefs}
                gridOptions={{
                  ...gridOptions,
                  statusBar: undefined,
                  pagination: false,
                  sideBar: false,
                }}
                loading={isRelaysLoading}
                getRowId={(params) => String(params.data.sipHeaderId)}
                defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                onRowDoubleClicked={(e) => {
                  if (!e.data) return;
                  if (e.data.headerType === 1) {
                    handleRelayEdit(e.data);
                  } else {
                    toast.info('기초 릴레이는 수정할 수 없습니다');
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
            <Empty description={false} />
            <span className="text-sm">헤더 그룹을 선택하세요</span>
          </div>
        )}
      </div>

      {/* ===== Drawers ===== */}
      <SipHeaderGroupDrawer
        ref={groupDrawerRef}
        onCreate={(data) => createGroup(data)}
        onUpdate={(id, data) => updateGroup({ id, data })}
        isLoading={isCreatingGroup || isUpdatingGroup}
      />

      <SipHeaderRelayDrawer
        ref={relayDrawerRef}
        onCreate={(data) => createRelay(data)}
        onUpdate={(id, data) => updateRelay({ id, data })}
        isLoading={isCreatingRelay || isUpdatingRelay}
      />
    </div>
  );
}
