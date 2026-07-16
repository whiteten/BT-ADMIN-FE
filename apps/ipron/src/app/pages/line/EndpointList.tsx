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
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MoreVertical, Network, Plus, Search, Trash2 } from 'lucide-react';
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

/**
 * 리스트형 표기의 컬럼 정의. 헤더와 데이터 행이 같은 폭 클래스를 참조해야 열이 어긋나지 않는다.
 * 폭은 고정 px 가 아니라 비율(flex-[n]) — 넓은 화면에서 우측이 비지 않도록 남는 공간을 나눠 갖는다.
 * min-w 는 좁은 화면에서 글자가 뭉개지지 않게 하는 하한선.
 * 장비위치·라우팅위치는 대부분 미설정(N/A)이라 목록에서 제외했다 — 상세/수정 화면에서 확인.
 */
const LIST_COLUMNS: { key: string; label: string; width: string; align?: string }[] = [
  { key: 'name', label: '국선명', width: 'flex-[2.2] min-w-[150px]' },
  { key: 'type', label: '구분', width: 'flex-[1.1] min-w-[80px]' },
  { key: 'profile', label: 'SIP 프로파일', width: 'flex-[1.5] min-w-[110px]' },
  { key: 'node', label: '노드', width: 'flex-[1] min-w-[70px]' },
  { key: 'maxchnl', label: '최대채널', width: 'flex-[0.9] min-w-[64px]', align: 'text-right' },
  { key: 'obchnl', label: 'O/B채널', width: 'flex-[0.9] min-w-[64px]', align: 'text-right' },
  { key: 'vendor', label: 'SSW 벤더', width: 'flex-[1.2] min-w-[90px]' },
  { key: 'alloc', label: '서버 할당방식', width: 'flex-[1.4] min-w-[100px]' },
  { key: 'reg', label: 'REG 방식', width: 'flex-[1.4] min-w-[100px]' },
  { key: 'monitor', label: '모니터링', width: 'flex-[0.9] min-w-[64px]', align: 'text-center' },
  { key: 'block', label: '블럭여부', width: 'flex-[0.9] min-w-[64px]', align: 'text-center' },
  { key: 'status', label: '상태', width: 'flex-[0.9] min-w-[64px]', align: 'text-center' },
];

/** 컬럼키 → 폭·정렬 클래스. 데이터 행이 헤더와 같은 정의를 참조하도록 하는 용도. */
const COL: Record<string, string> = Object.fromEntries(LIST_COLUMNS.map((c) => [c.key, `${c.width} ${c.align ?? ''}`]));

/** 컬럼 align → flex 정렬 클래스(헤더 정렬 아이콘을 라벨과 함께 좌/우/중앙에 배치). */
const ALIGN_JUSTIFY: Record<string, string> = { 'text-right': 'justify-end', 'text-center': 'justify-center' };

/**
 * 리스트형 헤더 정렬용 비교값 추출. 라벨 매핑된 컬럼은 화면 표시값(라벨) 기준으로 비교한다.
 * null/undefined 는 정렬 방향과 무관하게 항상 뒤로 보낸다.
 */
