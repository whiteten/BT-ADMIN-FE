/**
 * IVR DN 그룹 관리 페이지 (IPR20S6012).
 *
 * 상단: 노드 탭 바 (별도 박스) + 카드 슬라이더 (별도 박스, XL 220×190)
 * 하단: Sub DN 그리드 (DN 그룹이 Outbound+ACS인 경우에만 활성)
 *
 * DN 그룹 카드 정보:
 *   - 좌상단: 시스템명 칩
 *   - 헤더: DN 그룹명 + 메뉴
 *   - 정보 5줄: 노드, 국선(EP), 시작DN x DN개수, 시작Ch x 채널수, OUTCH (있는 경우)
 *   - 하단 태그: Direction, REG-방식, ACS (해당 시)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Dropdown, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, MoreVertical, Network, Phone, Plug, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IvrDnGroupSheet, { type IvrDnGroupSheetRef } from '../../features/ivr-dn-group/components/IvrDnGroupSheet';
import IvrSubDnGroupSheet, { type IvrSubDnGroupSheetRef } from '../../features/ivr-dn-group/components/IvrSubDnGroupSheet';
import {
  ivrDnGroupQueryKeys,
  useDeleteDnGroup,
  useDeleteSubDnGroup,
  useGetDnGroups,
  useGetNodes,
  useGetSubDnGroups,
  useGetSubDnQuota,
} from '../../features/ivr-dn-group/hooks/useIvrDnGroupQueries';
import { type IrDnGroup, type IrSubDnGroup, SUB_DN_KIND_LABELS, getDnGroupTagList, isSubDnEligible } from '../../features/ivr-dn-group/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: 'ForCus', path: '/ivr' }, { title: '회선관리' }, { title: 'IVR DN 그룹관리' }];

export default function IvrDnGroupList() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initDnGroupId = searchParams.get('dnGroupId') ? Number(searchParams.get('dnGroupId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedDnGroupId, setSelectedDnGroupId] = useState<number | null>(initDnGroupId);
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ───────────────────────────────────────────────────────────────
  const dnGroupSheetRef = useRef<IvrDnGroupSheetRef>(null);
  const subDnDialogRef = useRef<IvrSubDnGroupSheetRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────
  const { data: dnGroups = [] } = useGetDnGroups();
  const { data: nodes = [] } = useGetNodes();

  const { data: subDnGroups = [], isLoading: isSubLoading } = useGetSubDnGroups({
    params: selectedDnGroupId ? { id: selectedDnGroupId } : undefined,
    queryOptions: { enabled: !!selectedDnGroupId },
  });

  // 채널 사용량 (그리드 footer 표기용) — 선택된 DN 그룹에 대해 항상 조회
  const { data: quota } = useGetSubDnQuota({
    params: selectedDnGroupId ? { id: selectedDnGroupId } : undefined,
    queryOptions: { enabled: !!selectedDnGroupId },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────
  const invalidateDnGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getDnGroups._def });
    queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getSystemUsage._def });
  }, [queryClient]);

  const invalidateSubDnGroups = useCallback(() => {
    if (selectedDnGroupId) {
      queryClient.invalidateQueries({
        queryKey: ivrDnGroupQueryKeys.getSubDnGroups({ id: selectedDnGroupId }).queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ivrDnGroupQueryKeys.getSubDnQuota._def });
    }
  }, [queryClient, selectedDnGroupId]);

  // ─── Mutations ──────────────────────────────────────────────────────────
  const { mutate: deleteDnGroup } = useDeleteDnGroup({
    mutationOptions: {
      onSuccess: (_data, variables) => {
        toast.success('DN 그룹이 삭제되었습니다.');
        const deletedId = (variables as { id: number }).id;
        if (selectedDnGroupId === deletedId) setSelectedDnGroupId(null);
        queryClient.setQueriesData<IrDnGroup[]>({ queryKey: ivrDnGroupQueryKeys.getDnGroups._def }, (old) => (old ? old.filter((g) => g.dnGroupId !== deletedId) : old));
        invalidateDnGroups();
      },
    },
  });

  const { mutate: deleteSubDnGroup } = useDeleteSubDnGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('Sub DN이 삭제되었습니다.');
        invalidateSubDnGroups();
        invalidateDnGroups();
      },
    },
  });

  // ─── Derived data ───────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;
  const searchFilteredDnGroups = useMemo(() => {
    if (!isSearching) return dnGroups;
    const kw = searchText.trim().toLowerCase();
    return dnGroups.filter((g) => g.dnGroupName?.toLowerCase().includes(kw) || g.endptName?.toLowerCase().includes(kw) || g.startDn?.toLowerCase().includes(kw));
  }, [dnGroups, isSearching, searchText]);

  const filteredDnGroups = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredDnGroups : searchFilteredDnGroups.filter((g) => g.nodeId === selectedNodeId)),
    [searchFilteredDnGroups, selectedNodeId, isSearching],
  );

  // Auto-select 첫 카드
  useEffect(() => {
    if (!selectedDnGroupId && filteredDnGroups.length > 0) {
      setSelectedDnGroupId(filteredDnGroups[0].dnGroupId);
    }
  }, [filteredDnGroups, selectedDnGroupId]);

  const selectedDnGroup = useMemo(() => {
    if (!selectedDnGroupId) return null;
    return dnGroups.find((g) => g.dnGroupId === selectedDnGroupId) ?? null;
  }, [dnGroups, selectedDnGroupId]);

  const subDnAllowed = isSubDnEligible(selectedDnGroup);

  // DN 그룹 → endpoint 후보 목록 (Sheet에 전달)
  const endpointOptions = useMemo(() => {
    const seen = new Set<number>();
    const list: { endptId: number; endptName: string; nodeId: number }[] = [];
    dnGroups.forEach((g) => {
      if (!seen.has(g.endptId)) {
        seen.add(g.endptId);
        list.push({ endptId: g.endptId, endptName: g.endptName, nodeId: g.nodeId });
      }
    });
    return list;
  }, [dnGroups]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    setSelectedDnGroupId(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
    }
  };

  const handleCardSelect = (g: IrDnGroup) => {
    setSelectedDnGroupId(g.dnGroupId);
  };

  const handleCreate = useCallback(() => {
    dnGroupSheetRef.current?.open(undefined, selectedNodeId ?? nodes[0]?.nodeId);
  }, [nodes, selectedNodeId]);

  const handleEdit = useCallback((g: IrDnGroup) => {
    dnGroupSheetRef.current?.open(g);
  }, []);

  const handleDelete = useCallback(
    (g: IrDnGroup) => {
      modal.confirm.execute({
        onOk: () => deleteDnGroup({ id: g.dnGroupId }),
        options: {
          title: 'DN 그룹 삭제',
          content: `"${g.dnGroupName}" DN 그룹을 삭제하시겠습니까?\n하위 Sub DN도 함께 삭제됩니다.`,
        },
      });
    },
    [modal, deleteDnGroup],
  );

  const handleSubDnDelete = useCallback(
    (sub: IrSubDnGroup) => {
      if (!selectedDnGroupId) return;
      modal.confirm.execute({
        onOk: () => deleteSubDnGroup({ subId: sub.subDnGroupId }),
        options: {
          title: 'Sub DN 삭제',
          content: `"${sub.subDnGroupName}" Sub DN을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteSubDnGroup, selectedDnGroupId],
  );

  const handleDnGroupSheetSuccess = useCallback(() => {
    invalidateDnGroups();
  }, [invalidateDnGroups]);

  const handleSubDnDialogSuccess = useCallback(() => {
    invalidateSubDnGroups();
    invalidateDnGroups();
  }, [invalidateSubDnGroups, invalidateDnGroups]);

  const getCardMenuItems = (g: IrDnGroup) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEdit(g),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDelete(g),
    },
  ];

  // ─── ag-Grid: Sub DN columns ──────────────────────────────────────────
  const subDnColumnDefs: ColDef<IrSubDnGroup>[] = useMemo(
    () => [
      {
        headerName: 'Sub DN 명',
        field: 'subDnGroupName',
        flex: 2,
        minWidth: 140,
      },
      {
        headerName: '타입',
        field: 'subDnGroupKind',
        flex: 1,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams<IrSubDnGroup>) => {
          if (!params.data) return null;
          const label = SUB_DN_KIND_LABELS[params.data.subDnGroupKind] ?? '-';
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#e6f4ff', color: '#1677ff' }}>
              {label}
            </span>
          );
        },
      },
      {
        headerName: '채널 수',
        field: 'chnlCnt',
        flex: 1,
        minWidth: 90,
      },
      {
        headerName: '설명',
        field: 'subDnGroupDesc',
        flex: 3,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<IrSubDnGroup>) => params.data?.subDnGroupDesc ?? '-',
      },
      {
        headerName: '작업일시',
        field: 'workTime',
        flex: 2,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<IrSubDnGroup>) => params.data?.workTime ?? '-',
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IrSubDnGroup>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSubDnDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleSubDnDelete],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 탭 바 (별도 박스) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            <div
              ref={tabScrollRef}
              className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                type="button"
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                  selectedNodeId === null && !isSearching
                    ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]'
                    : 'text-gray-500 border-b-transparent hover:text-gray-700'
                }`}
                onClick={() => {
                  setSelectedNodeId(null);
                  setSearchText('');
                  setSelectedDnGroupId(null);
                }}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredDnGroups.length})</span>
              </button>

              {nodes.map((node) => {
                const nodeGroups = searchFilteredDnGroups.filter((g) => g.nodeId === node.nodeId);
                const isActive = selectedNodeId === node.nodeId;
                return (
                  <button
                    key={node.nodeId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleNodeSelect(node.nodeId);
                      (e.currentTarget as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        inline: 'center',
                        block: 'nearest',
                      });
                    }}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeGroups.length})</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="DN 그룹/국선/시작DN 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 (별도 박스, XL 220×190) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 py-3 h-[220px]">
            {filteredDnGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 DN 그룹이 없습니다'}</span>
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
                  {filteredDnGroups.map((g) => {
                    const isCardSelected = selectedDnGroupId === g.dnGroupId;
                    const tags = getDnGroupTagList(g);
                    return (
                      <div
                        key={g.dnGroupId}
                        id={`dn-group-card-${g.dnGroupId}`}
                        className={`bg-white border rounded-lg p-4 cursor-pointer transition-all w-[220px] h-[190px] flex-shrink-0 flex flex-col ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(g);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                        }}
                        onDoubleClick={() => handleEdit(g)}
                      >
                        {/* Card header */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-blue-50 text-[#405189] border border-blue-200 flex-shrink-0 max-w-[110px] truncate"
                              title={g.systemName}
                            >
                              {g.systemName}
                            </span>
                            {g.outchUsetype === '5' && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 flex-shrink-0"
                                title="자동 아웃바운드(ACS) — Sub DN 등록 가능"
                              >
                                ACS
                              </span>
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                            <Dropdown menu={{ items: getCardMenuItems(g) }} trigger={['click']} placement="bottomRight">
                              <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                                <MoreVertical className="size-3.5 text-gray-400" />
                              </button>
                            </Dropdown>
                          </div>
                        </div>

                        <div className="mb-1">
                          <span className="text-sm font-semibold text-gray-800 truncate block">{g.dnGroupName}</span>
                        </div>

                        {/* Card info */}
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{g.nodeName ?? `Node ${g.nodeId}`}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Plug className="size-3 text-gray-400" />
                            <span className="truncate">{g.endptName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="size-3 text-gray-400" />
                            <span className="truncate">
                              DN: {g.startDn} ×{g.dnCount}
                            </span>
                          </div>
                          <div className="truncate">
                            CH: {g.startChannel} ×{g.channelCount}
                          </div>
                        </div>

                        {/* 하단 상태 태그 */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
                            {tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.label}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                style={{ color: tag.color, backgroundColor: tag.bgColor, borderColor: tag.borderColor }}
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
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
        </div>

        {/* ===== 하단: Sub DN 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedDnGroup ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Bottom header: selected DN group */}
              <div className="px-5 py-2 flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">{selectedDnGroup.dnGroupName}</span>
                {quota && (
                  <span className="text-[12px] text-gray-500">
                    채널 사용 <b>{quota.usedChannelCount}</b>/{quota.dnGroupChannelCount} (잔여 <b>{quota.availableChannelCount}</b>)
                  </span>
                )}
              </div>

              {/* Tab bar + 추가 버튼 */}
              <div className="flex items-center border-b-2 border-gray-200 flex-shrink-0 pr-3">
                <button
                  type="button"
                  className="px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]"
                >
                  Sub DN ({subDnGroups.length})
                </button>
                <div className="ml-auto">
                  <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => subDnDialogRef.current?.open()} disabled={!subDnAllowed}>
                    Sub DN 추가
                  </Button>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {subDnAllowed ? (
                  <div className="flex-1">
                    <AgGridReact<IrSubDnGroup>
                      rowData={subDnGroups}
                      columnDefs={subDnColumnDefs}
                      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                      loading={isSubLoading}
                      getRowId={(params) => String(params.data.subDnGroupId)}
                      defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                      onRowDoubleClicked={(e) => {
                        if (e.data) subDnDialogRef.current?.open(e.data);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3 p-6">
                    <Empty description={false} />
                    <span className="text-sm text-center">Outbound + ACS DN 그룹만 Sub DN을 등록할 수 있습니다</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
              <Empty description={false} />
              <span className="text-sm">DN 그룹을 선택하면 Sub DN을 확인할 수 있습니다</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers / Dialogs ===== */}
      <IvrDnGroupSheet ref={dnGroupSheetRef} selectedNodeId={selectedNodeId} nodes={nodes} endpoints={endpointOptions} onSuccess={handleDnGroupSheetSuccess} />
      {selectedDnGroupId && <IvrSubDnGroupSheet ref={subDnDialogRef} dnGroupId={selectedDnGroupId} onSuccess={handleSubDnDialogSuccess} />}
    </div>
  );
}
