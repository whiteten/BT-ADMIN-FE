/**
 * IVR EndPoint 관리 목록 페이지 (IPRON 국선관리 패턴 그대로 클론).
 *
 * 상단: 노드 탭 바 (별도 박스) + 카드 슬라이더 (별도 박스)
 * 하단: 멤버 탭 그리드 (선택된 EndPoint 이름 표시 + 멤버 카운트 탭)
 *
 * IVR EndPoint 특화 차이:
 *  - 인증번호 탭 없음 (멤버만)
 *  - G/W 우회설정 버튼 없음
 *  - 등록/수정은 Sheet (페이지 이동 X) — Master Drawer + Member Drawer
 *  - 카드 정보: 노드/연동방식·연결방식/REG주기·할당방식 + 상태 태그
 *    멤버수는 카드에 표시 X — IPRON 패턴(하단 탭에서 members.length로 표시)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Dropdown, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import IvrEndpointMasterSheet, { type IvrEndpointMasterSheetRef } from '../../features/ivr-endpoint/components/IvrEndpointMasterSheet';
import IvrEndpointMemberSheet, { type IvrEndpointMemberSheetRef } from '../../features/ivr-endpoint/components/IvrEndpointMemberSheet';
import { ivrEndpointQueryKeys, useDeleteMaster, useDeleteMember, useGetMasters, useGetMembers, useGetNodes } from '../../features/ivr-endpoint/hooks/useIvrEndpointQueries';
import { ALLOC_METHOD_LABELS, CONN_TYPE_LABELS, type IvrEndpointMaster, type IvrEndpointMember, LINE_TYPE_LABELS, getMasterTagList } from '../../features/ivr-endpoint/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '회선관리' }, { title: '국선관리', path: '/ivr/ivr/endpoint' }];

export default function IvrEndpointList() {
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
  const initEndptId = searchParams.get('endptId') ? Number(searchParams.get('endptId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(initEndptId);
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const masterSheetRef = useRef<IvrEndpointMasterSheetRef>(null);
  const memberSheetRef = useRef<IvrEndpointMemberSheetRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: endpoints = [] } = useGetMasters();
  const { data: nodes = [] } = useGetNodes();

  const { data: members = [], isLoading: isMembersLoading } = useGetMembers({
    params: selectedEndpointId ? { id: selectedEndpointId } : undefined,
    queryOptions: { enabled: !!selectedEndpointId },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateEndpoints = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ivrEndpointQueryKeys.getMasters._def });
  }, [queryClient]);

  const invalidateMembers = useCallback(() => {
    if (selectedEndpointId) {
      queryClient.invalidateQueries({
        queryKey: ivrEndpointQueryKeys.getMembers({ id: selectedEndpointId }).queryKey,
      });
    }
  }, [queryClient, selectedEndpointId]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteEndpoint } = useDeleteMaster({
    mutationOptions: {
      onSuccess: (_data, variables) => {
        toast.success('IVR EndPoint가 삭제되었습니다.');
        const deletedId = (variables as { id: number }).id;
        if (selectedEndpointId === deletedId) setSelectedEndpointId(null);
        queryClient.setQueriesData<IvrEndpointMaster[]>({ queryKey: ivrEndpointQueryKeys.getMasters._def }, (old) => (old ? old.filter((e) => e.endptId !== deletedId) : old));
        queryClient.removeQueries({ queryKey: ivrEndpointQueryKeys.getMembers({ id: deletedId }).queryKey });
        invalidateEndpoints();
      },
    },
  });

  const { mutate: deleteMember } = useDeleteMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 삭제되었습니다.');
        invalidateMembers();
        invalidateEndpoints();
      },
    },
  });

  // ─── Derived data ─────────────────────────────────────────────────────────
  const isSearching = searchText.trim().length > 0;
  const searchFilteredEndpoints = useMemo(() => {
    if (!isSearching) return endpoints;
    const kw = searchText.trim().toLowerCase();
    return endpoints.filter((ep) => ep.endptName?.toLowerCase().includes(kw));
  }, [endpoints, isSearching, searchText]);

  const filteredEndpoints = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredEndpoints : searchFilteredEndpoints.filter((ep) => ep.nodeId === selectedNodeId)),
    [searchFilteredEndpoints, selectedNodeId, isSearching],
  );

  // Auto-select: 진입 시 첫 번째 endpoint 카드 자동 선택
  useEffect(() => {
    if (!selectedEndpointId && filteredEndpoints.length > 0) {
      setSelectedEndpointId(filteredEndpoints[0].endptId);
    }
  }, [filteredEndpoints, selectedEndpointId]);

  const selectedEndpoint = useMemo(() => {
    if (!selectedEndpointId) return null;
    return endpoints.find((ep) => ep.endptId === selectedEndpointId) ?? null;
  }, [endpoints, selectedEndpointId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    setSelectedEndpointId(null);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
    }
  };

  const handleCardSelect = (ep: IvrEndpointMaster) => {
    setSelectedEndpointId(ep.endptId);
  };

  const handleCreate = useCallback(() => {
    masterSheetRef.current?.open(undefined, selectedNodeId ?? nodes[0]?.nodeId);
  }, [nodes, selectedNodeId]);

  const handleEdit = useCallback((ep: IvrEndpointMaster) => {
    masterSheetRef.current?.open(ep);
  }, []);

  const handleDelete = useCallback(
    (ep: IvrEndpointMaster) => {
      modal.confirm.execute({
        onOk: () => deleteEndpoint({ id: ep.endptId }),
        options: {
          title: 'IVR EndPoint 삭제',
          content: `"${ep.endptName}" EndPoint를 삭제하시겠습니까?\n하위 멤버도 함께 삭제됩니다.`,
        },
      });
    },
    [modal, deleteEndpoint],
  );

  const handleMemberDelete = useCallback(
    (member: IvrEndpointMember) => {
      if (!selectedEndpointId) return;
      modal.confirm.execute({
        onOk: () => deleteMember({ memberId: member.endptMembId }),
        options: {
          title: '멤버 삭제',
          content: `"${member.endptMembName}" 멤버를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteMember, selectedEndpointId],
  );

  const handleMemberSheetSuccess = useCallback(() => {
    invalidateMembers();
    invalidateEndpoints();
  }, [invalidateMembers, invalidateEndpoints]);

  const handleMasterSheetSuccess = useCallback(() => {
    invalidateEndpoints();
  }, [invalidateEndpoints]);

  const getCardMenuItems = (ep: IvrEndpointMaster) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEdit(ep),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDelete(ep),
    },
  ];

  // ─── ag-Grid: Member columns ─────────────────────────────────────────────
  const memberColumnDefs: ColDef<IvrEndpointMember>[] = useMemo(
    () => [
      {
        headerName: '멤버명',
        field: 'endptMembName',
        flex: 2,
        minWidth: 100,
      },
      {
        headerName: 'IP',
        field: 'endptIp',
        flex: 2,
        minWidth: 120,
      },
      {
        headerName: 'PORT',
        field: 'endptPort',
        flex: 1,
        minWidth: 70,
      },
      {
        headerName: '우선순위',
        field: 'priority',
        flex: 1,
        minWidth: 70,
      },
      {
        headerName: 'Domain',
        field: 'domainName',
        flex: 2,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => params.data?.domainName ?? '-',
      },
      {
        headerName: '블럭여부',
        field: 'blockState',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => {
          if (!params.data) return null;
          return params.data.blockState === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              설정
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
              해제
            </span>
          );
        },
      },
      {
        headerName: 'ID/PW 유형',
        field: 'regType',
        flex: 1,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => {
          if (!params.data) return null;
          return params.data.regType === '10' ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#e6f4ff', color: '#1677ff' }}>
              공통
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f5f5f5', color: '#595959' }}>
              개별
            </span>
          );
        },
      },
      {
        headerName: '인증 ID',
        field: 'regIdAddpfx',
        flex: 1,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => params.data?.regIdAddpfx ?? '-',
      },
      {
        headerName: 'ID길이',
        field: 'regIdLen',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => params.data?.regIdLen ?? 0,
      },
      {
        headerName: 'PW길이',
        field: 'regPwLen',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => params.data?.regPwLen ?? 0,
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<IvrEndpointMember>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMemberDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleMemberDelete],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
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
                  setSelectedEndpointId(null);
                }}
              >
                <Layers className="size-3.5" />
                <span>전체</span>
                <span className="text-[11px] text-gray-400">({searchFilteredEndpoints.length})</span>
              </button>

              {nodes.map((node) => {
                const nodeEps = searchFilteredEndpoints.filter((ep) => ep.nodeId === node.nodeId);
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
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <Network className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{node.nodeName}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">({nodeEps.length})</span>
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
                placeholder="국선 검색"
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

        {/* ===== 카드 슬라이더 박스 (별도 박스) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 py-3 h-[185px]">
            {filteredEndpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 EndPoint가 없습니다'}</span>
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
                  {filteredEndpoints.map((ep) => {
                    const isCardSelected = selectedEndpointId === ep.endptId;
                    const tags = getMasterTagList(ep);
                    return (
                      <div
                        key={ep.endptId}
                        id={`ep-card-${ep.endptId}`}
                        className={`bg-white border rounded-lg p-3 cursor-pointer transition-all w-[220px] h-[155px] flex-shrink-0 flex flex-col ${
                          isCardSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={(e) => {
                          handleCardSelect(ep);
                          (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }}
                        onDoubleClick={() => handleEdit(ep)}
                      >
                        {/* Card header: EndPoint명 + 더보기 (상태 배지는 우하단 태그로 이동) */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-sm font-semibold text-gray-800 truncate">{ep.endptName}</span>
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                            <Dropdown menu={{ items: getCardMenuItems(ep) }} trigger={['click']} placement="bottomRight">
                              <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                                <MoreVertical className="size-3.5 text-gray-400" />
                              </button>
                            </Dropdown>
                          </div>
                        </div>

                        {/* Card info — Type은 우하단 태그로 표시되므로 정보라인에서 제거 */}
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{ep.nodeName ?? `Node ${ep.nodeId}`}</span>
                          </div>
                          <div className="truncate">
                            연동: {LINE_TYPE_LABELS[ep.lineType ?? ''] ?? '-'} / {CONN_TYPE_LABELS[ep.connType ?? ''] ?? '-'}
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">REG: {ep.regInterval ?? '-'}s</span>
                            <span className="truncate">할당: {ALLOC_METHOD_LABELS[ep.allocMethod ?? ''] ?? '-'}</span>
                          </div>
                        </div>

                        {/* 하단 상태 태그 */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto pt-1.5">
                            {tags.slice(0, 2).map((tag) => (
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

        {/* ===== 하단: 멤버 탭 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedEndpoint ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Bottom header: selected endpoint name */}
              <div className="px-5 py-2 flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">{selectedEndpoint.endptName}</span>
              </div>

              {/* Tab bar + 추가 버튼 */}
              <div className="flex items-center border-b-2 border-gray-200 flex-shrink-0 pr-3">
                <button
                  type="button"
                  className="px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]"
                >
                  멤버 ({members.length})
                </button>
                <div className="ml-auto">
                  <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => memberSheetRef.current?.open()}>
                    멤버 추가
                  </Button>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1">
                  <AgGridReact<IvrEndpointMember>
                    rowData={members}
                    columnDefs={memberColumnDefs}
                    gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                    loading={isMembersLoading}
                    getRowId={(params) => String(params.data.endptMembId)}
                    defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                    onRowDoubleClicked={(e) => {
                      if (e.data) memberSheetRef.current?.open(e.data);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
              <Empty description={false} />
              <span className="text-sm">EndPoint를 선택하면 멤버를 확인할 수 있습니다</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers ===== */}
      <IvrEndpointMasterSheet ref={masterSheetRef} nodes={nodes} onSuccess={handleMasterSheetSuccess} />
      {selectedEndpointId && (
        <IvrEndpointMemberSheet ref={memberSheetRef} endptId={selectedEndpointId} parentEndptType={selectedEndpoint?.endptType} onSuccess={handleMemberSheetSuccess} />
      )}
    </div>
  );
}