function getSortValue(ep: Endpoint, key: string): string | number | null {
  switch (key) {
    case 'name':
      return ep.endptName ?? null;
    case 'type':
      return ENDPOINT_TYPE_LABELS[ep.endptType] ?? null;
    case 'profile':
      return ep.sipProfileName ?? null;
    case 'node':
      return ep.nodeName ?? (ep.nodeId != null ? `노드 ${ep.nodeId}` : null);
    case 'maxchnl':
      return ep.endptMaxchnl ?? null;
    case 'obchnl':
      return ep.endptDodchnl ?? null;
    case 'vendor':
      return ep.sswVendor != null ? (SSW_VENDOR_LABELS[ep.sswVendor] ?? null) : null;
    case 'alloc':
      return ALLOC_METHOD_LABELS[ep.allocMethod] ?? null;
    case 'reg':
      return REG_METHOD_LABELS[ep.regMethod] ?? null;
    case 'monitor':
      return ep.monitorYn === 1 ? 'ON' : 'OFF';
    case 'block':
      return ep.blockYn === 1 ? '설정' : '해제';
    case 'status':
      return getEndpointStatusInfo(ep).label ?? null;
    default:
      return null;
  }
}

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
  // 리스트형 헤더 클릭 정렬 (카드형에는 영향 없음)
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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
    if (!isSearching) return endpoints;
    const kw = searchText.trim().toLowerCase();
    return endpoints.filter((ep) => ep.endptName?.toLowerCase().includes(kw));
  }, [endpoints, isSearching, searchText]);

  // 검색 중이면 노드 선택 무시 (전체 표시), 아니면 노드 선택 적용
  const filteredEndpoints = useMemo(
    () => (isSearching || selectedNodeId === null ? searchFilteredEndpoints : searchFilteredEndpoints.filter((ep) => ep.nodeId === selectedNodeId)),
    [searchFilteredEndpoints, selectedNodeId, isSearching],
  );

  // 리스트형 헤더 클릭 정렬 결과. sortKey 없으면 원본 순서 유지. (카드형은 이 배열을 쓰지 않음)
  const sortedEndpoints = useMemo(() => {
    if (!sortKey) return filteredEndpoints;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredEndpoints].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1; // null 은 방향과 무관하게 항상 뒤로
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'ko') * dir;
    });
  }, [filteredEndpoints, sortKey, sortDir]);

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
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      // 검색 시작 시 노드 필터 자동 해제
      setSelectedNodeId(null);
    }
  };

  // 리스트형 헤더 클릭: 같은 컬럼이면 방향 토글, 다른 컬럼이면 그 컬럼 오름차순
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
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
        // 감시 상태는 Redis 실시간 값(교환기가 올림). 0=정상 / 2=미사용 / 그 외=에러 / 값 없음=공백.
        // AS-IS(IPR20S1010 Formatter.monState)와 동일한 매핑 — DB 의 MON_STATE 는 초기 설정값이라 쓰지 않는다.
        headerName: '모니터링 상태',
        field: 'monState',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => {
          const v = params.data?.monState;
          if (v == null) return '';
          if (v === 0) return '정상';
          if (v === 2) return '미사용';
          return '에러';
        },
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          const v = params.data.monState;
          if (v == null) return null;
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
              에러
            </span>
          );
        },
      },
      {
        // 등록 상태도 Redis 실시간 값. 1=등록 / 2=미사용 / 그 외=미등록 / 값 없음=공백.
        headerName: '장비 등록 상태',
        field: 'regState',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => {
          const v = params.data?.regState;
          if (v == null) return '';
          if (v === 1) return '등록';
          if (v === 2) return '미사용';
          return '미등록';
        },
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          const v = params.data.regState;
          if (v == null) return null;
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
              // 리스트형 — 헤더 + 표 형태. 컬럼 폭은 헤더와 행이 같은 상수를 써서 어긋나지 않게 한다.
              // 장비위치·라우팅위치는 대부분 N/A 라 목록에서 제외(상세/수정 화면에서 확인).
              <div className="flex flex-col w-full h-full min-w-0">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-y border-gray-200 text-xs font-semibold text-gray-500 flex-shrink-0">
                  {LIST_COLUMNS.map((c) => (
                    <span
                      key={c.key}
                      className={`${c.width} ${c.align ?? ''} truncate flex items-center gap-0.5 cursor-pointer select-none hover:text-gray-700 ${ALIGN_JUSTIFY[c.align ?? ''] ?? 'justify-start'}`}
                      onClick={() => handleSort(c.key)}
                    >
                      {c.label}
                      {sortKey === c.key && (sortDir === 'asc' ? <ChevronUp className="size-3 flex-shrink-0" /> : <ChevronDown className="size-3 flex-shrink-0" />)}
                    </span>
                  ))}
                  <span className="w-6 flex-shrink-0" />
                </div>
                <div className="flex flex-col overflow-y-auto divide-y divide-gray-100">
                  {sortedEndpoints.map((ep) => {
                    const isRowSelected = selectedEndpointId === ep.endptId;
                    const status = getEndpointStatusInfo(ep);
                    return (
                      <div
                        key={ep.endptId}
                        id={`ep-row-${ep.endptId}`}
                        className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors text-xs ${isRowSelected ? 'bg-[#405189]/5' : 'hover:bg-gray-50'}`}
                        onClick={() => handleCardSelect(ep)}
                        onDoubleClick={() => navigate(`/ipron/line/endpoint/${ep.endptId}`)}
                      >
                        <span className={`${COL.name} truncate text-sm font-semibold text-gray-800`}>{ep.endptName}</span>
                        <span className={`${COL.type} truncate text-gray-600`}>{ENDPOINT_TYPE_LABELS[ep.endptType] ?? '-'}</span>
                        <span className={`${COL.profile} truncate text-gray-600`}>{ep.sipProfileName ?? '-'}</span>
                        <span className={`${COL.node} truncate text-gray-600`}>{ep.nodeName ?? `노드 ${ep.nodeId}`}</span>
                        <span className={`${COL.maxchnl} text-gray-600`}>{ep.endptMaxchnl ?? 0}</span>
                        <span className={`${COL.obchnl} text-gray-600`}>{ep.endptDodchnl ?? 0}</span>
                        <span className={`${COL.vendor} truncate text-gray-600`}>{ep.sswVendor != null ? (SSW_VENDOR_LABELS[ep.sswVendor] ?? '-') : '-'}</span>
                        <span className={`${COL.alloc} truncate text-gray-600`}>{ALLOC_METHOD_LABELS[ep.allocMethod] ?? '-'}</span>
                        <span className={`${COL.reg} truncate text-gray-600`}>{REG_METHOD_LABELS[ep.regMethod] ?? '-'}</span>
                        <span className={`${COL.monitor} text-gray-600`}>{ep.monitorYn === 1 ? 'ON' : 'OFF'}</span>
                        <span className={COL.block}>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              ep.blockYn === 1 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {ep.blockYn === 1 ? '설정' : '해제'}
                          </span>
                        </span>
                        <span className={COL.status}>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ color: status.color, backgroundColor: status.bgColor }}>
                            {status.label}
                          </span>
                        </span>
                        <div onClick={(e) => e.stopPropagation()} className="w-6 flex-shrink-0">
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
