/**
 * 국선관리 목록 페이지
 *
 * 상단: 노드 Select + 카드 슬라이더(항상 펼침)
 * 하단: 멤버/인증번호 탭 그리드
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [🌐 노드 ▾]  총 국선 n           [검색] [G/W] [+추가]    │
 * │ [Card1] [Card2] [Card3] ...                           │
 * ├──────────────────────────────────────────────────────┤
 * │ [멤버(3)] [인증번호(2)]                    [멤버 추가]   │
 * │ ag-Grid                                               │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input, Select } from 'antd';
import { ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
import { VIEW_MODE, useBreadcrumbStore, useViewMode } from '@/shared-store';
import { toast } from '@/shared-util';
import { endpointApi } from '../../features/endpoint/api/endpointApi';
import EndpointMemberDrawer, { type EndpointMemberDrawerRef } from '../../features/endpoint/components/EndpointMemberDrawer';
import EndpointRegnumDrawer, { type EndpointRegnumDrawerRef } from '../../features/endpoint/components/EndpointRegnumDrawer';
import GwBypassDialog, { type GwBypassDialogRef } from '../../features/endpoint/components/GwBypassDialog';
import {
  endpointQueryKeys,
  useDeleteEndpoint,
  useDeleteMembersBatch,
  useDeleteRegnumsBatch,
  useGetEndpoints,
  useGetMembers,
  useGetNodes,
  useGetRegnums,
} from '../../features/endpoint/hooks/useEndpointQueries';
import {
  ALLOC_METHOD_LABELS,
  ENDPOINT_TYPE_LABELS,
  ENDPOINT_TYPE_OPTIONS,
  type Endpoint,
  type EndpointMember,
  type EndpointRegnum,
  REG_METHOD_LABELS,
  SSW_VENDOR_LABELS,
  TRANSPORT_OPTIONS,
  getEndpointStatusInfo,
  getEndpointTagList,
} from '../../features/endpoint/types';
import { useGetNodeTenants, useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import { IconTrash } from '@/components/custom/Icons';
import ViewModeToggle from '@/components/custom/ViewModeToggle';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '호 라우팅' }, { title: '국선관리', path: '/ipron/line/endpoint' }];

type BottomTab = 'member' | 'regnum';

const TRANSPORT_LABELS: Record<number, string> = Object.fromEntries(TRANSPORT_OPTIONS.map((o) => [o.value, o.label]));

export default function EndpointList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // URL query params로 초기 선택 (등록/수정 후 돌아올 때)
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initEndptId = searchParams.get('endptId') ? Number(searchParams.get('endptId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(initEndptId);
  // 목록 표기방식(카드형/리스트형) — localStorage 유지. 화면키는 고정(변경 시 사용자 선택 초기화됨).
  const [viewMode, setViewMode] = useViewMode('ipron-endpoint');
  const [activeTab, setActiveTab] = useState<BottomTab>('member');
  const [searchText, setSearchText] = useState('');
  const [filterEndptType, setFilterEndptType] = useState<number | null>(null);
  const [filterLocationNodeId, setFilterLocationNodeId] = useState<number | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<EndpointMember[]>([]);
  const [selectedRegnums, setSelectedRegnums] = useState<EndpointRegnum[]>([]);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: number }>>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const memberDrawerRef = useRef<EndpointMemberDrawerRef>(null);
  const regnumDrawerRef = useRef<EndpointRegnumDrawerRef>(null);
  const gwBypassRef = useRef<GwBypassDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: endpoints = [] } = useGetEndpoints();
  const { data: allNodes = [] } = useGetNodes();
  // 운영자 모드=전체 노드, 일반 테넌트 모드=로그인 테넌트에 매핑된 노드만
  const nodes = useScopedNodes(allNodes);
  // 공통 노드-테넌트 매핑(전체). 선택 국선의 노드로 클라이언트 필터하여 테넌트 옵션 구성.
  const { data: allNodeTenants = [] } = useGetNodeTenants();

  const { data: members = [], isLoading: isMembersLoading } = useGetMembers({
    params: selectedEndpointId ? { id: selectedEndpointId } : undefined,
    queryOptions: { enabled: !!selectedEndpointId },
  });

  const { data: regnums = [], isLoading: isRegnumsLoading } = useGetRegnums({
    params: selectedEndpointId ? { id: selectedEndpointId } : undefined,
    queryOptions: { enabled: !!selectedEndpointId },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteEndpoint } = useDeleteEndpoint({
    mutationOptions: {
      onSuccess: (_data, variables) => {
        toast.success('국선이 삭제되었습니다');
        const deletedId = (variables as { id: number }).id;
        // 1) 선택 해제 (member/regnum 쿼리 비활성화)
        if (selectedEndpointId === deletedId) setSelectedEndpointId(null);
        // 2) 캐시에서 즉시 제거 — 자동 선택 useEffect가 삭제된 id를 다시 픽하지 않도록
        queryClient.setQueriesData<Endpoint[]>({ queryKey: endpointQueryKeys.getEndpoints._def }, (old) => (old ? old.filter((e) => e.endptId !== deletedId) : old));
        // 3) 삭제된 endpoint의 member/regnum 캐시도 제거
        queryClient.removeQueries({ queryKey: endpointQueryKeys.getMembers({ id: deletedId }).queryKey });
        queryClient.removeQueries({ queryKey: endpointQueryKeys.getRegnums({ id: deletedId }).queryKey });
        // 4) 백엔드와 동기화
        invalidateEndpoints();
      },
    },
  });

  const { mutate: deleteMembersBatch } = useDeleteMembersBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 삭제되었습니다');
        invalidateMembers();
        invalidateEndpoints();
      },
    },
  });

  const { mutate: deleteRegnumsBatch } = useDeleteRegnumsBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('인증번호가 삭제되었습니다');
        invalidateRegnums();
        invalidateEndpoints();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateEndpoints = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getEndpoints().queryKey });
  }, [queryClient]);

  const invalidateMembers = useCallback(() => {
    if (selectedEndpointId) {
      queryClient.invalidateQueries({
        queryKey: endpointQueryKeys.getMembers({ id: selectedEndpointId }).queryKey,
      });
    }
  }, [queryClient, selectedEndpointId]);

  const invalidateRegnums = useCallback(() => {
    if (selectedEndpointId) {
      queryClient.invalidateQueries({
        queryKey: endpointQueryKeys.getRegnums({ id: selectedEndpointId }).queryKey,
      });
    }
  }, [queryClient, selectedEndpointId]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  // 검색어로 필터링 (검색 필드: endptName)
  const isSearching = searchText.trim().length > 0;
  const searchFilteredEndpoints = useMemo(() => {
    let result = endpoints;
    // endptName 텍스트 필터
    if (isSearching) {
      const kw = searchText.trim().toLowerCase();
      result = result.filter((ep) => ep.endptName?.toLowerCase().includes(kw));
    }
    if (filterEndptType !== null) {
      result = result.filter((ep) => ep.endptType === filterEndptType);
    }
    if (filterLocationNodeId !== null) {
      result = result.filter((ep) => ep.locationNodeId === filterLocationNodeId);
    }
    return result;
  }, [endpoints, isSearching, searchText, filterEndptType, filterLocationNodeId]);

  const isFiltering = isSearching || filterEndptType !== null || filterLocationNodeId !== null;

  // 검색/필터 중이면 노드 선택 무시 (전체 표시), 아니면 노드 선택 적용
  const filteredEndpoints = useMemo(
    () => (isFiltering || selectedNodeId === null ? searchFilteredEndpoints : searchFilteredEndpoints.filter((ep) => ep.nodeId === selectedNodeId)),
    [searchFilteredEndpoints, selectedNodeId, isFiltering],
  );

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

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

  // 선택된 국선의 노드 테넌트 목록 — 공통 매핑에서 nodeId 로 클라이언트 필터
  useEffect(() => {
    const nodeId = selectedEndpoint?.nodeId;
    if (nodeId) {
      setTenantOptions(allNodeTenants.filter((nt) => nt.nodeId === nodeId).map((t) => ({ label: t.tenantName, value: t.tenantId })));
    } else {
      setTenantOptions([]);
    }
  }, [selectedEndpoint?.nodeId, allNodeTenants]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeChange = (nodeId: number | null | undefined) => {
    setSelectedNodeId(nodeId ?? null);
    setSelectedEndpointId(null);
    setSearchText('');
    setFilterEndptType(null);
    setFilterLocationNodeId(null);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      // 검색 시작 시 노드 필터 자동 해제
      setSelectedNodeId(null);
    }
  };

  const handleEndptTypeFilter = (val: number | null) => {
    setFilterEndptType(val);
    setSelectedNodeId(null);
    setSelectedEndpointId(null);
  };

  const handleLocationNodeFilter = (val: number | null) => {
    setFilterLocationNodeId(val);
    setSelectedNodeId(null);
    setSelectedEndpointId(null);
  };

  const handleCardSelect = (ep: Endpoint) => {
    setSelectedEndpointId(ep.endptId);
    setActiveTab('member');
  };

  const handleCreate = useCallback(() => {
    navigate('/ipron/line/endpoint/create' + (selectedNodeId ? `?nodeId=${selectedNodeId}` : ''));
  }, [navigate, selectedNodeId]);

  const handleEdit = useCallback(
    (ep: Endpoint) => {
      navigate(`/ipron/line/endpoint/${ep.endptId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (ep: Endpoint) => {
      try {
        const [epMembers, epRegnums] = await Promise.all([endpointApi.getMembers({ id: ep.endptId }), endpointApi.getRegnums({ id: ep.endptId })]);
        if (epMembers.length > 0 || epRegnums.length > 0) {
          toast.error('해당 국선에 멤버 혹은 등록번호가 존재하여 삭제할 수 없습니다');
          return;
        }
      } catch {
        toast.error('삭제 가능 여부 확인에 실패했습니다');
        return;
      }
      modal.confirm.execute({
        onOk: () => deleteEndpoint({ id: ep.endptId }),
        options: {
          title: '국선 삭제',
          content: `"${ep.endptName}" 국선을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteEndpoint],
  );

  const handleDeleteSelectedMembers = useCallback(() => {
    if (!selectedEndpointId || selectedMembers.length === 0) return;
    modal.confirm.execute({
      onOk: () => {
        deleteMembersBatch({ endptId: selectedEndpointId, memIds: selectedMembers.map((m) => m.endptMemId) }, { onSuccess: () => setSelectedMembers([]) });
      },
      options: {
        title: '멤버 삭제',
        content: `선택한 ${selectedMembers.length}건을 삭제하시겠습니까?`,
      },
    });
  }, [modal, deleteMembersBatch, selectedEndpointId, selectedMembers]);

  const handleDeleteSelectedRegnums = useCallback(() => {
    if (!selectedEndpointId || selectedRegnums.length === 0) return;
    modal.confirm.execute({
      onOk: () => {
        deleteRegnumsBatch({ endptId: selectedEndpointId, regIds: selectedRegnums.map((r) => r.endptRegnumId) }, { onSuccess: () => setSelectedRegnums([]) });
      },
      options: {
        title: '인증번호 삭제',
        content: `선택한 ${selectedRegnums.length}건을 삭제하시겠습니까?`,
      },
    });
  }, [modal, deleteRegnumsBatch, selectedEndpointId, selectedRegnums]);

  const handleMemberDrawerSuccess = useCallback(() => {
    invalidateMembers();
    invalidateEndpoints();
  }, [invalidateMembers, invalidateEndpoints]);

  const handleRegnumDrawerSuccess = useCallback(() => {
    invalidateRegnums();
    invalidateEndpoints();
  }, [invalidateRegnums, invalidateEndpoints]);

  const getCardMenuItems = (ep: Endpoint) => [
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
  const memberColumnDefs: ColDef<EndpointMember>[] = useMemo(
    () => [
      {
        headerName: '멤버명',
        field: 'endptMemName',
        flex: 2,
        minWidth: 100,
        tooltipField: 'endptMemName',
      },
      {
        headerName: 'IP 주소',
        field: 'ipAddress',
        flex: 2,
        minWidth: 100,
        tooltipField: 'ipAddress',
      },
      {
        headerName: '포트',
        field: 'portNo',
        flex: 1,
        minWidth: 60,
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: '우선순위',
        field: 'priority',
        flex: 1,
        minWidth: 70,
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: '블록여부',
        field: 'blockYn',
        flex: 1,
        minWidth: 70,
        filterValueGetter: (params) => (params.data?.blockYn === 1 ? '설정' : '해제'),
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          return params.data.blockYn === 1 ? (
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
        headerName: '모니터링 상태',
        field: 'monState',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => {
          const v = params.data?.monState;
          if (v === 0) return '정상';
          if (v === 2) return '미사용';
          return '장애';
        },
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          const v = params.data.monState;
          if (v === 0)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                정상
              </span>
            );
          if (v === 2)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
                미사용
              </span>
            );
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              장애
            </span>
          );
        },
      },
      {
        headerName: '장비 등록 상태',
        field: 'regState',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => {
          const v = params.data?.regState;
          if (v === 1) return '등록';
          if (v === 2) return '미사용';
          return '미등록';
        },
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          const v = params.data.regState;
          if (v === 1)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                등록
              </span>
            );
          if (v === 2)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
                미사용
              </span>
            );
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              미등록
            </span>
          );
        },
      },
    ],
    [],
  );

  // ─── Row selection ────────────────────────────────────────────────────────
  const memberRowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );
  const regnumRowSelection = useMemo<RowSelectionOptions>(
    () => ({ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }),
    [],
  );

  // ─── ag-Grid: Regnum columns ──────────────────────────────────────────────
  const regnumColumnDefs: ColDef<EndpointRegnum>[] = useMemo(
    () => [
      {
        headerName: '인증번호',
        field: 'regNum',
        flex: 2,
        minWidth: 100,
        tooltipField: 'regNum',
      },
      {
        headerName: '테넌트',
        field: 'tenantName',
        flex: 2,
        minWidth: 80,
        tooltipField: 'tenantName',
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          return params.data.tenantName ?? '-';
        },
      },
      {
        headerName: '인증된 멤버',
        flex: 2,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (params.data as any).regEndptMemName ?? '없음';
        },
      },
      {
        headerName: '사용여부',
        field: 'regActivateYn',
        flex: 1,
        minWidth: 70,
        filterValueGetter: (params) => (params.data?.regActivateYn === 1 ? '사용' : '미사용'),
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          return params.data.regActivateYn === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
              사용
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
              미사용
            </span>
          );
        },
      },
      {
        headerName: '인증 상태',
        field: 'regState',
        flex: 1,
        minWidth: 70,
        filterValueGetter: (params) => (params.data?.regState === 1 ? '등록' : '미등록'),
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          const v = params.data.regState;
          return v === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
              등록
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              미등록
            </span>
          );
        },
      },
      {
        headerName: '인증요청',
        colId: 'register',
        flex: 1,
        minWidth: 80,
        sortable: false,
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          const disabled = params.data.regActivateYn !== 1;
          return (
            <button
              type="button"
              disabled={disabled}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 cursor-pointer'
              }`}
              onClick={async (e) => {
                e.stopPropagation();
                if (!disabled && selectedEndpointId) {
                  try {
                    await endpointApi.registerRegnum({ id: selectedEndpointId, regId: params.data!.endptRegnumId });
                    toast.success('인증요청을 성공하였습니다');
                  } catch {
                    toast.error('인증요청에 실패하였습니다');
                  }
                }
              }}
            >
              인증요청
            </button>
          );
        },
      },
    ],
    [selectedEndpointId],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 선택 + 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: 노드 Select + 검색 + 추가 버튼 */}
          <div className="flex items-center bg-white px-4 gap-3 flex-shrink-0 h-[56px]">
            {/* 노드 선택 (국선은 노드 단위 스코프) */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => handleNodeChange(v === '__all__' ? null : Number(v))}
                options={[{ value: '__all__', label: '전체' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>

            {/* 요약 — 총 국선 (검색 결과 기준) */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 국선 <b className="text-gray-800 font-semibold">{filteredEndpoints.length.toLocaleString()}</b>
              </span>
            </div>

            {/* 우측: 검색 + G/W 우회설정 + 추가 버튼 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Select allowClear placeholder="구분" value={filterEndptType} onChange={handleEndptTypeFilter} options={[...ENDPOINT_TYPE_OPTIONS]} style={{ width: 120 }} />
              <Select
                allowClear
                placeholder="장비위치"
                value={filterLocationNodeId}
                onChange={handleLocationNodeFilter}
                options={nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }))}
                style={{ width: 130 }}
              />
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="국선 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 160 }}
              />
              <Button
                onClick={() => gwBypassRef.current?.open(selectedNodeId ?? nodes[0]?.nodeId, nodes.find((n) => n.nodeId === (selectedNodeId ?? nodes[0]?.nodeId))?.nodeName ?? '')}
              >
                G/W 우회설정
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 국선 목록 박스 (카드형 / 리스트형 — 선택은 localStorage 유지) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 목록 헤더: 타이틀 + 건수 / 우측 표기방식 토글 */}
          <div className="flex items-center gap-2 px-4 h-[44px] border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">국선</span>
            <span className="text-xs text-gray-400">{filteredEndpoints.length}</span>
            <div className="ml-auto">
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* 목록 본문 — 카드형은 가로 슬라이더, 리스트형은 세로 스크롤 */}
          <div className={`flex items-center px-4 py-3 ${viewMode === VIEW_MODE.CARD ? 'h-[185px]' : 'h-[240px]'}`}>
            {filteredEndpoints.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3 min-h-[100px]">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">{isSearching ? '검색 결과가 없습니다' : '등록된 국선이 없습니다'}</span>
              </div>
            ) : viewMode === VIEW_MODE.LIST ? (
              <div className="flex flex-col w-full h-full overflow-y-auto divide-y divide-gray-100">
                {filteredEndpoints.map((ep) => {
                  const isRowSelected = selectedEndpointId === ep.endptId;
                  const tags = getEndpointTagList(ep);
                  const status = getEndpointStatusInfo(ep);
                  return (
                    <div
                      key={ep.endptId}
                      id={`ep-row-${ep.endptId}`}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                        isRowSelected ? 'bg-[#405189]/5 border-l-2 border-l-[#405189]' : 'border-l-2 border-l-transparent hover:bg-gray-50'
                      }`}
                      onClick={() => handleCardSelect(ep)}
                      onDoubleClick={() => navigate(`/ipron/line/endpoint/${ep.endptId}`)}
                    >
                      {ep.epStatus !== 1 && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                          style={{ color: status.color, backgroundColor: status.bgColor, borderColor: status.color + '40' }}
                        >
                          {status.label}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-gray-800 truncate w-[180px] flex-shrink-0">{ep.endptName}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 w-[120px] flex-shrink-0 truncate">
                        <Network className="size-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{ep.nodeName ?? `노드 ${ep.nodeId}`}</span>
                      </span>
                      <span className="text-xs text-gray-500 w-[160px] flex-shrink-0 truncate">프로파일: {ep.sipProfileName ?? '-'}</span>
                      <span className="text-xs text-gray-500 w-[140px] flex-shrink-0">
                        채널: {ep.endptMaxchnl ?? 0} (OB {ep.endptDodchnl ?? 0})
                      </span>
                      <span className="text-xs text-gray-500 w-[110px] flex-shrink-0 truncate">할당: {ALLOC_METHOD_LABELS[ep.allocMethod] ?? '-'}</span>
                      <span className="text-xs text-gray-500 w-[110px] flex-shrink-0 truncate">등록: {REG_METHOD_LABELS[ep.regMethod] ?? '-'}</span>
                      <span className="flex items-center gap-1 flex-1 min-w-0">
                        {tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.label}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0"
                            style={{ color: tag.color, backgroundColor: tag.bgColor, borderColor: tag.borderColor }}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </span>
                      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 ml-auto">
                        <Dropdown menu={{ items: getCardMenuItems(ep) }} trigger={['click']} placement="bottomRight">
                          <button type="button" className="p-0.5 rounded hover:bg-gray-100 transition-colors">
                            <MoreVertical className="size-3.5 text-gray-400" />
                          </button>
                        </Dropdown>
                      </div>
                    </div>
                  );
                })}
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
                    const tags = getEndpointTagList(ep);
                    const status = getEndpointStatusInfo(ep);
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
                        onDoubleClick={() => navigate(`/ipron/line/endpoint/${ep.endptId}`)}
                      >
                        {/* Card header: 상태 배지(비정상만) + 국선명 + 더보기 */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {ep.epStatus !== 1 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                                style={{ color: status.color, backgroundColor: status.bgColor, borderColor: status.color + '40' }}
                              >
                                {status.label}
                              </span>
                            )}
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

                        {/* Card info */}
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Network className="size-3 text-gray-400" />
                            <span className="truncate">{ep.nodeName ?? `노드 ${ep.nodeId}`}</span>
                          </div>
                          <div className="truncate">프로파일: {ep.sipProfileName ?? '-'}</div>
                          <div>
                            채널: {ep.endptMaxchnl ?? 0} (OB {ep.endptDodchnl ?? 0})
                          </div>
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">할당: {ALLOC_METHOD_LABELS[ep.allocMethod] ?? '-'}</span>
                            <span className="truncate">등록: {REG_METHOD_LABELS[ep.regMethod] ?? '-'}</span>
                          </div>
                        </div>

                        {/* 하단 상태 태그 (블락/모니터링 등) */}
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

        {/* ===== 하단: 멤버/인증번호 탭 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedEndpoint ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Bottom header: selected endpoint name + status */}
              <div className="px-5 py-2 flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">{selectedEndpoint.endptName}</span>
              </div>

              {/* Tab bar + 추가 버튼 */}
              <div className="flex items-center border-b-2 border-gray-200 flex-shrink-0 pr-3">
                <button
                  type="button"
                  className={`px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors ${
                    activeTab === 'member' ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-400 border-b-transparent hover:text-gray-600'
                  }`}
                  onClick={() => setActiveTab('member')}
                >
                  멤버 ({members.length})
                </button>
                <button
                  type="button"
                  className={`px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors ${
                    activeTab === 'regnum' ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-400 border-b-transparent hover:text-gray-600'
                  }`}
                  onClick={() => setActiveTab('regnum')}
                >
                  인증번호 ({regnums.length})
                </button>
                <div className="ml-auto flex items-center gap-2">
                  {activeTab === 'member' ? (
                    <>
                      <Button danger icon={<IconTrash className="size-3.5" />} disabled={selectedMembers.length === 0} onClick={handleDeleteSelectedMembers}>
                        삭제
                      </Button>
                      <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => memberDrawerRef.current?.open()}>
                        멤버 추가
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button danger icon={<IconTrash className="size-3.5" />} disabled={selectedRegnums.length === 0} onClick={handleDeleteSelectedRegnums}>
                        삭제
                      </Button>
                      <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => regnumDrawerRef.current?.open()}>
                        인증번호 추가
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Member tab */}
                {activeTab === 'member' && (
                  <div className="flex-1">
                    <AgGridReact<EndpointMember>
                      rowData={members}
                      columnDefs={memberColumnDefs}
                      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                      rowSelection={memberRowSelection}
                      loading={isMembersLoading}
                      getRowId={(params) => String(params.data.endptMemId)}
                      defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                      onRowDoubleClicked={(e) => {
                        if (e.data) memberDrawerRef.current?.open(e.data);
                      }}
                      onSelectionChanged={(e: SelectionChangedEvent<EndpointMember>) => {
                        setSelectedMembers(e.api.getSelectedRows());
                      }}
                    />
                  </div>
                )}

                {/* Regnum tab */}
                {activeTab === 'regnum' && (
                  <div className="flex-1">
                    <AgGridReact<EndpointRegnum>
                      rowData={regnums}
                      columnDefs={regnumColumnDefs}
                      gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                      rowSelection={regnumRowSelection}
                      loading={isRegnumsLoading}
                      getRowId={(params) => String(params.data.endptRegnumId)}
                      defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
                      onRowDoubleClicked={(e) => {
                        if (e.data) regnumDrawerRef.current?.open(e.data);
                      }}
                      onSelectionChanged={(e: SelectionChangedEvent<EndpointRegnum>) => {
                        setSelectedRegnums(e.api.getSelectedRows());
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
              <Empty description={false} />
              <span className="text-sm">국선을 선택하면 멤버/인증번호를 확인할 수 있습니다</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers ===== */}
      {selectedEndpointId && (
        <>
          <EndpointMemberDrawer ref={memberDrawerRef} endptId={selectedEndpointId} onSuccess={handleMemberDrawerSuccess} />
          <EndpointRegnumDrawer ref={regnumDrawerRef} endptId={selectedEndpointId} tenantOptions={tenantOptions} onSuccess={handleRegnumDrawerSuccess} />
        </>
      )}

      {/* G/W 우회설정 다이얼로그 */}
      <GwBypassDialog
        ref={gwBypassRef}
        endpoints={endpoints}
        nodeOptions={nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }))}
        onApply={async (endptIds, routingNodeId) => {
          await endpointApi.gwBypass({ endptIds, routingNodeId });
          queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getEndpoints().queryKey });
        }}
      />
    </div>
  );
}
